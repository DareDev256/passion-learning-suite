# Changelog

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
