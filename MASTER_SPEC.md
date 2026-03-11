# Passionate Learning — Master Specification

## Vision
A suite of 6 web-based educational games that teach Gen AI concepts through actual gameplay. Built by Passion Agent autonomously. Each game uses the shared template (Next.js 16 + Tailwind v4 + TypeScript + Framer Motion) with unique mechanics, curriculum, and theme.

**Target audience**: Adults learning about AI from non-traditional backgrounds. Think: someone who games, appreciates street culture, and wants to understand AI without reading a textbook.

**Design philosophy**: Brilliant.org (problem-first, discover-then-explain) + Kumon (micro-incremental mastery, diagnostic placement) + Duolingo (streaks, loss aversion, 5-min sessions) + LeapFrog (safe failure, multi-modal reinforcement).

**Core pedagogical principle**: NEVER explain a concept before the player encounters it. Present the puzzle first, let them try, THEN reveal the theory. Discovery learning > passive instruction.

**Framework alignment**: Covers all 4 UNESCO AI Competency domains (Human-Centred AI, Ethics of AI, AI Techniques & Applications, AI System Design) and all 4 OECD AILit capabilities (Use, Understand, Create With, Critically Engage).

---

## Shared Architecture

### Tech Stack (every game)
- Next.js 16 + React 19 + TypeScript (strict)
- Tailwind CSS v4 (CSS-first `@theme inline`)
- Framer Motion for animations
- `@fontsource/press-start-2p` pixel font
- `ts-fsrs` — Free Spaced Repetition Scheduler (research-grade, 20-30% more efficient than SM-2)
- localStorage persistence (SSR-safe)
- Vercel deployment
- PWA-ready (service worker, offline support, install prompt after 3 sessions)

### Shared Systems (from template)
1. **Progression**: XP + levels (100 XP/level), chapter → level gating, mastery gates (90% accuracy on last 3)
2. **Persistence**: Pure-function localStorage layer with SSR guards, merge-on-read forward compat
3. **Streaks**: Daily streak with streak freeze (earn 1 freeze per 10 levels completed). Loss aversion > punishment.
4. **Stats**: Real-time accuracy, speed tracking, per-item score history
5. **Spaced Repetition**: FSRS-4.5 via `ts-fsrs` — tracks difficulty, stability, retrievability per item. Schedules reviews at optimal recall probability. Fuzzing enabled to prevent predictable patterns.
6. **Delayed Rewards**: Biggest XP bonuses come from successful 7-day and 30-day recall, not first exposure. 1x XP on first correct → 2x on 7-day recall → 3x on 30-day recall.
7. **Sound Design**: Ascending chime on correct, soft low tone on incorrect (NOT a buzzer), celebration chord on level complete, optional lo-fi ambient during play. Mute toggle + per-category volume controls.
8. **UI Shell**: CRT overlay, neon glow utilities, pixel borders, retro buttons, staggered motion entrance
9. **Accessibility (WCAG 2.2 AA)**: Full keyboard navigation, ARIA labels, `prefers-reduced-motion` support, 4.5:1 color contrast, colorblind mode toggle, visible focus indicators, no keyboard traps
10. **Learning Analytics**: Track pre/post concept mastery, error patterns, time-to-mastery, retention decay (1/7/30 day), drop-off points. Separate "are they playing?" from "are they learning?"

### Content Atom (every game adapts this)
```ts
interface ContentItem {
  id: string;
  prompt: string;      // what the player sees
  answer: string;      // correct response (varies by game type)
  category: string;    // chapter/topic grouping
  difficulty: "easy" | "medium" | "hard";
  enrichment?: {
    whyItMatters: string;
    realWorldExample: string;
    proTip?: string;
  };
}
```

### Per-Game Customization Points
- `:root` color tokens (unique palette per game)
- Game mode components (unique mechanics)
- Curriculum data file (unique content)
- Landing page background effect (unique visual)
- Category/chapter definitions (unique topic tree)

---

## The 6 Games

### 1. Prompt Craft (`prompt-craft`)
**Teaches**: Prompt engineering — the single most transferable AI skill
**Mechanic**: Player gets a goal ("Get AI to write a professional email declining a meeting"). Write a prompt. Scored on specificity, context, tone, COSTAR coverage.
**Progression**: Single-sentence prompts → multi-part COSTAR prompts over 20+ levels
**Theme**: Cyberpunk forge — neon orange/amber, crafting metaphors
**Unique**: Simulated AI responses (pre-written good/bad outputs based on prompt quality tiers)

### 2. Token Prophet (`token-prophet`)
**Teaches**: How LLMs actually work — token prediction, probability, context windows
**Mechanic**: See a partial sentence, predict the next token. Reveals probability distributions after each guess. Multiple valid answers with different probabilities.
**Progression**: Obvious completions → ambiguous contexts → technical jargon → creative writing
**Theme**: Oracle/mystical — deep purple/gold, crystal ball vibes
**Unique**: Probability visualization (bar charts showing top-5 token probabilities)

### 3. Hallucination Hunter (`hallucination-hunter`)
**Teaches**: AI output evaluation — detecting hallucinations, verifying claims, spotting bias
**Mechanic**: Read AI-generated text, click/highlight false claims. Time pressure. Detective rank system.
**Progression**: Obvious fabrications → subtle errors → domain-specific hallucinations
**Theme**: Noir detective — dark blue/red, magnifying glass motifs
**Unique**: Highlight-to-select mechanic (click on the specific false claim in a paragraph)

### 4. Bias Buster (`bias-buster`)
**Teaches**: AI ethics — bias in training data, fairness in AI deployment, responsible AI
**Mechanic**: Branching narrative scenarios. Make decisions about AI deployment (hiring, lending, content mod). See consequences play out over multiple rounds.
**Progression**: Clear-cut bias → nuanced edge cases → systemic issues
**Theme**: Scales of justice — teal/amber, balanced design
**Unique**: No "game over" — every path teaches. Consequence trees that reveal impact over time.

### 5. Tool Match (`tool-match`)
**Teaches**: Practical AI tool selection — when to use which tool, what AI is bad at
**Mechanic**: Task description appears, drag-match to the right AI tool/approach. Speed + accuracy. Some tasks are "AI shouldn't do this."
**Progression**: Obvious mismatches → nuanced tool selection → multi-tool workflows
**Theme**: Workshop/toolbench — warm gray/electric blue, clean industrial
**Unique**: "Not AI" option — some tasks should NOT use AI, and recognizing that earns bonus XP

### 6. Red Team Arena (`red-team-arena`)
**Teaches**: AI safety — prompt injection, jailbreaks, guardrails, security
**Mechanic**: Given a constrained AI system, try to make it break its rules. Write adversarial prompts. Score based on how cleverly you bypassed guardrails.
**Progression**: Basic injection → context manipulation → role-play attacks → multi-step chains
**Theme**: Hacker terminal — green-on-black, matrix rain, monospace everything
**Unique**: The game IS the AI system — pre-built "AI personas" with specific guardrails to bypass

---

## Build Order (Passion Agent)

### Phase 1: Foundation (Games 1-2) — AI Literacy
- **Prompt Craft** — Most straightforward mechanics (text input → scoring)
- **Token Prophet** — Simple mechanic with visual feedback (prediction + probability bars)

### Phase 2: Detection (Games 3-4) — AI Literacy
- **Hallucination Hunter** — Click/highlight mechanic (more complex UI)
- **Bias Buster** — Branching narrative (state management complexity)

### Phase 3: Applied (Games 5-6) — AI Literacy
- **Tool Match** — Drag-and-drop (interaction complexity)
- **Red Team Arena** — Simulated AI system (most complex, needs good content)

### Phase 4: Tech Fundamentals (Games 7-10)
- **API Architect** — REST API design challenges (method/endpoint/status matching, debug mode)
- **NetRunner** — Networking fundamentals (OSI layers, subnetting, port matching, troubleshooting)
- **CyberShield** — Cybersecurity essentials (threat classification, defense, crypto, incident response)
- **Circuit Prophet** — Electrical & hardware basics (Ohm's Law calculations, logic gates, CPU architecture)

### Per-Game Build Steps
1. `feat`: Scaffold from template, apply theme, create landing page
2. `feat`: Implement core game mechanic + first 5 levels of curriculum
3. `feat`: Add progression system (chapters, levels, mastery gates)
4. `feat`: Polish — animations, sound effects, victory screens, mobile responsive
5. `feat`: Complete curriculum (20+ levels across all categories)
6. `tests`: Add core game logic tests
7. `docs`: README with screenshots, setup, curriculum overview

---

## Passion Agent Integration

### Approval Tier: `watched`
Auto-merge + detailed Discord notification. James sees everything but doesn't need to approve.

### Creative Context Template
Each game gets a `creative_context` in Passion config with:
- `domain`: "educational browser game"
- `aesthetic`: per-game theme description
- `references`: visual/UX inspiration
- `anti_patterns`: what to avoid
- `target_audience`: "adults learning AI from non-traditional backgrounds"
- `vibe`: one-liner

### Task Injection
Phase 1 games get immediate `feat` tasks in task-queue.json. Phase 2-3 queue after Phase 1 builds verify.

---

## Key Design Rules (Research-Backed)

### Problem-First Learning (from Brilliant.org)
- NEVER explain before play. Show the scenario, let player try, THEN reveal theory.
- Single-concept per challenge. No multi-concept overload.
- Instant custom feedback based on WHAT the player chose, not generic "wrong."
- Tactile interactions (drag, type, click) over passive reading.

### Micro-Learning (from peer-reviewed meta-analysis)
- 5-10 minute sessions, 3-5 times weekly = optimal retention
- Microlearning improves retention 25-60% vs traditional methods
- Combined with spaced repetition: up to 300% better retention
- Exception: Bias Buster and Red Team Arena need depth — each decision is micro (2-3 min), but consequence chains span multiple sessions.

### Misconceptions to Target (from AI literacy research)
Each game should explicitly counter these documented misconceptions:
1. "AI knows things" (Token Prophet) — AI predicts text, it doesn't know facts
2. "AI is always accurate" (Hallucination Hunter) — AI confidently generates false info
3. "Good AI = no bias" (Bias Buster) — Bias is inherent in training data
4. "AI just understands me" (Prompt Craft) — Prompt structure matters enormously
5. "ChatGPT = all AI" (Tool Match) — Many tools for many jobs
6. "AI guardrails are foolproof" (Red Team Arena) — Security requires continuous testing

### Accessibility Requirements (WCAG 2.2 AA)
- Full keyboard control (Tab, Enter, Arrow keys)
- ARIA labels on all interactive elements
- 4.5:1 color contrast for text, 3:1 for large text
- `prefers-reduced-motion` respected (fade instead of slide)
- Never convey info by color alone
- Colorblind mode toggle
- No content flashing >3 times/second

### Sound Design Principles
- Correct: short ascending chime (positive, not loud)
- Incorrect: soft low tone (informative, not punishing)
- Level complete: satisfying chord progression
- Streak milestone: layered celebration
- Ambient: optional lo-fi during play
- Always: mute button, independent volume controls

---

## Success Criteria
- Each game is deployable to Vercel standalone
- 5-minute play sessions feel complete
- Zero AI API keys required to play (all content is pre-written)
- Mobile responsive (games work on phone)
- Each game teaches at least one concept the player didn't know before
- Consistent DareDev256 brand quality across all 6
- Full keyboard navigation works end-to-end
- `prefers-reduced-motion` degrades gracefully
- Pre/post mastery tracking proves learning outcomes
- Maps to UNESCO/OECD AI literacy frameworks (marketable to organizations)

---

## Monetization / Distribution Angles (Future)
- **EU AI Act compliance**: Article 4 now LEGALLY requires AI literacy for anyone deploying AI. These games are a compliance tool.
- **Corporate training**: Package as "AI Literacy Training Suite" — covers all OECD competency domains.
- **Shareable results**: Score cards for social media ("I caught 8/10 hallucinations — can you?")
- **Micro-credentials**: Completion certificates per game, "AI Literate" badge for completing all 6.
