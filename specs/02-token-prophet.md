# Token Prophet — Game Spec

## Identity
- **Repo name**: `token-prophet`
- **Full title**: TOKEN PROPHET
- **Subtitle**: See How AI Thinks
- **Tagline**: PREDICT THE NEXT TOKEN

## What It Teaches
How LLMs actually work — token prediction, probability distributions, context windows, temperature. Demystifies AI, kills magical thinking.

## Theme
- **Palette**: Oracle/mystical — `--game-primary: #9b59b6` (purple), `--game-secondary: #f1c40f` (gold), `--game-accent: #e8daef` (lavender), `--game-dark: #0d0015`
- **Aesthetic**: Crystal ball, oracle, mystical prediction. Stars, constellation patterns, glowing orbs.
- **References**: FTL: Faster Than Light UI, Celeste menu design, astrology app aesthetics

## Core Mechanic
1. Player sees a **partial sentence** (e.g., "The capital of France is")
2. Player must **type or select** the most likely next token
3. After answering, game reveals the **probability distribution** — top 5 most likely tokens with percentages
4. Points awarded based on how probable the chosen token was (not just right/wrong)
5. Multiple valid answers — picking the #1 token = max points, #2 = good points, etc.

## Scoring
```
#1 most probable token: 10 points
#2: 7 points
#3: 5 points
#4: 3 points
#5: 1 point
Not in top 5: 0 points (but you learn what was!)
```

## Categories
1. **Obvious Completions** — "The cat sat on the ___" (easy)
2. **Common Phrases** — "Break a ___" (easy)
3. **Factual Knowledge** — "The capital of Japan is ___" (medium)
4. **Technical Context** — "In Python, to open a file you use ___" (medium)
5. **Ambiguous Context** — Sentences where multiple tokens are equally valid (medium)
6. **Temperature Effects** — Same prompt, different "temperatures" (creative vs deterministic) (hard)
7. **Context Window** — Long passages where early context changes the prediction (hard)
8. **Tokenization Tricks** — Words that tokenize unexpectedly ("ChatGPT" = multiple tokens) (hard)

## Levels Per Category
5 levels each, 5 items per level = 200 total predictions

## Unique UI Elements
- **Probability bars** — Horizontal bar chart showing top-5 token probabilities, animated reveal
- **Token highlight** — Shows how text is split into tokens (color-coded)
- **Crystal ball** — Central visual element that glows brighter with consecutive correct answers
- **Temperature slider** — In advanced levels, player adjusts temperature and sees how probabilities shift

## Sample Curriculum Items
```
{
  id: "oc-001",
  prompt: "The cat sat on the",
  answer: "mat",
  category: "obvious-completions",
  difficulty: "easy",
  // Additional field for this game:
  probabilities: [
    { token: "mat", probability: 0.45 },
    { token: "floor", probability: 0.20 },
    { token: "couch", probability: 0.15 },
    { token: "bed", probability: 0.10 },
    { token: "table", probability: 0.05 }
  ],
  enrichment: {
    whyItMatters: "LLMs predict the next token based on patterns in training data. 'The cat sat on the mat' is so common that 'mat' dominates the probability distribution.",
    realWorldExample: "This is exactly what happens when your phone suggests the next word. It's running a tiny language model doing token prediction.",
    proTip: "The 'temperature' setting controls how adventurous the model is. Low temperature = always picks 'mat'. High temperature = might pick 'chandelier'."
  }
}
```

## Extended Type
```ts
interface TokenProphetItem extends ContentItem {
  probabilities: { token: string; probability: number }[];
}
```

## Mobile Considerations
- Probability bars must be readable on small screens (horizontal, not vertical)
- Token input can be either typing or selection from a list (toggle in settings)
