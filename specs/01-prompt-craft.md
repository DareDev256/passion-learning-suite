# Prompt Craft — Game Spec

## Identity
- **Repo name**: `prompt-craft`
- **Full title**: PROMPT CRAFT
- **Subtitle**: Master the Art of Talking to AI
- **Tagline**: CRAFT PROMPTS. SHAPE AI.

## What It Teaches
Prompt engineering — the single most transferable AI skill. How to write effective prompts using the COSTAR framework (Context, Objective, Style, Tone, Audience, Response format).

## Theme
- **Palette**: Cyberpunk forge — `--game-primary: #ff8c00` (amber), `--game-secondary: #ff4500` (deep orange), `--game-accent: #ffd700` (gold), `--game-dark: #1a0f00`
- **Aesthetic**: Forging/crafting metaphors. The player is a prompt smith. Sparks, anvil imagery, molten metal glow.
- **References**: Monster Hunter crafting UI, Skyrim smithing, cyberpunk forge aesthetics

## Core Mechanic
1. Player sees a **goal** (e.g., "Get the AI to explain quantum computing to a 10-year-old")
2. Player writes a prompt in a text area
3. The game **scores** the prompt on 6 COSTAR dimensions (0-5 each, max 30)
4. Based on score, shows a **simulated AI response** (pre-written: bad/ok/good/excellent tier)
5. Shows breakdown: which COSTAR elements were present, which were missing
6. Enrichment: shows the "master prompt" (ideal version) with explanation

## Scoring Algorithm
```
For each COSTAR dimension, check if the player's prompt contains:
- Context: mentions background/situation (keywords: "you are", "given that", "context:")
- Objective: clear task statement (keywords: "write", "explain", "create", "generate")
- Style: writing style specified (keywords: "formal", "casual", "technical", "simple")
- Tone: emotional tone specified (keywords: "friendly", "professional", "enthusiastic")
- Audience: target reader mentioned (keywords: "for a", "aimed at", "targeting")
- Response format: output structure specified (keywords: "bullet points", "paragraph", "list", "step by step")

Score 0-5 per dimension based on specificity and quality.
```

## Categories (Chapters)
1. **Basic Prompts** — Single clear instruction (easy)
2. **Context Setting** — Adding background info (easy)
3. **Role Assignment** — "You are a..." patterns (medium)
4. **COSTAR Framework** — Full structured prompts (medium)
5. **Chain of Thought** — Step-by-step reasoning prompts (medium)
6. **Few-Shot Examples** — Teaching by example (hard)
7. **Constraint Engineering** — Setting boundaries and guardrails (hard)
8. **Multi-Turn Strategy** — Building on previous outputs (hard)

## Levels Per Category
5 levels each, 5 items per level = 200 total prompt challenges

## Progression
- Levels 1-5: One-sentence goals, score threshold 10/30 to pass
- Levels 6-15: Multi-part goals, score threshold 18/30
- Levels 16-25: Complex scenarios, score threshold 24/30
- Levels 26-40: Expert challenges, need 27/30 (near-perfect COSTAR coverage)

## Unique UI Elements
- **COSTAR radar chart** — 6-axis visualization showing prompt quality
- **Forge meter** — Fills up as score increases, with spark particles at thresholds
- **Response preview** — Split view: left = your prompt, right = simulated AI output
- **Master prompt reveal** — After scoring, option to see the ideal prompt with diff highlights

## Sample Curriculum Items
```
{
  id: "bp-001",
  prompt: "Goal: Get AI to write a haiku about coding",
  answer: "Write a haiku (5-7-5 syllable pattern) about the experience of debugging code late at night. Use vivid imagery.",
  category: "basic-prompts",
  difficulty: "easy",
  enrichment: {
    whyItMatters: "Even simple creative tasks benefit from specificity. 'Write a haiku about coding' gives the AI too much freedom — you'll get generic results.",
    realWorldExample: "Content creators who specify tone, format, and angle get 3x better first-draft outputs from AI.",
    proTip: "The more constraints you give, the more creative the AI gets. Constraints are creative fuel, not limitations."
  }
}
```

## Mobile Considerations
- Text area must be comfortable to type in on mobile
- COSTAR radar chart scales down to fit phone width
- Score breakdown collapses into expandable sections on small screens
