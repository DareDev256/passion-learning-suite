# Passionate Learning Suite

A suite of web-based educational games that teach Gen AI and tech concepts through actual gameplay. Each game uses a shared template (Next.js 16 + Tailwind v4 + TypeScript + Framer Motion) with unique mechanics, curriculum, and theme.

## Games

| # | Game | Teaches | Theme |
|---|------|---------|-------|
| 1 | Prompt Craft | Prompt engineering | Cyberpunk forge |
| 2 | Token Prophet | How LLMs work | Oracle/mystical |
| 3 | Hallucination Hunter | AI output evaluation | Noir detective |
| 4 | Bias Buster | AI ethics | Scales of justice |
| 5 | Tool Match | AI tool selection | Workshop/toolbench |
| 6 | Red Team Arena | AI safety | Hacker terminal |

## Tech Stack

- **Framework**: Next.js 16 + React 19 + TypeScript (strict)
- **Styling**: Tailwind CSS v4 (CSS-first `@theme inline`)
- **Animation**: Framer Motion
- **Font**: Press Start 2P (pixel)
- **Spaced Repetition**: ts-fsrs (FSRS-4.5)
- **Persistence**: localStorage (SSR-safe)
- **Deployment**: Vercel

## Shared Template Systems

- XP + leveling (100 XP/level) with delayed recall rewards (1x/2x/3x)
- Daily streak with freeze system (earn 1 freeze per 10 levels)
- FSRS-4.5 spaced repetition scheduling
- Kumon-style mastery gates (90% on last 3 attempts)
- Web Audio API sound effects (no external files)
- CRT overlay + neon glow retro UI
- WCAG 2.2 AA accessibility
- Learning analytics (retention tracking, mastery metrics)

## Setup

```bash
cd template
npm install
npm run dev
```

## Project Structure

```
├── MASTER_SPEC.md          # Full specification
├── specs/                  # Per-game specifications
│   ├── 01-prompt-craft.md
│   ├── 02-token-prophet.md
│   ├── 03-hallucination-hunter.md
│   ├── 04-bias-buster.md
│   ├── 05-tool-match.md
│   └── 06-red-team-arena.md
└── template/               # Shared game template
    └── src/
        ├── components/     # UI + game components
        ├── hooks/          # useProgress, useGameStats, useSoundEffects
        ├── lib/            # storage (persistence layer)
        ├── data/           # curriculum template
        └── types/          # shared type definitions
```

## License

Private — DareDev256
