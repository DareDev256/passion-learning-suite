# Adaptive Difficulty Engine

> `template/src/lib/difficulty.ts` — Kumon-style diagnostic placement  
> Hook: `template/src/hooks/useDifficulty.ts`

The adaptive difficulty engine analyzes a player's rolling performance across three difficulty tiers (`easy`, `medium`, `hard`) and auto-selects the right challenge level. It uses a **tier-ladder algorithm** inspired by the [Kumon method](https://en.wikipedia.org/wiki/Kumon) — promote when crushing it, demote when struggling, hold when steady.

Every game in the suite uses this engine. It operates on the shared `ContentItem[]` type — no game-specific logic.

---

## Architecture

```
ContentItem[] ──► analyzeDifficulty() ──► DifficultyProfile
                        │                    ├── recommended: Difficulty
                        │                    ├── performance: per-tier stats
                        │                    └── confidence: new | low | high
                        │
                        ▼
                  selectItems() ──► ContentItem[] (curated batch)
                        │
                        ▼
                  useDifficulty() hook (React state wrapper)
```

Data flows in one direction: raw scores → analysis → selection → UI. The pure functions (`analyzeDifficulty`, `selectItems`) never touch state — the `useDifficulty` hook handles reactivity.

---

## Core Functions

### `analyzeDifficulty(items: ContentItem[]): DifficultyProfile`

Reads the player's `itemScores` from storage, buckets them by difficulty tier, computes rolling accuracy from the most recent **5 answers** per tier, then runs the tier-ladder to recommend a difficulty.

**Returns:**

```ts
interface DifficultyProfile {
  recommended: Difficulty;     // "easy" | "medium" | "hard"
  performance: Record<Difficulty, TierPerformance>;
  confidence: "new" | "low" | "high";
}

interface TierPerformance {
  accuracy: number;    // 0–100 (NaN if no data in this tier)
  attempts: number;    // total answers in rolling window
  streak: number;      // consecutive correct from most recent
}
```

**Confidence levels:**

| Level | Condition | Meaning |
|-------|-----------|---------|
| `new` | 0 total attempts across all tiers | Player hasn't answered anything yet |
| `low` | 1–4 total attempts | Not enough data for reliable placement |
| `high` | 5+ total attempts | Window is full, recommendation is trustworthy |

### `selectItems(items, count?, profile?): ContentItem[]`

Picks `count` items (default 5) at the recommended difficulty. Selection priority:

1. **Unseen items first** — items with no `itemScore` entry
2. **Oldest-seen items next** — sorted by `lastSeen` timestamp ascending
3. **Adjacent tier fallback** — if the recommended tier runs dry, spills into neighboring tiers

Tier fallback order is **biased toward harder content** (growth mindset):

| Recommended | Search order |
|-------------|-------------|
| `easy` | easy → medium |
| `medium` | medium → hard → easy |
| `hard` | hard → (no fallback needed — highest tier) |

You can pass a pre-computed `DifficultyProfile` to skip re-analysis:

```ts
const profile = analyzeDifficulty(items);
const batch = selectItems(items, 5, profile);
```

---

## Tier-Ladder Algorithm

The recommendation engine (`computeRecommendation`) follows this decision tree:

```
No data at all? ──► easy

Has hard-tier data?
  └── accuracy ≥ 50%  ──► hard (holding)

Has medium-tier data?
  ├── accuracy ≥ 85%  ──► hard (promote!)
  ├── accuracy ≥ 50%  ──► medium (holding)
  └── accuracy < 50%  ──► easy (demote)

Only easy-tier data?
  ├── accuracy ≥ 85%  ──► medium (promote!)
  └── accuracy < 85%  ──► easy (holding)
```

### Tuning Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `WINDOW` | 5 | Rolling window of recent answers per tier |
| `PROMOTE_THRESHOLD` | 85% | Accuracy required to advance to the next tier |
| `DEMOTE_THRESHOLD` | 50% | Accuracy below which the player drops a tier |

These are hardcoded intentionally — they match Kumon's pedagogy of mastering a level before advancing. If a game needs different thresholds, fork `difficulty.ts`.

---

## React Integration: `useDifficulty`

```tsx
import { useDifficulty } from "@/hooks/useDifficulty";
import { allItems } from "@/data/curriculum";

function GameScreen() {
  const { profile, currentItems, refresh, setDifficulty } = useDifficulty(allItems, 5);

  function handleRoundComplete() {
    // After the player finishes a batch, re-analyze and get fresh items
    const updated = refresh();
    console.log(`Now at ${updated.recommended} (${updated.confidence} confidence)`);
  }

  return (
    <div>
      <p>Difficulty: {profile.recommended} ({profile.confidence})</p>
      {currentItems.map(item => (
        <QuestionCard key={item.id} item={item} />
      ))}
      <button onClick={() => setDifficulty("hard")}>Force Hard Mode</button>
    </div>
  );
}
```

**Hook API:**

| Return | Type | Description |
|--------|------|-------------|
| `profile` | `DifficultyProfile` | Current analysis snapshot |
| `currentItems` | `ContentItem[]` | Items selected at recommended difficulty |
| `refresh()` | `() => DifficultyProfile` | Re-analyze + select fresh batch. Call after each round. |
| `setDifficulty(d)` | `(d: Difficulty) => void` | Override engine — force a specific tier |

The hook memoizes the initial profile from props and only re-computes when `refresh()` or `setDifficulty()` is called. It reads from `localStorage` via the storage layer — no network calls.

---

## How It Fits Into the Session Planner

The session planner (`lib/sessionPlanner.ts`) calls `selectItems()` internally for its "new content" phase (phase 3). The pipeline:

1. **Phase 1**: FSRS spaced repetition queue (overdue → upcoming)
2. **Phase 2**: Weak category targeting (categories below 70% accuracy)
3. **Phase 3**: `selectItems()` fills remaining slots with difficulty-matched new content

If you're using `useSessionPlanner`, the difficulty engine runs automatically — you don't need `useDifficulty` separately. Use `useDifficulty` directly only for games that skip session planning.

---

## Data Dependencies

```
ContentItem.difficulty ─── required field ("easy" | "medium" | "hard")
ContentItem.id ────────── used to look up ItemScore from storage
UserProgress.itemScores ── { correct, incorrect, lastSeen } per item
```

The engine reads from `getProgress().itemScores` — the same storage layer all games use. No additional setup needed beyond `configureStorage(gameId)`.
