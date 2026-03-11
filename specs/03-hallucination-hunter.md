# Hallucination Hunter — Game Spec

## Identity
- **Repo name**: `hallucination-hunter`
- **Full title**: HALLUCINATION HUNTER
- **Subtitle**: Don't Trust. Verify.
- **Tagline**: SPOT THE LIE

## What It Teaches
AI output evaluation — detecting hallucinations, verifying claims, spotting confident nonsense. The critical thinking skill that prevents real harm.

## Theme
- **Palette**: Noir detective — `--game-primary: #e74c3c` (red), `--game-secondary: #2c3e50` (dark blue), `--game-accent: #ecf0f1` (light gray), `--game-dark: #0a0a15`
- **Aesthetic**: Detective noir. Magnifying glass, case files, redacted documents, spotlight effects.
- **References**: Papers Please UI, Return of the Obra Dinn, noir film aesthetics

## Core Mechanic
1. Player reads an **AI-generated passage** (1-3 paragraphs)
2. Passage contains **highlighted claims** (clickable spans)
3. Player must **click on the false claims** and mark them as hallucinated
4. After submitting, game reveals which claims were true vs hallucinated
5. Score based on: correctly identified hallucinations + correctly left true claims alone

## Scoring
```
True positive (correctly flagged hallucination): +15 points
True negative (correctly left true claim): +5 points
False positive (flagged a true claim): -10 points
False negative (missed a hallucination): -5 points
```
This rewards precision AND recall. Trigger-happy flagging is punished.

## Categories
1. **Obvious Fabrications** — Fake dates, wrong capitals, invented people (easy)
2. **Plausible But Wrong** — Close to true but factually incorrect (easy)
3. **Number Hallucinations** — Statistics, percentages, counts that are made up (medium)
4. **Citation Hallucinations** — Fake paper titles, wrong authors, invented journals (medium)
5. **Subtle Conflation** — True facts about X attributed to Y (hard)
6. **Confident Nonsense** — Grammatically perfect, completely fabricated technical content (hard)
7. **Mixed Truth** — Paragraphs where hallucinations are sandwiched between true claims (hard)
8. **Domain Traps** — Content that sounds right if you don't know the domain (hard)

## Levels Per Category
5 levels each, 3 passages per level = 120 total passages with ~500 claims

## Unique UI Elements
- **Claim highlighting** — Clickable spans in the passage that toggle red (flagged) / green (cleared)
- **Magnifying glass cursor** — Custom cursor that magnifies text on hover
- **Case file** — Results displayed as a detective case file with verdicts per claim
- **Detective rank** — Junior Detective → Detective → Senior Detective → Chief → Legendary Hunter
- **Evidence board** — After each round, shows connections between claims (which ones should have been suspicious)

## Sample Curriculum Items
```
{
  id: "of-001",
  prompt: "According to a 2023 study by MIT, [the average person encounters 47 AI-generated images per day without knowing it]{claim-1}. [The study was published in Nature Machine Intelligence]{claim-2} and [surveyed over 10,000 participants across 15 countries]{claim-3}. [Researchers found that most people could only identify AI images 38% of the time]{claim-4}.",
  answer: "claim-1,claim-2,claim-3",  // These are the hallucinations
  // claim-4 is approximately true (real studies show ~40% detection rate)
  category: "obvious-fabrications",
  difficulty: "easy",
  claimAnnotations: {
    "claim-1": { isHallucination: true, explanation: "This specific statistic is fabricated. No MIT study established this number." },
    "claim-2": { isHallucination: true, explanation: "No such study was published in Nature Machine Intelligence." },
    "claim-3": { isHallucination: true, explanation: "The survey details are entirely made up." },
    "claim-4": { isHallucination: false, explanation: "Multiple real studies show humans detect AI images roughly 40% of the time." }
  },
  enrichment: {
    whyItMatters: "AI frequently generates fake citations and statistics with complete confidence. If you don't verify, you'll spread misinformation.",
    realWorldExample: "A lawyer used ChatGPT for legal research and cited 6 completely fabricated court cases in a filing. The judge sanctioned him.",
    proTip: "Red flags: very specific numbers (47, not 'about 50'), full citation details, claims that perfectly support the narrative."
  }
}
```

## Extended Type
```ts
interface ClaimAnnotation {
  isHallucination: boolean;
  explanation: string;
}

interface HallucinationItem extends ContentItem {
  claimAnnotations: Record<string, ClaimAnnotation>;
}
```

## Mobile Considerations
- Claims must have large enough tap targets on mobile
- Passage text should be readable (min 14px)
- Results case file scrolls vertically on small screens
