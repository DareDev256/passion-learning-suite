// ─── Passionate Learning — Shared Game Types ───
// Every game adapts these. Game-specific types extend from here.
// See README § "Auto-Select Architecture" for how these types flow through
// the session planner, difficulty engine, and FSRS scheduler.

/**
 * Optional enrichment content shown after a player answers.
 * Transforms rote recall into understanding by connecting items to real-world impact.
 */
export interface Enrichment {
  /** Why this concept matters beyond the game — motivation for retention. */
  whyItMatters: string;
  /** A concrete, relatable application of the concept. */
  realWorldExample: string;
  /** Optional expert-level tip for advanced learners. */
  proTip?: string;
}

/**
 * A single question/challenge in the curriculum.
 * The atomic unit of learning — everything in the system (scoring, FSRS cards,
 * difficulty analysis, session planning) references items by `id`.
 */
export interface ContentItem {
  /** Unique identifier. Validated against `/^[a-z0-9_.:/-]{1,128}$/` at runtime. */
  id: string;
  /** What the player sees — question text, scenario, or partial prompt. */
  prompt: string;
  /** The correct response (typed text, selected option, etc.). */
  answer: string;
  /** Which curriculum category this item belongs to. Used for radar charts and weak-area targeting. */
  category: CategoryType;
  /** Difficulty tier. Drives the adaptive difficulty engine's tier-ladder placement. */
  difficulty: "easy" | "medium" | "hard";
  /** Post-answer enrichment content. Shown on correct answers to deepen understanding. */
  enrichment?: Enrichment;
}

/**
 * Category identifier type. Each game defines its own union
 * (e.g. `"prompting" | "constraints" | "iteration"`). Template default is `string`.
 */
export type CategoryType = string;

/**
 * A curriculum category containing leveled content.
 * Categories are unlocked sequentially — completing all levels in category N
 * unlocks category N+1.
 */
export interface Category {
  /** Unique identifier (e.g. `"networking"`, `"cryptography"`). */
  id: string;
  /** Display name shown in the UI. */
  title: string;
  /** Short description of what this category teaches. */
  description: string;
  /** Emoji or icon identifier for the category badge. */
  icon: string;
  /** Ordered list of levels within this category. */
  levels: Level[];
}

/**
 * A level within a category. Levels are gated by mastery checks —
 * 90% accuracy on the last 3 attempts to advance (Kumon-style).
 */
export interface Level {
  /** Numeric level identifier (1-indexed within category). */
  id: number;
  /** Display name for this level. */
  name: string;
  /** Ordered list of `ContentItem.id` references composing this level. */
  items: string[];
  /** Minimum XP required to attempt this level. */
  requiredXp: number;
  /** Game mode identifier — each game defines its own modes (e.g. `"multiple-choice"`, `"type-answer"`). */
  gameMode: string;
}

/**
 * Runtime state for an active game session.
 * Managed by game-specific page components, not the shared template.
 */
export interface GameState {
  /** The item currently being presented to the player, or null between items. */
  currentItem: ContentItem | null;
  /** Player's current input (typed text, selected option ID, etc.). */
  userInput: string;
  /** Running score for the current session. */
  score: number;
  /** Unix timestamp (ms) when the session started, null if not yet started. */
  startTime: number | null;
  /** Whether all items in the session have been answered. */
  isComplete: boolean;
}

/**
 * Persisted player progress. Loaded/saved via the storage layer.
 * All fields have safe defaults — corrupt or missing data falls back gracefully.
 */
export interface UserProgress {
  /** Total experience points earned across all sessions. */
  xp: number;
  /** Current level (1-indexed). Levels up every 100 XP. */
  level: number;
  /** ID of the player's current/most recent category. */
  currentCategory: string;
  /** Completed level keys as `"categoryId-levelId"` strings. */
  completedLevels: string[];
  /** Consecutive days played. Protected by streak freezes on missed days. */
  streak: number;
  /** Available streak freezes. Earned 1 per 10 levels, max 3. Consumed automatically on missed days. */
  streakFreezes: number;
  /** Per-item scoring data, keyed by `ContentItem.id`. Used by difficulty engine and session planner. */
  itemScores: Record<string, ItemScore>;
}

/**
 * Per-item performance record. Updated on every answer via `updateItemScore()`.
 * The difficulty engine reads these to compute rolling accuracy per tier.
 */
export interface ItemScore {
  /** Total correct answers for this item. */
  correct: number;
  /** Total incorrect answers for this item. */
  incorrect: number;
  /** Unix timestamp (ms) of the most recent answer. Used for staleness ranking and recall bonus detection. */
  lastSeen: number;
}

/**
 * Post-session results passed to `VictoryScreen` and `ShareCard`.
 */
export interface GameResults {
  /** XP earned this session (before multipliers). */
  xp: number;
  /** Accuracy percentage (0–100). */
  accuracy: number;
  /** Game-specific speed metric (WPM for typing games, seconds for timed games, etc.). */
  speed: number;
  /** Number of correct answers. */
  correctAnswers: number;
  /** Total questions attempted. */
  totalQuestions: number;
}

/**
 * Mastery gate check result. Implements Kumon-style progression:
 * ≥90% accuracy on the last 3 attempts required to advance to the next level.
 */
export interface MasteryCheck {
  /** Level key as `"categoryId-levelId"`. */
  levelKey: string;
  /** The 3 most recent attempts (accuracy + timestamp). Kept as a rolling window of 5, evaluated on the last 3. */
  recentAttempts: { accuracy: number; timestamp: number }[];
  /** True when the last 3 attempts all hit ≥90% accuracy. */
  isMastered: boolean;
}
