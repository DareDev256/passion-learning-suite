# Changelog

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
