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
- **Testing**: Vitest (65+ tests — storage layer, security hardening, curriculum helpers, edge cases, all passing)
- **Deployment**: Vercel (all 10 games live)

## Shared Game Systems

Every game inherits from the `template/` directory:

- **XP + Leveling** — 100 XP/level with delayed recall rewards (1x/2x/3x multiplier)
- **Daily Streak** — freeze system (earn 1 freeze per 10 levels, max 3)
- **FSRS-4.5 Spaced Repetition** — scientifically-backed review scheduling
- **Mastery Gates** — Kumon-style: 90% on last 3 attempts to advance
- **8-bit Sound Effects** — Web Audio API synthesis (no external files)
- **CRT Overlay** — retro scanlines + neon glow UI theme
- **Accessibility** — WCAG 2.2 AA compliant
- **Analytics** — retention tracking, mastery metrics, per-question stats

## Security

The storage layer includes runtime hardening against client-side attacks:

- **Prototype pollution defense** — `__proto__`, `constructor`, and `prototype` keys are stripped from all parsed localStorage data
- **Input validation** — Numeric fields (XP, accuracy, multiplier) are clamped to safe bounds; NaN/Infinity/negative values are rejected
- **Game ID sanitization** — `configureStorage()` only accepts alphanumeric/hyphen/underscore IDs (1-64 chars), preventing localStorage key injection
- **Schema validation** — FSRS cards, mastery data, and analytics events are validated against expected shapes before use
- **Event type whitelist** — Only the 5 defined learning event types are accepted

## Repo Structure

```
passion-learning-suite/
├── MASTER_SPEC.md           # Full pedagogy + architecture specification
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
        ├── hooks/           # useProgress, useGameStats, useSoundEffects
        ├── lib/             # Storage layer (localStorage)
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

### React Hooks

| Hook | Description |
|------|-------------|
| `useProgress(categories?)` | Reactive player state with memoized XP, level, streak, and unlock actions. |
| `useGameStats()` | Real-time session tracker: accuracy, correct/incorrect counts, elapsed time. |
| `useSoundEffects()` | 8-bit Web Audio API sounds with volume controls and localStorage persistence. |

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
