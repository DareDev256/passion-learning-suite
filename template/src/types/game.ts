// ─── Passionate Learning — Shared Game Types ───
// Every game adapts these. Game-specific types extend from here.

export interface Enrichment {
  whyItMatters: string;
  realWorldExample: string;
  proTip?: string;
}

export interface ContentItem {
  id: string;
  prompt: string;       // what the player sees (question, scenario, partial text)
  answer: string;        // correct response (typed text, selected option, etc.)
  category: CategoryType;
  difficulty: "easy" | "medium" | "hard";
  enrichment?: Enrichment;
}

// Each game defines its own CategoryType union — this is the template default
export type CategoryType = string;

export interface Category {
  id: string;
  title: string;
  description: string;
  icon: string;
  levels: Level[];
}

export interface Level {
  id: number;
  name: string;
  items: string[];       // ContentItem IDs
  requiredXp: number;
  gameMode: string;      // each game defines its modes
}

export interface GameState {
  currentItem: ContentItem | null;
  userInput: string;
  score: number;
  startTime: number | null;
  isComplete: boolean;
}

export interface UserProgress {
  xp: number;
  level: number;
  currentCategory: string;
  completedLevels: string[];   // "categoryId-levelId"
  streak: number;
  streakFreezes: number;       // earned 1 per 10 levels, protects streak on missed day
  itemScores: Record<string, ItemScore>;
}

export interface ItemScore {
  correct: number;
  incorrect: number;
  lastSeen: number;
}

export interface GameResults {
  xp: number;
  accuracy: number;
  speed: number;          // game-specific metric (WPM, time, etc.)
  correctAnswers: number;
  totalQuestions: number;
}

// ─── Mastery Gate ───
// Kumon-style: must hit 90% accuracy on last 3 attempts to advance
export interface MasteryCheck {
  levelKey: string;
  recentAttempts: { accuracy: number; timestamp: number }[];
  isMastered: boolean;
}
