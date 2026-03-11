# Bias Buster — Game Spec

## Identity
- **Repo name**: `bias-buster`
- **Full title**: BIAS BUSTER
- **Subtitle**: AI Ethics in Your Hands
- **Tagline**: EVERY DECISION HAS CONSEQUENCES

## What It Teaches
AI ethics — bias in training data, fairness in deployment, responsible AI use. Not preachy — experiential. Players feel the consequences of biased AI.

## Theme
- **Palette**: Scales of justice — `--game-primary: #1abc9c` (teal), `--game-secondary: #f39c12` (amber), `--game-accent: #bdc3c7` (silver), `--game-dark: #0a1510`
- **Aesthetic**: Balanced, institutional. Scales imagery, document/policy feel, newspaper headlines showing consequences.
- **References**: Reigns (card-swipe decision game), Bandersnatch, Ace Attorney verdict screens

## Core Mechanic
1. Player is presented with a **scenario** (e.g., "Your company wants to use AI for resume screening")
2. Two to three **decision options** appear (not obviously right/wrong)
3. Player picks one
4. Game shows **immediate consequence** + **long-term consequence** (2-3 rounds later)
5. Some decisions cascade — early choices affect what scenarios appear later
6. No game over — every path teaches something different

## Scoring
```
Impact Score: +/- based on fairness outcome
  Equitable outcome: +10
  Mixed outcome: +5
  Harmful outcome: +2 (you still learn)
Awareness Bonus: +5 for identifying WHY a decision was harmful in post-round reflection
Combo: Consecutive equitable decisions multiply score
```

## Categories (Scenario Domains)
1. **Hiring & Recruitment** — Resume screening, interview scheduling, skill assessment (easy)
2. **Content Moderation** — What gets flagged, who gets silenced, cultural context (easy)
3. **Financial Services** — Loan approval, credit scoring, insurance pricing (medium)
4. **Healthcare** — Diagnosis assistance, triage priority, treatment recommendations (medium)
5. **Criminal Justice** — Risk assessment, surveillance, predictive policing (hard)
6. **Education** — Student evaluation, personalized learning, academic integrity (hard)
7. **Systemic Issues** — Training data bias, feedback loops, representation gaps (hard)
8. **Your AI, Your Rules** — Design-an-AI-policy scenarios where player sets the rules (hard)

## Levels Per Category
3 levels each, each level is a 5-decision scenario chain = 120 total decisions

## Unique UI Elements
- **Decision cards** — Swipeable cards (left/right/center) like Reigns
- **Consequence ticker** — Breaking news style banner showing the outcome of your decision
- **Stakeholder panel** — Shows how different groups are affected (icons for applicants, company, public)
- **Ethics radar** — 4-axis chart: Fairness, Transparency, Privacy, Accountability
- **Timeline** — Shows how your decisions cascaded over time

## Sample Curriculum Items
```
{
  id: "hr-001",
  prompt: "Your startup is growing fast. HR wants to use an AI tool to screen 500 resumes for a software engineering role. The AI was trained on your company's last 3 years of successful hires.",
  answer: "audit", // Best answer, but others teach too
  category: "hiring-recruitment",
  difficulty: "easy",
  decisions: [
    {
      id: "deploy",
      label: "Deploy it — we need to move fast",
      immediateResult: "The AI screens 500 resumes in 2 minutes. 50 candidates advance.",
      longTermResult: "3 months later: all 50 candidates look identical. Zero diversity in the hire pool. A rejected candidate files a discrimination complaint.",
      impactScore: 2,
      lesson: "AI trained on historical data inherits historical biases. If your past hires lacked diversity, the AI will perpetuate that."
    },
    {
      id: "audit",
      label: "Audit the training data first",
      immediateResult: "You spend 2 weeks analyzing the training data. You discover 87% of 'successful hires' were from 3 universities.",
      longTermResult: "You retrain with balanced criteria. Hiring takes longer but produces a more diverse, effective team. No complaints.",
      impactScore: 10,
      lesson: "Auditing training data before deployment catches bias before it causes harm. The 2-week delay saved months of damage control."
    },
    {
      id: "hybrid",
      label: "Use AI for initial screen, humans review all rejections",
      immediateResult: "AI screens resumes. Humans catch some rejected candidates that look strong. But it's still 400 rejections to review.",
      longTermResult: "Better than full automation, but humans only catch obvious misses. Subtle bias patterns pass through unchecked.",
      impactScore: 5,
      lesson: "Human-in-the-loop helps but doesn't solve root cause. If the AI's criteria are biased, human reviewers may share those biases."
    }
  ],
  enrichment: {
    whyItMatters: "Amazon built an AI hiring tool in 2018 that systematically downranked women's resumes. They scrapped it entirely.",
    realWorldExample: "Amazon's AI penalized resumes containing the word 'women's' (as in 'women's chess club captain'). It learned this from 10 years of male-dominated hiring data.",
    proTip: "The question isn't 'is AI biased?' — it's 'what biases does this specific AI have, and do we accept them?'"
  }
}
```

## Extended Type
```ts
interface Decision {
  id: string;
  label: string;
  immediateResult: string;
  longTermResult: string;
  impactScore: number;
  lesson: string;
}

interface BiasScenario extends ContentItem {
  decisions: Decision[];
}
```

## Mobile Considerations
- Decision cards work well with swipe gestures on mobile
- Consequence text should be concise (2-3 sentences max)
- Stakeholder panel collapses to icons-only on small screens
