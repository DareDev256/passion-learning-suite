# Tool Match — Game Spec

## Identity
- **Repo name**: `tool-match`
- **Full title**: TOOL MATCH
- **Subtitle**: Right Tool, Right Job
- **Tagline**: NOT EVERYTHING NEEDS AI

## What It Teaches
Practical AI tool selection — when to use which tool, what AI is good/bad at, and critically: when NOT to use AI at all.

## Theme
- **Palette**: Workshop/toolbench — `--game-primary: #3498db` (electric blue), `--game-secondary: #95a5a6` (steel gray), `--game-accent: #e67e22` (copper), `--game-dark: #0a0f15`
- **Aesthetic**: Clean industrial workshop. Pegboard with tools, labeled drawers, organized workspace.
- **References**: Factorio crafting menu, workshop/garage aesthetics, Blueprint UI

## Core Mechanic
1. A **task description** appears (e.g., "Summarize a 50-page legal contract")
2. A row of **tool options** appears (ChatGPT, Midjourney, GitHub Copilot, Google Search, "Don't Use AI", etc.)
3. Player **drags the task to the correct tool** (or taps on mobile)
4. Speed bonus for fast correct matches
5. Some tasks have the answer "Don't Use AI" — recognizing AI limitations earns bonus XP

## Scoring
```
Correct match: +10 points
Correct "Don't Use AI": +15 points (bonus for recognizing limitations)
Speed bonus: +1 to +5 points based on reaction time
Wrong match: -5 points
Wrong "Don't Use AI" when AI would help: -3 points
```

## Tools Library (the "answers")
- **ChatGPT/Claude** — Text generation, summarization, analysis, brainstorming
- **Midjourney/DALL-E** — Image generation, visual concepts, mood boards
- **GitHub Copilot** — Code completion, boilerplate, refactoring
- **Whisper/Speech AI** — Transcription, voice-to-text, audio processing
- **Google Search** — Current events, fact-checking, real-time data
- **Spreadsheet** — Calculations, data organization, bookkeeping
- **Human Expert** — Legal advice, medical diagnosis, emotional support
- **Don't Use AI** — Tasks where AI causes more harm than good

## Categories
1. **Text Tasks** — Writing, editing, summarizing, translating (easy)
2. **Visual Tasks** — Design, images, presentations, mockups (easy)
3. **Code Tasks** — Programming, debugging, architecture, DevOps (medium)
4. **Data Tasks** — Analysis, visualization, cleaning, reporting (medium)
5. **Creative Tasks** — Art direction, music, storytelling, branding (medium)
6. **Risky Tasks** — Legal, medical, financial, safety-critical (hard)
7. **Workflow Design** — Multi-tool chains for complex projects (hard)
8. **Anti-Patterns** — Tasks where AI is tempting but wrong (hard)

## Levels Per Category
5 levels each, 8 items per level = 320 total matches

## Unique UI Elements
- **Tool shelf** — Visual pegboard with labeled tool icons
- **Drag connector** — Line connects task to tool during drag
- **Match feedback** — Green flash + tool glow on correct, red shake on wrong
- **Combo counter** — Consecutive correct matches build a combo multiplier
- **Tool mastery bars** — Shows which tool categories you understand best

## Sample Curriculum Items
```
{
  id: "tt-001",
  prompt: "Write a sympathy card for a coworker who lost a family member",
  answer: "dont-use-ai",
  category: "anti-patterns",
  difficulty: "medium",
  toolOptions: ["chatgpt", "midjourney", "google-search", "dont-use-ai"],
  enrichment: {
    whyItMatters: "Genuine human emotion can't be outsourced. Using AI for condolences risks being discovered and causing MORE hurt.",
    realWorldExample: "A manager was caught using ChatGPT for a sympathy email. The grieving employee found out and felt doubly betrayed.",
    proTip: "Ask yourself: 'Would this person feel hurt if they knew AI wrote this?' If yes, write it yourself."
  }
}
```

```
{
  id: "tt-015",
  prompt: "Transcribe a 2-hour recorded interview into text",
  answer: "whisper",
  category: "text-tasks",
  difficulty: "easy",
  toolOptions: ["chatgpt", "whisper", "copilot", "dont-use-ai"],
  enrichment: {
    whyItMatters: "Whisper and similar speech-to-text models are purpose-built for transcription. Using ChatGPT would require manual audio processing.",
    realWorldExample: "Journalists use Whisper to transcribe interviews in minutes instead of hours. Accuracy is 95%+ for clear English.",
    proTip: "For interviews with accents or technical jargon, do a quick review pass after AI transcription."
  }
}
```

## Extended Type
```ts
interface ToolMatchItem extends ContentItem {
  toolOptions: string[];  // which tools to show as options for this item
}
```

## Mobile Considerations
- Drag-and-drop converts to tap-to-select on mobile
- Tool shelf becomes a horizontal scrollable row
- Task text must be concise (1-2 sentences max)
