# Passionate Learning Suite

10 web-based educational games that teach Gen AI concepts and tech fundamentals through gameplay. Each game is a standalone Next.js 16 app built from a shared template with unique mechanics, curriculum, and theme.

[![Games](https://img.shields.io/badge/Games-10-6C63FF?style=flat-square)](https://github.com/DareDev256/passion-learning-suite)
[![Deployed](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)
[![Stack](https://img.shields.io/badge/Stack-Next.js_16-000000?style=flat-square&logo=next.js)](https://nextjs.org)

## AI Literacy Games (6)

| # | Game | Repo | Live | What It Teaches |
|---|------|------|------|-----------------|
| 1 | **Prompt Craft** | [prompt-craft](https://github.com/DareDev256/prompt-craft) | [Play](https://prompt-craft-jet.vercel.app) | Prompt engineering — structure, constraints, iterative refinement |
| 2 | **Token Prophet** | [token-prophet](https://github.com/DareDev256/token-prophet) | [Play](https://token-prophet.vercel.app) | How LLMs think — next-token prediction, probability, context windows |
| 3 | **Hallucination Hunter** | [hallucination-hunter](https://github.com/DareDev256/hallucination-hunter) | [Play](https://hallucination-hunter.vercel.app) | AI output evaluation — spot factual errors, verify claims |
| 4 | **Bias Buster** | [bias-buster](https://github.com/DareDev256/bias-buster) | [Play](https://bias-buster-five.vercel.app) | AI ethics — detect and measure bias across demographics |
| 5 | **Tool Match** | [tool-match](https://github.com/DareDev256/tool-match) | [Play](https://tool-match-sable.vercel.app) | AI tool selection — match user intents to the right model/tool |
| 6 | **Red Team Arena** | [red-team-arena](https://github.com/DareDev256/red-team-arena) | [Play](https://red-team-arena.vercel.app) | AI safety — ethical prompt injection, jailbreaks, defense |

## Tech Fundamentals Games (4)

| # | Game | Repo | Live | What It Teaches |
|---|------|------|------|-----------------|
| 7 | **API Architect** | [api-architect](https://github.com/DareDev256/api-architect) | [Play](https://api-architect-gamma.vercel.app) | REST API design — methods, endpoints, status codes, debugging |
| 8 | **Netrunner** | [netrunner](https://github.com/DareDev256/netrunner) | [Play](https://netrunner-gilt.vercel.app) | Networking — OSI layers, subnetting, ports, troubleshooting |
| 9 | **CyberShield** | [cybershield](https://github.com/DareDev256/cybershield) | [Play](https://cybershield.vercel.app) | Cybersecurity — threats, defense, cryptography, incident response |
| 10 | **Circuit Prophet** | [circuit-prophet](https://github.com/DareDev256/circuit-prophet) | [Play](https://circuit-prophet.vercel.app) | Hardware & electronics — Ohm's Law, logic gates, CPU architecture |

## Shared Tech Stack

- **Framework**: Next.js 16 + React 19 + TypeScript (strict)
- **Styling**: Tailwind CSS v4 (`@theme inline`)
- **Animation**: Framer Motion
- **Font**: Press Start 2P (pixel aesthetic)
- **Spaced Repetition**: ts-fsrs (FSRS-4.5)
- **Persistence**: localStorage (SSR-safe, configurable game ID via `configureStorage()`, input-validated against prototype pollution and injection)
- **Testing**: Vitest (278 tests — storage, formatters, difficulty engine, curriculum, item scoring, enrichment integration, security hardening, social share + Web Share API + CWE-20 sanitization, player insights + edge cases + boundary coverage, spaced repetition, session planner + edge cases, session recap messages + threshold boundaries, auto-select integration, activity heatmap, category radar geometry, boundary value analysis + prototype pollution input vectors + corruption recovery — all passing)
- **Session UI**: `SessionBanner` component with animated progress bar, reason tags (review/bonus/weak/new), and composition pills
- **Session Planning**: Smart auto-select via `useSessionPlanner()` hook — FSRS reviews + weak-category targeting + difficulty-matched new content + `SessionBanner` progress UI + `SessionRecap` post-session debrief with memory strength meter
- **Deployment**: Vercel (all 10 games live)

## Shared Game Systems

Every game inherits from the `template/` directory:

- **XP + Leveling** — 100 XP/level with delayed recall rewards (1x/2x/3x multiplier)
- **Daily Streak** — freeze system (earn 1 freeze per 10 levels, max 3)
- **FSRS-4.5 Spaced Repetition** — scientifically-backed review scheduling with live ts-fsrs integration
- **Mastery Gates** — Kumon-style: 90% on last 3 attempts to advance
- **8-bit Sound Effects** — Web Audio API synthesis (no external files)
- **CRT Overlay** — retro scanlines + neon glow UI theme
- **Accessibility** — WCAG 2.2 AA compliant
- **Adaptive Difficulty** — Kumon-style auto-select: promotes at 85% accuracy, demotes at 50%, per-tier rolling window
- **Smart Session Planner** — auto-select orchestrator combining FSRS reviews, weak-category drills, and difficulty-matched new content into optimal study sessions
- **Session Recap** — post-session debrief with reason breakdown (reinforced/bonus/drilled/discovered), memory strength meter (FSRS stability → tier), and contextual motivational messages
- **Activity Heatmap** — GitHub-style pixel-art calendar showing daily learning activity over 12 weeks, with intensity mapping, best streak stats, and hover tooltips
- **Category Radar** — SVG radar chart with neon glow showing mastery polygon across all categories, animated with Framer Motion springs
- **Analytics** — retention tracking, mastery metrics, per-question stats
- **Player Insights** — visual analytics dashboard showing mastery rate, category strengths, retention recall bars, and weakest items needing review
- **Social Share Cards** — retro-styled score cards with Web Share API (mobile) + clipboard fallback (desktop)

## Security

The storage layer includes runtime hardening against client-side attacks:

- **Prototype pollution defense** — `__proto__`, `constructor`, and `prototype` keys are stripped from all parsed localStorage data (storage layer and sound settings)
- **Content ID validation** — All public functions that accept `itemId`, `levelKey`, `categoryId`, or `currentCategory` validate against a strict pattern (`a-z`, `0-9`, `_`, `.`, `:`, `/`, `-`, max 128 chars) and explicitly reject prototype pollution keys. Invalid IDs are silently dropped.
- **Input validation** — Numeric fields (XP, accuracy, multiplier, levelId, volume levels) are clamped to safe bounds; NaN/Infinity/negative values are rejected
- **Game ID sanitization** — `configureStorage()` only accepts alphanumeric/hyphen/underscore IDs (1-64 chars), preventing localStorage key injection
- **Share text sanitization** — Game names in social share output are stripped of control characters and newlines, truncated to 100 chars, preventing content injection in share previews
- **Deserialization hardening** — All `JSON.parse()` paths (progress, mastery, FSRS, analytics) validate structure, strip dangerous keys, and type-check every field before use
- **Event type whitelist** — Only the 5 defined learning event types are accepted

## Repo Structure

```
passion-learning-suite/
├── MASTER_SPEC.md           # Full pedagogy + architecture specification
├── docs/                    # Deep-dive technical documentation
│   └── adaptive-difficulty.md  # Tier-ladder algorithm, tuning, integration
├── specs/                   # Per-game design documents
│   ├── 01-prompt-craft.md
│   ├── 02-token-prophet.md
│   ├── 03-hallucination-hunter.md
│   ├── 04-bias-buster.md
│   ├── 05-tool-match.md
│   └── 06-red-team-arena.md
└── template/                # Shared Next.js base template
    └── src/
        ├── components/      # Game UI (Timer, VictoryScreen, etc.)
        ├── hooks/           # useProgress, useGameStats, useSoundEffects, useDifficulty, useSessionPlanner
        ├── lib/             # Storage, difficulty engine, formatters, insights, spaced repetition
        ├── data/            # Curriculum data template
        └── types/           # Shared TypeScript types
```

Each game lives in its own repo and is deployed independently. This repo holds the master specification, per-game specs, and the shared template that all games were scaffolded from.

## Storage API Reference

The persistence layer (`template/src/lib/storage.ts`) is the shared brain of every game. All functions are SSR-safe, validated against prototype pollution, and namespaced by game ID.

### Setup

| Function | Description |
|----------|-------------|
| `configureStorage(id)` | Set the game namespace for all localStorage keys. Call once at init. |
| `getGameId()` | Returns the current game ID namespace. |
| `resetProgress()` | Wipe all data for the current namespace. Irreversible. |

### XP & Progression

| Function | Description |
|----------|-------------|
| `getProgress()` | Load player progress (XP, level, streak, scores). Safe defaults on missing/corrupt data. |
| `addXP(amount, multiplier?)` | Award XP with optional recall multiplier (1×/2×/3×). Auto-levels at 100 XP. |
| `getRecallMultiplier(itemId)` | Get delayed-reward multiplier: 1× (recent), 2× (7+ days), 3× (30+ days). |
| `completeLevel(categoryId, levelId)` | Mark level complete. Awards streak freeze every 10 levels. |
| `updateItemScore(itemId, isCorrect)` | Record an answer and update the item's score counters. |

### Spaced Repetition (FSRS-4.5)

| Function | Description |
|----------|-------------|
| `getFSRSCards()` | Load all FSRS review cards. Malformed entries silently filtered. |
| `saveFSRSCard(card)` | Upsert an FSRS card by `itemId`. |
| `getDueItems(limit?)` | Get overdue item IDs sorted by most overdue. Default limit: 5. |
| `getItemsForReview(limit?)` | Smart review queue: FSRS-first, naive fallback for pre-FSRS games. |

### Spaced Repetition Scheduler (`template/src/lib/spacedRepetition.ts`)

Active scheduling engine that bridges ts-fsrs with the storage layer. The storage API persists FSRS cards; this module runs the algorithm to compute optimal review intervals.

| Function | Description |
|----------|-------------|
| `gradeItem(itemId, quality)` | Grade an answer and schedule next review via FSRS. Creates new card on first review. Returns next due date, interval, stability, and difficulty. |
| `inferGrade(isCorrect, confidence?)` | Map correct/incorrect + confidence (0-1) to FSRS quality: again/hard/good/easy. Default confidence 0.7 → "good". |
| `getReviewQueue(limit?)` | Prioritized queue: `due` (overdue, most overdue first) + `upcoming` (within 24h). Default limit: 10. |
| `computeMemoryStrength()` | Overall memory score (0-100) based on average FSRS stability across all tracked items. |

### Streaks & Mastery

| Function | Description |
|----------|-------------|
| `updateStreak()` | Update daily streak. Consumes freezes to cover gaps. Idempotent per day. |
| `recordMasteryAttempt(levelKey, accuracy)` | Record a mastery gate attempt (keeps last 5). |
| `checkMastery(levelKey)` | Check Kumon-style gate: ≥90% on last 3 attempts to unlock. |

### Analytics

| Function | Description |
|----------|-------------|
| `recordLearningEvent(event)` | Track a learning event (5 valid types, max 1,000 stored). |
| `getLearningAnalytics()` | Aggregate stats: items seen/mastered, retention rates, time-to-mastery. |

### Adaptive Difficulty (`template/src/lib/difficulty.ts`) — [Full Docs](docs/adaptive-difficulty.md)

Kumon-style diagnostic placement engine. Analyzes rolling performance across three tiers, auto-promotes at 85% accuracy, auto-demotes below 50%. See the [dedicated documentation](docs/adaptive-difficulty.md) for the tier-ladder algorithm, tuning constants, fallback logic, and integration guide.

| Function | Description |
|----------|-------------|
| `analyzeDifficulty(items)` | Analyze player's per-tier performance from a rolling window of 5 recent answers. Returns recommended difficulty, per-tier accuracy/streak, and confidence level (`new`/`low`/`high`). |
| `selectItems(items, count?, profile?)` | Pick items at recommended difficulty. Prioritizes unseen → oldest-seen. Falls back to adjacent tiers with a growth-mindset bias (harder before easier). |

### Display Formatters (`template/src/lib/formatters.ts`)

Pure functions for rendering game stats. Extracted from VictoryScreen for independent testability.

| Function | Description |
|----------|-------------|
| `formatTime(seconds)` | Format seconds as `m:ss`. Guards against NaN, negative, and Infinity — returns `0:00` for invalid input. |
| `renderSpeed(value, label)` | Render speed metric: `mm:ss` for time-based labels (matches `/time\|duration\|elapsed\|seconds?/i`), raw integer for rate-based (e.g. WPM). Returns `"—"` for invalid values. |
| `computeGrade(accuracy)` | Map accuracy percentage to letter grade: S (≥95), A (≥90), B (≥80), C (≥70), D (≥60), F (<60). |

### Curriculum Helpers (`template/src/data/curriculum.ts`)

Each game replaces the template curriculum data but keeps these helper functions.

| Function | Description |
|----------|-------------|
| `getItemsByCategory(categoryId)` | Get all `ContentItem`s belonging to a category. Returns empty array if no items match. |
| `getItemsByLevel(categoryId, levelId)` | Get items for a specific level within a category. Resolves the level's item ID list to full `ContentItem` objects, preserving level order. |

### Social Share (`template/src/lib/share.ts`)

Pure functions for generating shareable score cards. Integrated into VictoryScreen via the `ShareCard` component.

| Function | Description |
|----------|-------------|
| `generateShareText(data)` | Generate multi-line share text from `GameResults` with grade emoji, accuracy, streak, and optional game URL. |
| `canNativeShare()` | Check if Web Share API is available (mobile browsers, some desktop). |
| `shareResults(data)` | Share via native share sheet (mobile) or clipboard fallback (desktop). Returns `"shared"`, `"copied"`, or `"failed"`. |

The `ShareCard` component renders automatically in `VictoryScreen` when `gameName` is provided. Pass `streak`, `level`, and `gameUrl` for richer share cards.

### Session Planner (`template/src/lib/sessionPlanner.ts`)

Auto-select brain that orchestrates FSRS reviews, adaptive difficulty, and category weakness analysis into optimal study sessions. Three-phase planning: (1) FSRS overdue/upcoming reviews, (2) weak category targeting (<70% accuracy), (3) difficulty-matched new content.

| Function | Description |
|----------|-------------|
| `planSession(items, options?)` | Build a prioritized session: review items first, weak-area drills second, new content third. Returns item list with reasons, counts, and estimated duration. |
| `hasReviewsDue()` | Quick boolean check for pending FSRS reviews — for badge/notification UI. |
| `describeSession(plan)` | Human-readable summary, e.g. `"4 reviews (2 bonus XP!) + 3 weak-area drills + 3 new items · ~8 min"`. |

**Options**: `sessionSize` (default 10), `reviewRatio` (default 0.4), `weakCategoryBoost` (default 0.3), `minutesPerItem` (default 0.75).

### Player Insights (`template/src/lib/insights.ts`)

Pure computation functions that transform raw progress data into displayable learning insights. No side effects.

| Function | Description |
|----------|-------------|
| `computeCategoryStrengths(items, scores)` | Per-category accuracy, strong/weak item counts. Sorted by accuracy descending. |
| `findWeakestItems(scores, limit?)` | Items with worst correct-to-total ratio, breaking ties by staleness. Default limit: 5. |
| `computeMasteryRate(totalSeen, totalMastered)` | Mastery conversion rate as 0-100 percentage. |

The `PlayerInsights` component (`components/game/PlayerInsights.tsx`) renders a retro-styled analytics panel with: Learning Pulse overview (items seen/mastered, mastery rate, time-to-mastery), 7-day and 30-day retention recall bars, per-category strength breakdown with animated progress bars, and a "Needs Work" section highlighting weakest items.

### Category Radar (`template/src/lib/categoryRadar.ts`)

Pure geometry functions for rendering SVG radar charts from category strength data.

| Function | Description |
|----------|-------------|
| `polarToCartesian(angle, radius, cx, cy)` | Convert polar coordinate to cartesian. 0° = top (12 o'clock), clockwise. |
| `computeRadarPoints(strengths, radius, cx, cy)` | Map category accuracies to SVG polygon vertices. Returns empty array if < 3 categories. |
| `pointsToPolygon(pts)` | Convert radar points to SVG `<polygon points="...">` string. |
| `computeAxisEndpoints(count, radius, cx, cy)` | Generate grid axis line endpoints from center to edge. |

### Session Recap Messages (`template/src/lib/sessionRecapMessages.ts`)

Pure functions for post-session motivational feedback. Extracted from `SessionRecap` so they're independently testable without jsdom.

| Function | Description |
|----------|-------------|
| `getRecapMessage(plan)` | Select motivational text based on session composition. Recall-bonus count (≥2) overrides dominant reason. Returns an empty-session fallback when `plan.items` is empty. |
| `memoryTier(strength)` | Map 0–100 memory strength to tier: **Strong** (≥75), **Building** (≥40), **Fragile** (>0), **New** (0). Returns `label`, `color`, and `barColor` Tailwind tokens for the strength meter. |

### Components

All components live under `template/src/components/` and are split into `ui/` (reusable primitives) and `game/` (domain-specific).

#### UI Components

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | `variant` (`primary` / `secondary` / `ghost`), `size`, `disabled`, `onClick`, `children` | Retro pixel button with variant styling. |
| `Logo` | — | Game logo with pixel font treatment. |
| `StreakBadge` | `streak`, `freezes` | Displays daily streak count and available freezes. |
| `XPBar` | `xp`, `level` | XP progress bar with level milestone markers. Fills to 100 XP per level. |

#### Game Components

| Component | Props | Description |
|-----------|-------|-------------|
| `Timer` | `seconds`, `total`, `onExpire` | Countdown timer with percentage-based progress bar. |
| `VictoryScreen` | `accuracy`, `correct`, `total`, `elapsed`, `speedLabel?`, `gameName?`, `streak?`, `level?`, `gameUrl?`, `onRestart` | Post-level results with letter grade (S/A/B/C/D/F), stats, and optional share card. `speedLabel` matching `/time\|duration\|elapsed\|seconds?/i` renders as `mm:ss`. |
| `ShareCard` | `gameName`, `accuracy`, `grade`, `streak?`, `level?`, `gameUrl?` | Retro-styled social share card. Uses Web Share API on mobile, clipboard fallback on desktop. |
| `PlayerInsights` | `items`, `scores` | Analytics dashboard: mastery rate, category strengths, retention bars, weakest items. |
| `SessionBanner` | `plan`, `description`, `progress`, `currentReason`, `isComplete` | Live session status banner with animated progress bar, reason tags (review/bonus/weak/new), and composition pills. All props provided by `useSessionPlanner()`. |
| `SessionRecap` | `plan`, `memoryStrength`, `onNewSession` | Post-session debrief: reason breakdown, animated memory strength meter with tier labels, motivational message, and action buttons. |
| `ActivityHeatmap` | `progress`, `weeks?` | Pixel-art activity calendar (12 weeks default). Aggregates `LearningEvent` timestamps + `itemScore.lastSeen` into daily intensity grid with hover tooltips, streak/active-day stats, and staggered entrance animation. |
| `CategoryRadar` | `strengths`, `size?` | SVG radar chart visualizing category mastery as a neon polygon with concentric grid, axis labels, animated fill, and glow effects. Requires 3+ categories. |

### React Hooks

| Hook | Description |
|------|-------------|
| `useProgress(categories?)` | Reactive player state with memoized XP, level, streak, and unlock actions. |
| `useGameStats()` | Real-time session tracker: accuracy, correct/incorrect counts, elapsed time. |
| `useSoundEffects()` | 8-bit Web Audio API sounds with volume controls and localStorage persistence. |
| `useDifficulty(items, batchSize?)` | Adaptive difficulty: auto-selects items, re-analyzes after rounds, manual override. |
| `useSessionPlanner(items, options?)` | Smart session orchestrator: sequential item consumption with `advance()`/`skip()`, session description, progress tracking, and `replan()`. |

### Session Banner (`template/src/components/session/SessionBanner.tsx`)

Compact session status banner for the top of the game screen. Shows session composition (review/bonus/weak/new pills), animated progress bar, current item reason tag with contextual icons, and recall bonus XP callout. Animates between reason states and displays "SESSION COMPLETE" on finish.

Props: `plan`, `description`, `progress`, `currentReason`, `isComplete` — all provided by `useSessionPlanner()`.

## Getting Started

To scaffold a new game from the template:

```bash
cp -r template/ ../my-new-game
cd ../my-new-game
npm install
npm run dev
```

Then configure your game's storage namespace and customize content:

```ts
// src/app/layout.tsx or top-level init
import { configureStorage } from "@/lib/storage";
configureStorage("my_game"); // namespaces all localStorage keys
```

Customize `src/data/` with your curriculum and `src/app/page.tsx` with your game mechanics.

## License

MIT — [DareDev256](https://github.com/DareDev256)
