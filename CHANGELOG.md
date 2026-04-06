# Changelog

## [0.18.4] - 2026-04-06

### Added
- **Auto-select integration tests** (`__tests__/autoSelect-integration.test.ts`) — 16 new tests (431→447 total) covering untested critical paths in the adaptive difficulty engine and session planner composition. Tests include: `computeRecommendation` cascade when hard<50% with medium data present (3 branches), recall-bonus 7-day boundary precision (exact boundary, just-under, FSRS vs itemScores divergence), `selectItems` boundary inputs (count=0, count>catalog, empty catalog), same-millisecond timestamp sort stability, catalog exhaustion (sessionSize > available items, estimated minutes accuracy), `hasReviewsDue` (due/empty/future-only), and three-phase deduplication under catalog pressure (item eligible for review + weak-category + new simultaneously).

## [0.18.1] - 2026-04-06

### Changed
- **Achievement notification service** (`lib/achievementNotifier.ts`) — Extracted notification/display logic from the achievement system into a dedicated FIFO queue service. Manages sequential display of simultaneous unlocks with auto-dismiss (4s), sound integration (`playAchievement()` per toast), and a pub/sub API (`subscribe`/`enqueue`/`dismiss`/`clear`). Framework-agnostic core, consumed via `useSyncExternalStore` in the new `AchievementToastConnected` component which also shows a `+N` badge when multiple achievements are queued. Original `AchievementToast` preserved for backward compatibility.
- **14 new tests** (417→431 total) — Covers enqueue (empty array rejection, single/batch queuing, sound-on-first-only), dismiss (queue advancement, empty-queue safety), auto-dismiss (4s timer, full queue drain), subscribe (enqueue/empty/unsubscribe notifications), and clear (flush + subscriber notification).

## [0.18.0] - 2026-04-05

### Added
- **Learning Velocity engine** (`lib/learningVelocity.ts`) — Session-over-session performance tracking that answers "am I learning faster or just grinding?" Records per-session snapshots (items seen, accuracy, mastery conversions) to localStorage, computes mastery velocity (mastered/seen ratio), and derives trend direction via least-squares linear regression over the last 30 sessions. Four trend states: accelerating, decelerating, cruising, warming up. SSR-safe, pure functions, capped at 30 snapshots with malformed-entry filtering.
- **`LearningVelocity` component** (`components/game/LearningVelocity.tsx`) — SVG sparkline visualization showing accuracy trend across sessions with neon glow, endpoint dot, trend indicator badge (▲ ACCELERATING / ▼ DECELERATING / ● CRUISING / ◌ WARMING UP), and three stat cells (this session mastery %, average mastery %, session count). Integrated into `PlayerInsights` dashboard. ARIA-labeled, Framer Motion animated.
- **16 new tests** (401→417 total) — Covers `linearSlope` (positive/negative/flat/noisy), session storage (record/retrieve, empty-session rejection, 30-cap trimming, malformed JSON recovery, invalid entry filtering), and `computeVelocity` (insufficient data, improving/declining/steady trends, average/current velocity math).

## [0.17.2] - 2026-04-05

### Fixed
- **Recall-bonus detection** (`sessionPlanner.ts:planSession`) — Recall-bonus tagging (7+ day = 2× XP) now uses the FSRS card's `lastReview` timestamp as the authoritative source, falling back to `itemScores.lastSeen` only when no card exists. Previously used `itemScores.lastSeen` exclusively, which silently dropped recall bonuses when `gradeItem()` ran without a corresponding `updateItemScore()` call — the two storage paths can diverge, causing players to miss earned XP multipliers.
- **2 new tests** (399→401 total) — Covers FSRS-only recall bonus detection (no `itemScores` entry) and FSRS `lastReview` taking precedence over stale `itemScores.lastSeen`.

## [0.17.1] - 2026-04-04

### Changed
- **JSDoc coverage** — Added documentation to 6 undocumented public functions across `soundEngine.ts` (`loadSoundPrefs`, `saveSoundPrefs`), `achievements.ts` (`getUnlocked`), and `activityHeatmap.ts` (`toDateKey`, `countToIntensity`, `computeStreaks`). Each JSDoc includes parameter descriptions, return types, and behavioral notes (SSR safety, validation, thresholds).
- **README accuracy** — Fixed stale test count (420→399) and added `useCombo` hook + `ComboMeter` component to their respective API tables. Added missing API reference tables for Sound Engine (7 functions) and Activity Heatmap (4 functions), matching the documentation pattern used by other modules.
- **Repo structure** — Added `useCombo` to the hooks directory listing.

## [0.17.0] - 2026-04-04

### Added
- **Combo system** (`hooks/useCombo.ts`) — In-session consecutive-correct-answer multiplier with 4 escalating tiers: warm (3+ = 2× XP), hot (5+ = 3×), fire (8+ = 4×), ultra (12+ = 5×). 8-second inactivity decay timer (configurable). Peak tracking per session. Callbacks for tier-up and combo-break events. Wrong answer resets immediately. Designed to stack with existing recall multipliers (combo × recall = up to 15× XP).
- **`ComboMeter` component** (`components/game/ComboMeter.tsx`) — Spring-animated HUD element showing live combo count, multiplier badge, and tier label. Tier-specific neon colors (warning → accent → secondary → error) with escalating glow intensity. ARIA live region for screen reader announcements. Framer Motion entrance/exit with spring physics. Appears at 2+ combo, positioned top-center (overridable via className).
- **21 new tests** (378→399 total) — `combo.test.ts` covering: tier resolution at every boundary (0–100), multiplier scaling (1×/2×/3×/4×/5×), sequential tier transitions, boundary-1 values, negative count safety, peak tracking across multiple combo breaks, decay timer firing/cancellation/custom duration (fake timers), and XP integration math including combo × recall stacking.

## [0.16.1] - 2026-04-03

### Added
- **23 new edge-case tests** (355→378 total) — `edgeCases.test.ts` covering critical untested security and corruption recovery paths:
  - **Write-path prototype pollution rejection**: `completeLevel`, `updateItemScore`, `saveFSRSCard`, `getRecallMultiplier`, `recordMasteryAttempt` all reject `__proto__`/`constructor`/`prototype` IDs silently without corrupting state
  - **itemScores corruption recovery**: non-object score values stripped, NaN/undefined numeric fields clamped to 0, `completedLevels` entries exceeding 128 chars filtered out
  - **checkMastery hardening**: non-object stored mastery data returns false, attempts with NaN/Infinity accuracy filtered as invalid
  - **Daily challenge corruption**: `isDailyChallengeComplete` and `getDailyChallengeResult` gracefully recover from malformed JSON and expired results
  - **memoryTier boundary precision**: color token assertions (success/warning/error/accent) for all 4 tiers, boundary value tests at 74→BUILDING and 39→FRAGILE thresholds

## [0.16.0] - 2026-04-03

### Added
- **`SessionForecast` component** (`components/session/SessionForecast.tsx`) — Pre-session overview screen that visualizes the auto-select brain's plan before gameplay begins. Shows a stacked composition bar (review/bonus/weak/new segments with animated fill), a scrollable item queue with per-item reason tags and prompt previews (truncated at 50 chars), recall bonus XP callout for 7+ day items, estimated session time, and a "BEGIN SESSION" CTA. Empty-state messaging ("ALL CAUGHT UP") when no items are due. Staggered Framer Motion entrance with cascading `fadeUp` reveals. Matches the CRT/neon design system with `pixel-border`, `neon-glow`, and `font-pixel` tokens. Builds metacognitive awareness by explaining *why* each item was selected — research shows learners who understand their study plan retain 20-30% more.
- **10 new tests** (345→355 total) — `sessionForecast.test.ts` covering: empty plan zero-state, composition count summation (review+bonus+weak+new = total items), recall-bonus reason tagging, percentage calculation for composition segments, prompt truncation at 50 chars with ellipsis, single-item session handling, reason type uniqueness (4 distinct identifiers), dominant reason validation, estimated minutes positivity, and priority ordering (lower = more urgent).

## [0.15.0] - 2026-04-03

### Added
- **Sound engine** (`lib/soundEngine.ts`) — Web Audio API synthesized game sounds with zero external audio files. 5 distinct sound cues mapped to game events: `playCorrect()` (ascending C-E-G chime), `playIncorrect()` (soft descending Eb-C triangle wave — NOT a buzzer), `playCelebration()` (major chord burst + rising arpeggio to C6), `playAchievement()` (shimmering A-C#-E-A-C# rise), `playTick()` (subtle UI interaction). All sounds use exponential gain decay for natural instrument-like fade. Volume and mute preferences persisted to localStorage with validation (range clamping, type checking, malformed JSON recovery). SSR-safe with `typeof window` guards. Lazy AudioContext initialization with suspended-state resume.
- **`SoundControl` component** (`components/ui/SoundControl.tsx`) — Floating sound control widget with mute toggle button (context-aware emoji: muted/low/high) and volume slider. Framer Motion entrance animation. Full keyboard accessibility with focus-visible ring. Backdrop blur glass effect matching the CRT design system.
- **17 new tests** (328→345 total) — `soundEngine.test.ts` covering: default preference loading, saved preference retrieval, malformed JSON recovery, out-of-range volume rejection (>1, <0), non-boolean muted rejection, missing field graceful defaults, preference persistence and overwrite, oscillator count verification per sound (3 correct, 2 incorrect, 7 celebration, 1 tick, 5 achievement), mute gating (no oscillators created when muted), volume multiplier scaling on gain nodes. Web Audio API mocked via function constructor pattern.

## [0.14.0] - 2026-04-02

### Added
- **Achievement system** (`lib/achievements.ts`) — 11 unlockable achievements across 3 tiers (bronze/silver/gold) rewarding learning-positive behaviors: first level completion, streak milestones (3/7/30 days), XP thresholds (1K/10K), perfect accuracy sessions, mastery count, 7-day retention rate, and time-of-day play (night owl/early bird). Idempotent unlock via localStorage with validation against malformed data. Variable reward schedule inspired by Duolingo's engagement research.
- **`AchievementToast` component** (`components/game/AchievementToast.tsx`) — Spring-animated toast notification on achievement unlock with tier-specific border colors and glow effects (amber/silver/gold). Auto-dismisses after 4 seconds. ARIA-labeled for screen readers.
- **`TrophyCase` component** (`components/game/AchievementToast.tsx`) — Grid display of all achievements with locked/unlocked states. Locked achievements show as grayscale mystery boxes. Sorted by tier. Hover-to-reveal descriptions.
- **22 new tests** (306→328 total) — `achievements.test.ts` covering: unique IDs, required fields, empty-state returns, milestone unlocks (first_step, streak_3, streak_7, centurion, xp_titan), accuracy gating (perfect at 100%, not at 99%), analytics-driven unlocks (ten_mastered, recall_ace), idempotent double-unlock prevention, time-of-day achievements with `vi.useFakeTimers` (night_owl at 2AM, early_bird at 6AM, neither at 2PM), malformed localStorage recovery, invalid entry filtering, trophy case completeness and tier sorting.

## [0.13.0] - 2026-04-01

### Added
- **`dailyChallenge` lib** (`lib/dailyChallenge.ts`) — Deterministic daily challenge engine that generates the same challenge for all players on a given day. Uses date-seeded PRNG (djb2 hash + mulberry32) for reproducible item selection, rotating focus categories daily. Features: streak-aware bonus multiplier (1.5× base, +0.5× per 5 streak days, max 3×), perfect accuracy bonus (+25 XP), expiry countdown formatter, and localStorage persistence for completion tracking. Challenge items are weighted 3:2 toward the day's focus category for themed learning sessions.
- **25 new tests** (281→306 total) — `dailyChallenge.test.ts` covering: deterministic seeding (same date = same items), challenge size (default 5, custom, edge cases), focus category validation and rotation, expiry timestamp, streak-based multiplier calculation, empty/undersized catalog handling, no-duplicate guarantee, bonus XP calculation (base × multiplier, perfect bonus, zero cases, rounding), time-until-expiry formatting (hours+minutes, minutes-only, expired), localStorage persistence (save/retrieve/yesterday-expiry/incomplete-state), date key format validation.

## [0.12.0] - 2026-03-31

### Added
- **`RetentionCurve` component** (`components/game/RetentionCurve.tsx`) — Animated SVG visualization of the Ebbinghaus forgetting curve overlaid with the player's actual retention data. Features: theoretical decay line (dashed, amber), actual retention curve (solid, neon glow), color-coded data points (green = beating the curve, red = below), hover tooltips showing retention % and review count, gradient fill under actual curve, stat pills (overall retention, total reviews, 7-day recall), responsive legend, and empty-state messaging. Reads events across all game namespaces. Spring-animated entrance via Framer Motion.
- **`retentionCurve` lib** (`lib/retentionCurve.ts`) — Pure functions: `ebbinghaus(day, stability)` computes theoretical retention via R=e^(-t/S), `findNearestBucket(days)` maps review intervals to measurement buckets with adaptive thresholds, `bucketByInterval(events)` aggregates learning events into day-interval retention rates, `computeRetentionCurve(events)` produces full curve data with theoretical + actual points, `retentionToSVG(day, retention, w, h, pad)` maps data to SVG coordinates, `pointsToPath(coords)` generates smooth cubic bezier SVG paths.
- **30 new tests** (251→281 total) — `retentionCurve.test.ts` covering: `ebbinghaus` day-0 baseline, negative days, decay ordering, NaN/zero/negative stability, stability comparison, integer rounding; `findNearestBucket` exact matches, null for out-of-range/negative/NaN, adaptive threshold bucketing at multiple intervals; `bucketByInterval` empty events, first_correct counting, review_correct/incorrect bucketing, non-review event filtering; `computeRetentionCurve` zero-event baseline, mixed-event actual retention, theoretical monotonic decay; `retentionToSVG` corner mapping, center retention; `pointsToPath` empty/single/multi-point bezier generation.

## [0.11.1] - 2026-03-31

### Added
- **Adaptive Difficulty Engine documentation** (`docs/adaptive-difficulty.md`) — Dedicated deep-dive covering the Kumon-style tier-ladder algorithm, tuning constants (`WINDOW=5`, `PROMOTE_THRESHOLD=85%`, `DEMOTE_THRESHOLD=50%`), confidence levels, growth-mindset-biased tier fallback order, `useDifficulty` hook integration guide, and session planner interaction diagram. The engine drives all 10 games but previously had only a 2-row API table in the README.

### Changed
- **README: Adaptive Difficulty section** — Expanded from bare function signatures to include promotion/demotion thresholds, confidence levels, fallback bias explanation, and a link to the full documentation. Added `docs/` directory to repo structure tree.

## [0.11.0] - 2026-03-30

### Added
- **`CategoryRadar` component** (`components/game/CategoryRadar.tsx`) — SVG radar chart visualizing category mastery as a neon polygon. Features: concentric ring grid (25/50/75/100%), axis lines per category, animated polygon fill with glow filter, spring-animated data point dots, color-coded category labels (green ≥70%, yellow ≥40%, red <40%), center average accuracy readout, and full ARIA labeling. Requires 3+ categories to render.
- **`categoryRadar` lib** (`lib/categoryRadar.ts`) — Pure geometry functions: `polarToCartesian(angle, radius, cx, cy)` converts polar→cartesian with 12-o'clock origin, `computeRadarPoints(strengths, radius, cx, cy)` maps category accuracies to polygon vertices, `pointsToPolygon(pts)` generates SVG polygon strings, `computeAxisEndpoints(count, radius, cx, cy)` generates grid axis coordinates.
- **16 new tests** (235→251 total) — `categoryRadar.test.ts` covering: `polarToCartesian` cardinal directions (0°/90°/180°/270°) + zero-radius center, `computeRadarPoints` minimum-3 threshold, 100%/0% accuracy extremes, label/value preservation, 4-category 90° distribution, `pointsToPolygon` formatting + empty array, `computeAxisEndpoints` minimum-3 guard + count + top-origin.

## [0.10.0] - 2026-03-30

### Added
- **`ActivityHeatmap` component** (`components/game/ActivityHeatmap.tsx`) — GitHub-style pixel-art activity calendar showing daily learning events over 12 weeks. Features: logarithmic intensity scaling (5 levels from empty to max), hover tooltips with event count and date, spring-animated cell zoom on hover, stat pills showing active days/current streak/best streak, and intensity legend. Reads events across all game namespaces for suite-wide activity tracking.
- **`activityHeatmap` lib** (`lib/activityHeatmap.ts`) — Pure functions: `buildHeatmap(events, weeks)` aggregates `LearningEvent[]` into a `HeatmapData` grid with per-day counts, intensity levels, and streak computation. `toDateKey()` for timestamp→date conversion, `countToIntensity()` for logarithmic bucketing, `computeStreaks()` for current/best streak calculation from date sets.
- **18 new tests** (217→235 total) — `activityHeatmap.test.ts` covering: `toDateKey` formatting + padding, `countToIntensity` all 5 threshold boundaries, `computeStreaks` empty/single/consecutive/gap/historical scenarios, `buildHeatmap` day count, all-zero baseline, event aggregation, window exclusion, intensity mapping, and streak derivation.

## [0.9.2] - 2026-03-29

### Changed
- **Refactor: SessionBanner extracted to `session/` directory** — Moved `SessionBanner` from `components/game/` to `components/session/` to group session-related UI components together. No API or behavior changes.

## [0.9.1] - 2026-03-28

### Changed
- **JSDoc enrichment** — Added full `@param`, `@returns`, and `@example` blocks to `getRecapMessage()` and `memoryTier()` in `sessionRecapMessages.ts`. Both functions now show realistic return values in IDE hover previews.
- **README: Session Recap Messages API** — New reference table documenting `getRecapMessage()` and `memoryTier()` with tier thresholds (Strong ≥ 75, Building ≥ 40, Fragile > 0, New = 0).
- **README: Components reference** — Added props tables for all 10 components (4 UI + 6 game), including `VictoryScreen` `speedLabel` regex behavior and `SessionRecap` prop surface. Components were previously undiscoverable without reading source.

## [0.9.0] - 2026-03-28

### Added
- **`SessionRecap` component** (`components/game/SessionRecap.tsx`) — Post-session debrief screen shown when a session completes. Surfaces: session breakdown by reason type (reinforced/bonus recall/drilled/discovered) with per-reason counts, animated memory strength meter with tier labels (Strong/Building/Fragile/New) powered by FSRS stability data via `computeMemoryStrength()`, contextual motivational messages that adapt to session composition (review-dominant, weak-category drill, new content, recall-bonus heavy), and action buttons for starting a new session or viewing insights. Staggered Framer Motion entrance animations with spring physics on the header.
- **`sessionRecapMessages` lib** (`lib/sessionRecapMessages.ts`) — Pure functions extracted for testability: `getRecapMessage(plan)` selects motivational feedback based on dominant session reason and recall bonus count, `memoryTier(strength)` maps 0-100 memory strength to tier label + color tokens.
- **10 new tests** (207→217 total) — `sessionRecap.test.ts` covering: empty session message, review/weak-category/new/recall-bonus dominant messages, recall-bonus priority override (2+ bonuses), and `memoryTier` boundary thresholds (Strong≥75, Building≥40, Fragile>0, New=0).

## [0.8.2] - 2026-03-28

### Added
- **11 new tests** (196→207 total) — `sessionPlanner-edge-cases.test.ts` covering: review queue fallback to upcoming items with priority validation, orphaned FSRS card references (deleted items silently skipped), extreme ratio edge cases (`reviewRatio: 0/1`, `weakCategoryBoost: 0`), multi-weak-category targeting across category boundaries, `describeSession` with all-zero/empty plans and full three-section ordering verification, three-phase integration test ensuring review→weak→new pipeline produces no duplicates and respects phase boundaries.

## [0.8.1] - 2026-03-27

### Added
- **27 new tests** (169→196 total) — `sessionPlanner.test.ts` covering: plan shape validation, session size/empty/small catalog handling, item deduplication, priority sorting, estimated minutes scaling, FSRS review slot filling, recall-bonus flagging (7+ day gap) vs recent items, weak-category targeting (<70% accuracy) with category verification, strong-category skip, dominant reason inference, `describeSession` singular/plural grammar for reviews/new items/drills + bonus XP notation + multi-part joining, `hasReviewsDue` with no cards/overdue/future-scheduled.

## [0.8.0] - 2026-03-27

### Added
- **`useSessionPlanner` hook** (`hooks/useSessionPlanner.ts`) — React integration for the smart session planner. Wraps `planSession()` with sequential item consumption: `advance()` moves to the next item after answering, `skip()` passes, `replan()` rebuilds from scratch. Exposes `currentItem`, `currentReason` (review/weak-category/new/recall-bonus), `progress` (current/total), `description` (human-readable summary), and `isComplete`. Memoized initial plan from content catalog.
- **`SessionBanner` component** (`components/game/SessionBanner.tsx`) — Compact retro-styled session status banner for the top of game screens. Features: animated pixel progress bar, reason tag with contextual icons (review/bonus XP/weak area/new), composition pills showing session mix, animated transitions between reason states via AnimatePresence, and "SESSION COMPLETE" spring animation on finish.

## [0.7.0] - 2026-03-27

### Added
- **Smart Session Planner** (`lib/sessionPlanner.ts`) — Auto-select orchestrator that builds optimal study sessions by combining three intelligence signals: (1) FSRS spaced repetition review queue (overdue items first, upcoming items second), (2) weak category targeting (items from categories below 70% accuracy), and (3) difficulty-matched new content via the adaptive difficulty engine. Items with 7+ day gaps are flagged as `recall-bonus` for XP motivation. Configurable session size, review ratio, and weak-category boost.
- `planSession(items, options?)` — Build a prioritized session plan with review/new/weak-category item mix, estimated duration, and dominant session type.
- `hasReviewsDue()` — Lightweight check for pending FSRS reviews (for badge/notification UI without full plan computation).
- `describeSession(plan)` — Human-readable session summary (e.g. `"4 reviews (2 bonus XP!) + 3 weak-area drills + 3 new items · ~8 min"`).

## [0.6.1] - 2026-03-26

### Security
- **`useSoundEffects` deserialization hardening** — `JSON.parse()` on localStorage was spread directly into state with zero validation. Added `validateSoundSettings()` with prototype pollution protection (`__proto__`, `constructor`, `prototype` stripped), strict boolean/number type enforcement, and volume clamping to [0, 1]. Previously a crafted `pl_sound_settings` payload could inject arbitrary keys or cause NaN propagation through Web Audio API (CWE-502, CWE-1321, OWASP A08).
- **Share text input sanitization** — `gameName` in `generateShareText()` and `navigator.share()` was passed through unsanitized. Added `sanitizeShareString()` which strips control characters (U+0000–U+001F, U+007F–U+009F), newlines (prevents fake content injection in share previews), and enforces 100-char length limit. Empty names fall back to "Game" (CWE-20, OWASP A03).
- **`currentCategory` validation tightened** — `validateProgress()` in `storage.ts` only enforced a 128-char length limit on `currentCategory` but didn't validate against `CONTENT_ID_PATTERN`. Now uses the same `isValidContentId()` check applied to all other content IDs, rejecting prototype pollution keys and non-whitelisted characters consistently (CWE-20).

## [0.6.0] - 2026-03-25

### Added
- **Spaced Repetition Scheduler** (`lib/spacedRepetition.ts`) — Active scheduling engine that bridges ts-fsrs with the storage layer. `gradeItem()` creates/updates FSRS cards and computes optimal review intervals. `inferGrade()` maps correct/incorrect + confidence to FSRS quality grades (again/hard/good/easy). `getReviewQueue()` builds prioritized due/upcoming queues. `computeMemoryStrength()` scores overall memory retention 0-100 from average card stability. Fuzz enabled to prevent predictable review patterns.
- **19 new tests** (150→169 total) — `spacedRepetition.test.ts` covering: grade inference (5 cases), item grading with card creation/persistence/updates/interval ordering/difficulty bounds, review queue (empty/overdue/sort/upcoming/limit), memory strength (empty/full/capped/averaged).

## [0.5.0] - 2026-03-25

### Added
- **Player Insights Engine** (`lib/insights.ts`) — Pure computation layer with `computeCategoryStrengths()` (per-category accuracy from item scores), `findWeakestItems()` (items with worst correct-to-total ratio, tie-broken by staleness), and `computeMasteryRate()` (mastery conversion percentage). Zero side effects, fully testable.
- **PlayerInsights Component** (`components/game/PlayerInsights.tsx`) — Retro-styled analytics dashboard showing: Learning Pulse overview (items seen, mastered, mastery rate, avg time-to-mastery), 7-day and 30-day retention recall bars with color-coded thresholds, per-category strength breakdown with animated Framer Motion progress bars, and a "Needs Work" section highlighting weakest items. Empty state handled gracefully. ARIA progressbar roles for accessibility.
- **15 new tests** (135→150 total) — `insights.test.ts` covering: category strength computation (empty scores, multi-category accuracy, sort order, zero-attempt exclusion), weakest item ranking (ratio sort, limit, staleness tie-breaking, days-since-review accuracy, zero-attempt exclusion), mastery rate (zero/full/partial/rounded/negative edge cases).

## [0.4.0] - 2026-03-24

### Added
- **Social Share Cards** — retro-styled shareable score cards that appear on the VictoryScreen after level completion. Players can share their grade, accuracy, streak, and score to social media or clipboard.
- **`lib/share.ts`** — Pure utility module with `generateShareText()`, `canNativeShare()`, and `shareResults()`. Generates formatted share text with grade-specific emoji (👑 S, ⚡ A, 🔥 B, ✨ C, 💪 D, 🎮 F), streak callouts, and optional game URL.
- **`ShareCard` component** — Pixel-bordered score card with animated share button. Uses Web Share API on mobile (native share sheet) with clipboard fallback on desktop. Visual feedback for copy/share states via AnimatePresence transitions.
- **VictoryScreen integration** — New optional props: `gameName`, `streak`, `level`, `gameUrl`. When `gameName` is provided, the ShareCard renders below the action buttons.
- **8 new tests** (127→135 total) — `share.test.ts` covering: grade emoji mapping for all 6 ranks, streak inclusion/exclusion logic, URL appending, zero/100% accuracy edge cases, multi-line output structure.

## [0.3.4] - 2026-03-24

### Fixed
- **Removed phantom Round Insights API reference** — README documented 5 functions from `lib/insights.ts` which does not exist. The entire Round Insights section was stale (likely planned but never implemented). Removed from both the API reference and Shared Game Systems list.
- **Corrected test count** — README claimed 153 tests; actual count is 127. Updated to match `vitest run` output.

### Added
- **Display Formatters API reference** — `formatTime()`, `renderSpeed()`, and `computeGrade()` from `lib/formatters.ts` now documented in README. These were extracted in v0.2.6 but never added to the API reference.
- **Curriculum Helpers API reference** — `getItemsByCategory()` and `getItemsByLevel()` from `data/curriculum.ts` now documented in README with usage context.
- **JSDoc for curriculum helpers** — Both `getItemsByCategory()` and `getItemsByLevel()` now have full JSDoc with `@param`, `@returns`, and `@example` tags for IDE autocomplete.

## [0.3.3] - 2026-03-23

### Security
- **Content ID validation for all public write functions** — `updateItemScore()`, `saveFSRSCard()`, `getRecallMultiplier()`, `completeLevel()`, `recordMasteryAttempt()`, and `checkMastery()` now validate their `itemId`/`levelKey`/`categoryId` parameters against a strict pattern (`/^[a-zA-Z0-9_.:/-]{1,128}$/`) and reject prototype pollution keys (`__proto__`, `constructor`, `prototype`). Previously, passing `"__proto__"` as an `itemId` to `updateItemScore()` could pollute `Object.prototype` via the scores object (CWE-1321, OWASP A03).
- **`checkMastery()` deserialization hardening** — Now validates parsed mastery data with `stripDangerousKeys()`, confirms top-level object shape, and validates each attempt entry has finite `accuracy` and `timestamp` fields. Previously trusted raw `JSON.parse()` output without any validation (CWE-502), while its sibling `recordMasteryAttempt()` was already properly hardened.
- **`completeLevel()` numeric clamping** — `levelId` parameter now clamped via `safeNumber()` to prevent NaN/Infinity propagation into the `completedLevels` array.

## [0.3.2] - 2026-03-23

### Added
- **26 new tests** (101→127 total) covering previously untested critical paths across 2 new test suites
- **`item-scoring.test.ts`** — 18 tests: `updateItemScore` isolation (new/existing items, accumulation, lastSeen updates, field preservation), `getItemsForReview` fallback sort order (oldest-seen first, excludes strong items, empty result when all mastered, FSRS priority over naive fallback), `getDueItems` edge cases (empty/future-due/limit), `getRecallMultiplier` exact boundary conditions (6.96d→1×, 7d→2×, 29d→2×, 30d→3×)
- **`enrichment-integration.test.ts`** — 8 tests: enrichment field integrity validation (required fields present, proTip optional but non-empty), enrichment-less items in difficulty analysis, `selectItems` oldest-seen prioritization (timestamp ordering, unseen-always-first guarantee), cross-module integration (storage→difficulty→selection promotion flow, confidence with mixed tiers, curriculum→difficulty engine compatibility)

## [0.3.1] - 2026-03-21

### Added
- **21 new tests** (80→101 total) targeting untested critical paths in the adaptive difficulty engine and curriculum helpers
- **`difficulty-edge-cases.test.ts`** — 16 tests covering: rolling window cap (only 5 most recent scores per tier), per-tier streak computation, `computeRecommendation` boundary conditions (exact 50%/85% thresholds, hard-only data with poor performance, missing tier data fallthrough), tier fallback ordering (medium→hard→easy reaches all tiers, easy/hard only reach adjacent), item exhaustion, deduplication, explicit profile bypass, orphaned score handling
- **`curriculum.test.ts`** — 5 tests covering: `getItemsByCategory` (valid/invalid), `getItemsByLevel` (valid/invalid), and curriculum data integrity (unique IDs, required fields, non-empty levels)

### Fixed
- Discovered and documented `buildTierOrder` behavior: easy-recommended players never see hard content (only adjacent tiers are searched), while medium-recommended players can access all three tiers. This is correct for a Kumon-style system but was previously undocumented.

## [0.3.0] - 2026-03-21

### Added
- **Adaptive difficulty engine** (`lib/difficulty.ts`) — Kumon-style diagnostic placement that analyzes rolling accuracy per difficulty tier (easy/medium/hard). Promotes at 85% accuracy, demotes at 50%, with configurable window size. Outputs a `DifficultyProfile` with per-tier stats and confidence level (new/low/high).
- **`selectItems()` smart picker** — selects content at the recommended difficulty, prioritizing unseen items, falling back to adjacent tiers when the target tier is exhausted.
- **`useDifficulty` React hook** (`hooks/useDifficulty.ts`) — wraps the engine with reactive state. Auto-analyzes on mount, re-analyzes after each round via `refresh()`, supports manual override via `setDifficulty()`.
- **14 new tests** (66→80 total) — full coverage of the difficulty engine: tier promotion/demotion thresholds, confidence levels, per-tier accuracy computation, item selection with fallback, unseen-item prioritization, empty catalog handling.

## [0.2.6] - 2026-03-21

### Added
- **25 new tests** (41→66 total) covering previously untested critical paths
- **`formatters.test.ts`** — 19 tests for extracted display helpers: `formatTime` edge cases (NaN, negative, Infinity, fractional seconds, multi-hour), `renderSpeed` time-vs-rate detection (case-insensitive regex, boundary values), `computeGrade` threshold boundaries (exact grade cutoffs and sub-threshold transitions)
- **6 new storage edge-case tests** — JSON syntax error recovery, null progress recovery, Infinity multiplier fallback, zero-amount XP, invalid event type rejection, level+XP integration flow

### Changed
- **Extracted `formatTime`, `renderSpeed`, `computeGrade`** from `VictoryScreen.tsx` into `lib/formatters.ts` — pure functions are now independently testable without jsdom. VictoryScreen imports from the new module with zero behavior change.

## [0.2.5] - 2026-03-20

### Added
- **JSDoc for all 21 exported functions/interfaces in `storage.ts`** — Every public API now has parameter docs, return types, usage examples, and cross-references. Enables IDE tooltips and autocomplete for game developers.
- **JSDoc for all 3 React hooks** — `useProgress`, `useGameStats`, and `useSoundEffects` now document their purpose, parameters, and usage patterns.
- **API Reference section in README** — Complete table-format reference for the storage layer (setup, XP, FSRS, streaks, mastery, analytics) and React hooks. Developers can now onboard without reading implementation code.

## [0.2.4] - 2026-03-18

### Security
- **Storage layer: input validation and data integrity hardening** — All `JSON.parse()` calls from localStorage now pass through runtime validators that strip `__proto__`/`constructor`/`prototype` keys (prevents prototype pollution, CWE-502), clamp numeric fields to safe bounds (prevents NaN/Infinity propagation, CWE-20), and reject non-conforming shapes.
- **`configureStorage()`: game ID sanitization** — Rejects IDs with special characters, path traversal sequences, or excessive length (1-64 alphanumeric/hyphen/underscore only). Prevents localStorage key injection (OWASP A03).
- **`addXP()`: numeric bounds enforcement** — Amount clamped to 0–100,000 and multiplier to 0–10. Negative, NaN, and Infinity values safely rejected.
- **`recordMasteryAttempt()`: accuracy clamping** — Bounded to 0–100 with type validation on parsed mastery data.
- **`getFSRSCards()`: array element validation** — Parsed entries must have `itemId` (string), `due` (finite number), and `stability` (finite number). Malformed entries silently filtered.
- **`recordLearningEvent()`: event type whitelist** — Only the 5 defined event types are accepted; unknown types are silently dropped.

### Added
- 8 security-focused tests: prototype pollution defense, negative value clamping, corrupted localStorage recovery, malformed FSRS card rejection, game ID injection prevention (41 total, up from 33)

## [0.2.2] - 2026-03-15

### Fixed
- **VictoryScreen timer rendering** — Time-based speed values now render as `m:ss` format instead of raw seconds. Detects time-based metrics via `speedLabel` pattern matching (e.g., "Time", "Elapsed"). Guards against NaN, negative, and Infinity values from corrupted timer state, rendering "—" as fallback.
- **Timer division-by-zero** — `Timer` percentage bar now guards against `duration === 0` to prevent `NaN` width on the progress bar.

## [0.2.1] - 2026-03-14

### Changed
- **Storage layer: configurable game ID** — Replaced hardcoded `GAME_ID` constant with `configureStorage(id)` + `getGameId()` API. Games call `configureStorage("my_game")` once at init instead of editing source. All localStorage keys now derived dynamically via `storageKey()` helper.
- **Analytics: implemented stub metrics** — `averageTimeToMastery` now computed from `first_correct` → `concept_mastered` event timestamps per item. `retentionRate30Day` now computed from 30-day review events (was hardcoded to 0).
- **Removed dead code** — Removed unused `STREAK_FREEZE_KEY` constant (streak freezes are stored inside the progress object, never had a separate key).

### Added
- 4 new tests: `configureStorage` namespace isolation, `averageTimeToMastery` computation, `retentionRate30Day` computation (33 total, up from 29)

## [0.1.2] - 2026-03-13

### Added
- **Vitest test suite** for `storage.ts` persistence layer (29 tests)
- Test coverage: XP system, recall multipliers, streak freezes, mastery gates, FSRS card CRUD, review queue fallback, learning analytics, reset
- Edge cases: multi-day streak gaps, freeze consumption, analytics event trimming, duplicate level completion guard

### Changed
- Added `test` script to `package.json`
- Added `vitest` as dev dependency

## [0.2.0] - 2026-03-11

### Added
- Complete suite documentation: all 10 games with repo links, live URLs, and descriptions
- 4 tech fundamentals games added to README: API Architect, Netrunner, CyberShield, Circuit Prophet
- Per-game live deployment links for all 10 games
- Getting Started section for scaffolding new games from template

### Changed
- README rewritten from 6-game spec overview to full 10-game suite showcase
- License changed to MIT

## [0.1.1] - 2026-03-11

### Fixed
- **Streak freeze multi-day gap**: Streak freezes now calculate actual days missed instead of only checking "yesterday". Previously, missing 3 days with 1 freeze would still preserve the streak — now it correctly requires enough freezes to cover the full gap.
- **Recall multiplier first-time detection**: `getRecallMultiplier` no longer conflates "never seen" items with "seen but always answered wrong" items. Players who previously failed an item now correctly get recall bonuses when they return to it after 7/30 days.
- **Timer onTimeUp called during render**: Moved `onTimeUp` callback out of `setState` updater using `queueMicrotask` and a ref pattern to prevent stale closures and state updates during React's render phase.

## [0.1.0] - 2025-02-20

### Added
- Master specification with 6 game designs
- Shared game template (Next.js 16 + Tailwind v4 + TypeScript)
- Persistence layer with localStorage (SSR-safe)
- XP system with delayed recall rewards
- Streak system with freeze mechanic
- FSRS-4.5 spaced repetition integration
- Mastery gate system
- Learning analytics tracking
- Sound effects via Web Audio API
- Retro UI components (Button, XPBar, StreakBadge, Timer, VictoryScreen)
