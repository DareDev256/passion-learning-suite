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
- **Testing**: Vitest (476 tests — storage, formatters, difficulty engine, curriculum, item scoring, enrichment integration, security hardening, social share + Web Share API + CWE-20 sanitization, player insights + edge cases + boundary coverage, spaced repetition, session planner + edge cases, session recap messages + threshold boundaries, auto-select integration, activity heatmap, category radar geometry, retention curve (Ebbinghaus + bucket matching + SVG mapping), daily challenge (deterministic seeding + bonus XP + localStorage persistence + expiry + corruption recovery), achievements (idempotent unlock, tier gating, time-of-day mocking, localStorage validation, trophy case sorting), achievement notifier (FIFO queue, auto-dismiss, sound-on-first, subscribe/unsubscribe, clear/flush), sound engine (Web Audio mock, oscillator counts per sound, mute gating, volume scaling, preference persistence, malformed JSON recovery), session forecast (composition math, reason tagging, percentage segments, prompt truncation, priority ordering), combo system (tier resolution + boundary transitions + peak tracking + decay timer + XP stacking), storage integrity (prototype pollution write-path rejection, checkMastery corruption recovery, analytics edge cases, streak corruption, itemScores deep validation), coverage gaps (memoryTier boundary precision + updateItemScore accumulation + prototype pollution via Object.hasOwn + analytics out-of-order events + describeSession singular/plural grammar), boundary value analysis + prototype pollution input vectors + corruption recovery, storage-security integration, learning velocity (linearSlope math + session storage CRUD + cap trimming + malformed recovery + trend detection + velocity averages), identifier parsing (multi-segment categories + prototype pollution + round-trip consistency + type guards + edge cases), edge cases — all passing)
- **Session UI**: `SessionBanner` component with animated progress bar, reason tags (review/bonus/weak/new), and composition pills
- **Session Forecast** — Pre-session overview screen visualizing the auto-select plan: stacked composition bar, scrollable item queue with reason tags, recall bonus callout, estimated time, and "BEGIN SESSION" CTA. Builds metacognitive awareness by explaining *why* each item was selected.
- **Session Planning**: Smart auto-select via `useSessionPlanner()` hook — FSRS reviews (recall-bonus detection uses authoritative FSRS `lastReview` timestamp) + weak-category targeting + difficulty-matched new content + `SessionForecast` pre-session preview + `SessionBanner` progress UI + `SessionRecap` post-session debrief with memory strength meter
- **Deployment**: Vercel (all 10 games live)

## Shared Game Systems

Every game inherits from the `template/` directory:

- **XP + Leveling** — 100 XP/level with delayed recall rewards (1x/2x/3x multiplier)
- **Daily Streak** — freeze system (earn 1 freeze per 10 levels, max 3)
- **FSRS-4.5 Spaced Repetition** — scientifically-backed review scheduling with live ts-fsrs integration
- **Mastery Gates** — Kumon-style: 90% on last 3 attempts to advance
- **Sound Engine** — Web Audio API synthesized game sounds (zero audio files). 5 distinct sound cues: ascending chime (correct), soft descending tone (incorrect — NOT a buzzer), major chord + arpeggio (celebration), shimmer rise (achievement unlock), UI tick. Mute toggle + volume slider persisted to localStorage. SSR-safe. `SoundControl` widget component included. 17 tests.
- **CRT Overlay** — retro scanlines + neon glow UI theme
- **Accessibility** — WCAG 2.2 AA compliant
- **Adaptive Difficulty** — Kumon-style auto-select: promotes at 85% accuracy, demotes at 50%, per-tier rolling window
- **Smart Session Planner** — auto-select orchestrator combining FSRS reviews, weak-category drills, and difficulty-matched new content into optimal study sessions
- **Session Recap** — post-session debrief with reason breakdown (reinforced/bonus/drilled/discovered), memory strength meter (FSRS stability → tier), and contextual motivational messages
- **Activity Heatmap** — GitHub-style pixel-art calendar showing daily learning activity over 12 weeks, with intensity mapping, best streak stats, and hover tooltips
- **Category Radar** — SVG radar chart with neon glow showing mastery polygon across all categories, animated with Framer Motion springs
- **Retention Curve** — Animated Ebbinghaus forgetting curve visualization comparing theoretical memory decay against actual player retention at 0/1/3/7/14/30-day intervals, with neon SVG rendering, hover tooltips, and color-coded data points (green = beating the curve, red = below)
- **Daily Challenge** — deterministic date-seeded challenge (same for all players), rotating focus categories, streak-aware bonus XP (1.5×–3×), perfect accuracy bonus, midnight expiry countdown
- **Combo System** — In-session consecutive-correct-answer multiplier with 4 tiers (warm 2×, hot 3×, fire 4×, ultra 5×). Spring-animated `ComboMeter` HUD with tier-specific neon glow. 8-second decay timer. Stacks with recall multipliers for up to 15× XP
- **Achievement System** — 11 unlockable achievements across bronze/silver/gold tiers. Rewards behaviors that drive learning: streaks, retention, mastery, time-of-day play. Variable reward schedule (Duolingo-inspired). FIFO notification queue with auto-dismiss, sound integration, and `+N` badge for simultaneous unlocks. Trophy case display. `AchievementToastConnected` self-wires to the queue via `useSyncExternalStore`. 36 tests covering idempotent unlocks, tier sorting, time-mocking, localStorage validation, queue management, auto-dismiss timing, and subscriber lifecycle.
- **Learning Velocity** — Session-over-session performance tracking with SVG sparkline visualization. Computes mastery velocity (mastered/seen ratio) and trend direction (accelerating/decelerating/cruising/warming up) via least-squares linear regression. Neon-glow sparkline, endpoint dot, 3 stat cells. 13 tests.
- **Analytics** — retention tracking, mastery metrics, per-question stats
- **Player Insights** — visual analytics dashboard showing mastery rate, learning velocity sparkline, category strengths, retention recall bars, and weakest items needing review
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
        ├── hooks/           # useProgress, useGameStats, useDifficulty, useSessionPlanner, useSoundEffects, useCombo
        ├── lib/             # Storage, difficulty engine, formatters, insights, spaced repetition, sound engine
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

### Daily Challenge (`template/src/lib/dailyChallenge.ts`)

Deterministic daily challenge engine. Every player gets the same challenge on a given day via date-seeded PRNG. Focus category rotates daily across the content catalog. Bonus XP scales with streak.

| Function | Description |
|----------|-------------|
| `generateDailyChallenge(items, size?)` | Build today's challenge: 5 items (3 from focus category, 2 from others), with streak-aware bonus multiplier (1.5× base, +0.5× per 5 streak days, max 3×). Deterministic — same date = same items. |
| `calculateDailyBonusXP(correct, total, multiplier)` | Compute bonus XP: `correct × 10 × multiplier`, plus 25 flat bonus for perfect accuracy. |
| `isDailyChallengeComplete()` | Check if today's challenge has been completed. |
| `saveDailyChallengeResult(result)` | Persist today's result to localStorage. |
| `getDailyChallengeResult()` | Load today's result (null if not yet attempted or from a previous day). |
| `timeUntilExpiry(expiresAt)` | Format countdown: `"3h 45m"`, `"30m"`, or `"Expired"`. |

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

### Sound Engine (`template/src/lib/soundEngine.ts`)

Web Audio API synthesized game sounds — zero external audio files. SSR-safe with lazy AudioContext initialization. Mute and volume preferences validated and persisted to localStorage.

| Function | Description |
|----------|-------------|
| `loadSoundPrefs()` | Load sound preferences from localStorage. Validates types and ranges, falls back to defaults (`{ muted: false, volume: 0.7 }`) for malformed data. SSR-safe. |
| `saveSoundPrefs(prefs)` | Persist mute/volume preferences to localStorage. No-op on the server. |
| `playCorrect()` | Ascending C-E-G chime (3 oscillators). |
| `playIncorrect()` | Soft descending Eb-C triangle wave (2 oscillators). Not a buzzer — gentle by design. |
| `playCelebration()` | Major chord burst + rising arpeggio to C6 (7 oscillators). |
| `playTick()` | Subtle A5 sine pip for UI interactions (1 oscillator). |
| `playAchievement()` | Shimmering A-C#-E-A-C# rise (5 oscillators). |

### Activity Heatmap (`template/src/lib/activityHeatmap.ts`)

Aggregates learning events into a daily activity grid for GitHub-style visualization. Pure functions — no side effects.

| Function | Description |
|----------|-------------|
| `toDateKey(ts)` | Convert a Unix timestamp (ms) to `YYYY-MM-DD` in local time. |
| `countToIntensity(count)` | Map event count to 0–4 intensity level: 0→none, 1–2→low, 3–5→mid, 6–12→high, 13+→max. |
| `computeStreaks(dateKeys, today)` | Compute current streak (backwards from today) and best streak (across all dates). |
| `buildHeatmap(events, weeks?)` | Build the full grid: `weeks` × 7 daily cells with counts, intensity, streak stats. Default 12 weeks. |

### Session Recap Messages (`template/src/lib/sessionRecapMessages.ts`)

Pure functions for post-session motivational feedback. Extracted from `SessionRecap` so they're independently testable without jsdom.

| Function | Description |
|----------|-------------|
| `getRecapMessage(plan)` | Select motivational text based on session composition. Recall-bonus count (≥2) overrides dominant reason. Returns an empty-session fallback when `plan.items` is empty. |
| `memoryTier(strength)` | Map 0–100 memory strength to tier: **Strong** (≥75), **Building** (≥40), **Fragile** (>0), **New** (0). Returns `label`, `color`, and `barColor` Tailwind tokens for the strength meter. |

### Retention Curve (`template/src/lib/retentionCurve.ts`)

Pure functions for computing Ebbinghaus-style forgetting curves from real learning events. No side effects, no localStorage access.

| Function | Description |
|----------|-------------|
| `ebbinghaus(day, stability?)` | Ebbinghaus forgetting model: `R = e^(-t/S)`. Returns 0–100 retention %. Default stability 3.5 (untrained learner). Guards against NaN, negative, and zero-stability inputs. |
| `bucketByInterval(events)` | Group review events into nearest `RETENTION_DAYS` bucket (0/1/3/7/14/30) using adaptive thresholds. Returns per-bucket correct/total counts. |
| `findNearestBucket(days)` | Match a day count to the closest retention interval. Tighter thresholds for small intervals (±0.5 for day 0–1), looser for large (±40% for day 7+). Returns `null` if no bucket matches. |
| `computeRetentionCurve(events)` | Full retention curve: theoretical Ebbinghaus predictions + actual player data at each interval. Returns points, weighted overall retention, and total review count. |
| `retentionToSVG(day, retention, width, height, padding?)` | Map a retention point to SVG coordinates. X = days (0–30), Y = retention (0–100). Default padding 32px. |
| `pointsToPath(coords)` | Generate SVG `<path d="...">` string with monotone cubic bezier interpolation for smooth decay curves. |

### Learning Velocity (`template/src/lib/learningVelocity.ts`)

Session-over-session performance tracking. Answers: "Am I learning faster, or just grinding?" Pure functions + localStorage persistence. SSR-safe.

| Function | Description |
|----------|-------------|
| `getSessionSnapshots()` | Load up to 30 stored session snapshots from localStorage. Filters malformed entries. SSR-safe (returns `[]` on server). |
| `recordSession(snapshot)` | Persist a session snapshot. Caps at 30 entries (FIFO). Rejects empty sessions (`itemsSeen ≤ 0`). No-op during SSR. |
| `linearSlope(values)` | Least-squares linear regression slope. Positive = trending up, negative = trending down. Returns 0 for fewer than 2 values. |
| `computeVelocity()` | Full velocity report: current/average mastery velocity, trend direction (improving/declining/steady/insufficient), regression slope, and all session snapshots. Requires 3+ sessions for trend detection. |

### Achievement Notifier (`template/src/lib/achievementNotifier.ts`)

FIFO notification queue bridging achievement unlocks to display. Framework-agnostic pub/sub core — consumed via `useSyncExternalStore` in `AchievementToastConnected`.

| Function | Description |
|----------|-------------|
| `enqueue(achievements)` | Push unlocked achievements into the queue. Plays `playAchievement()` sound on first entry. No-op for empty arrays. |
| `dismiss()` | Dismiss current notification, advance to next (with sound). Clears auto-dismiss timer. |
| `peek()` | Read the front-of-queue notification without consuming it. Returns `null` if idle. |
| `pending()` | Number of queued notifications (including the one currently displayed). |
| `clear()` | Flush entire queue and notify all subscribers. |
| `subscribe(fn)` | Subscribe to queue state changes. Returns an unsubscribe function. Fires on enqueue, dismiss, and clear. |

**Auto-dismiss**: Each notification auto-dismisses after 4 seconds, advancing to the next queued achievement.

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
| `ComboMeter` | `combo` | Spring-animated HUD showing live combo count, multiplier badge, and tier label. Tier-specific neon glow (warm→hot→fire→ultra). ARIA live region. Appears at 2+ combo, top-center positioned. |
| `LearningVelocity` | — | SVG sparkline showing accuracy trend across sessions. Trend badge (▲ accelerating / ▼ decelerating / ● cruising / ◌ warming up), neon endpoint dot, 3 stat cells (this session / avg mastery / session count). |
| `RetentionCurve` | `events` | Animated Ebbinghaus forgetting curve: theoretical decay line vs actual player retention at 0/1/3/7/14/30-day intervals. Color-coded dots (green = beating curve, red = below). Hover tooltips. |
| `AchievementToast` | `achievement`, `onDismiss` | Single achievement notification with icon, name, description, and tier badge. Pixel-border styling with slide-in animation. |
| `SessionForecast` | `plan`, `description`, `onStart` | Pre-session overview: stacked composition bar, scrollable item queue with reason tags, recall bonus callout, estimated time, and "BEGIN SESSION" CTA. Empty-state messaging when all caught up. |

### React Hooks

| Hook | Description |
|------|-------------|
| `useProgress(categories?)` | Reactive player state with memoized XP, level, streak, and unlock actions. |
| `useGameStats()` | Real-time session tracker: accuracy, correct/incorrect counts, elapsed time. |
| `useSoundEffects()` | 8-bit Web Audio API sounds with volume controls and localStorage persistence. |
| `useDifficulty(items, batchSize?)` | Adaptive difficulty: auto-selects items, re-analyzes after rounds, manual override. |
| `useSessionPlanner(items, options?)` | Smart session orchestrator: sequential item consumption with `advance()`/`skip()`, session description, progress tracking, and `replan()`. |
| `useCombo(options?)` | In-session combo manager: feed `hit()`/`miss()` signals, get live multiplier/tier/count. 8s decay timer (configurable). Callbacks for tier-up and combo-break events. |

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
