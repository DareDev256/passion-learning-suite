import { UserProgress } from "@/types/game";

// ─── Passionate Learning — Persistence Layer ───
// Pure functions over localStorage. SSR-safe. Merge-on-read for forward compat.
// Call configureStorage("my_game") once at app init to namespace all keys.

// ─── Security: Input Validation Helpers ───
// Guards against localStorage injection, prototype pollution, and NaN propagation.
// See: OWASP A03 (Injection), A08 (Data Integrity), CWE-20, CWE-502.

const GAME_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const CONTENT_ID_PATTERN = /^[a-zA-Z0-9_.:/-]{1,128}$/;
const DANGEROUS_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

function sanitizeGameId(id: string): string {
  if (!GAME_ID_PATTERN.test(id)) {
    throw new Error(
      `Invalid game ID "${id}". Must be 1-64 alphanumeric/underscore/hyphen characters.`
    );
  }
  return id;
}

/**
 * Validate a content/item/level ID used as an object key.
 * Rejects prototype pollution keys and enforces length/character bounds.
 * Returns the ID if valid, or undefined if invalid (silent rejection).
 */
function isValidContentId(id: string): boolean {
  if (typeof id !== "string") return false;
  if (DANGEROUS_KEYS.has(id)) return false;
  return CONTENT_ID_PATTERN.test(id);
}

/** Clamp a number to safe bounds, returning fallback on NaN/Infinity. */
function safeNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

/** Strip __proto__ and constructor keys to prevent prototype pollution. */
function stripDangerousKeys<T extends Record<string, unknown>>(obj: T): T {
  if (obj == null || typeof obj !== "object") return obj;
  const cleaned = { ...obj };
  delete (cleaned as Record<string, unknown>)["__proto__"];
  delete (cleaned as Record<string, unknown>)["constructor"];
  delete (cleaned as Record<string, unknown>)["prototype"];
  return cleaned;
}

/** Validate and sanitize a UserProgress object from untrusted storage. */
function validateProgress(raw: unknown): UserProgress {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultProgress;
  }
  const obj = stripDangerousKeys(raw as Record<string, unknown>);
  // Validate itemScores — each value must have numeric correct/incorrect/lastSeen
  const rawScores = (typeof obj.itemScores === "object" && obj.itemScores !== null && !Array.isArray(obj.itemScores))
    ? obj.itemScores as Record<string, unknown>
    : {};
  const sanitizedScores: UserProgress["itemScores"] = {};
  for (const [key, val] of Object.entries(stripDangerousKeys(rawScores as Record<string, unknown>))) {
    if (typeof key !== "string" || key.length > 128) continue;
    if (val == null || typeof val !== "object") continue;
    const score = val as Record<string, unknown>;
    sanitizedScores[key] = {
      correct: safeNumber(score.correct, 0, 0),
      incorrect: safeNumber(score.incorrect, 0, 0),
      lastSeen: safeNumber(score.lastSeen, 0, 0),
    };
  }
  return {
    xp: safeNumber(obj.xp, 0, 0),
    level: safeNumber(obj.level, 1, 1),
    currentCategory: typeof obj.currentCategory === "string" && isValidContentId(obj.currentCategory) ? obj.currentCategory : "",
    completedLevels: Array.isArray(obj.completedLevels)
      ? (obj.completedLevels as unknown[]).filter((v): v is string => typeof v === "string" && v.length <= 128)
      : [],
    streak: safeNumber(obj.streak, 0, 0),
    streakFreezes: safeNumber(obj.streakFreezes, 0, 0),
    itemScores: sanitizedScores,
  };
}

let gameId = "passionate_learning";

/**
 * Set the game namespace for all localStorage keys. Call once at app init.
 * Only accepts alphanumeric, hyphen, and underscore characters (1–64 chars).
 * @param id - Unique game identifier (e.g. `"prompt_craft"`)
 * @throws {Error} If `id` contains invalid characters or exceeds 64 chars
 * @example
 * ```ts
 * // src/app/layout.tsx — call before any storage reads
 * configureStorage("prompt_craft");
 * ```
 */
export function configureStorage(id: string): void {
  gameId = sanitizeGameId(id);
}

/**
 * Returns the currently configured game ID namespace.
 * Defaults to `"passionate_learning"` if {@link configureStorage} was never called.
 */
export function getGameId(): string {
  return gameId;
}

function storageKey(suffix: string): string {
  return `${gameId}_${suffix}`;
}

const defaultProgress: UserProgress = {
  xp: 0,
  level: 1,
  currentCategory: "",
  completedLevels: [],
  streak: 0,
  streakFreezes: 0,
  itemScores: {},
};

/**
 * Load the player's progress from localStorage.
 * Returns safe defaults on SSR, missing data, or corrupted storage.
 * All parsed values are validated against prototype pollution and numeric overflow.
 */
export function getProgress(): UserProgress {
  if (typeof window === "undefined") return defaultProgress;
  try {
    const stored = localStorage.getItem(storageKey("progress"));
    if (!stored) return defaultProgress;
    return validateProgress(JSON.parse(stored));
  } catch {
    return defaultProgress;
  }
}

/** Persist a full {@link UserProgress} object to localStorage. No-op during SSR. */
export function saveProgress(progress: UserProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey("progress"), JSON.stringify(progress));
}

/**
 * Merge partial updates into the current progress and persist.
 * @returns The merged {@link UserProgress} after saving.
 */
export function updateProgress(updates: Partial<UserProgress>): UserProgress {
  const current = getProgress();
  const updated = { ...current, ...updates };
  saveProgress(updated);
  return updated;
}

// ─── XP System with Delayed Rewards ───
// 1x on first correct, 2x on 7-day recall, 3x on 30-day recall

/**
 * Award XP with an optional recall multiplier. Automatically levels up (100 XP/level).
 * Amount is clamped to 0–100,000 and multiplier to 0–10 for safety.
 * @param amount - Base XP to award (clamped to 0–100k)
 * @param multiplier - Recall bonus: 1× first see, 2× 7-day, 3× 30-day (default `1`)
 * @returns Updated {@link UserProgress} with new XP and level.
 */
export function addXP(amount: number, multiplier = 1): UserProgress {
  const safeAmount = safeNumber(amount, 0, 0, 100_000);
  const safeMult = safeNumber(multiplier, 1, 0, 10);
  const current = getProgress();
  const newXP = current.xp + Math.round(safeAmount * safeMult);
  const newLevel = Math.floor(newXP / 100) + 1;
  return updateProgress({ xp: newXP, level: newLevel });
}

/**
 * Calculate the delayed-reward XP multiplier for an item based on time since last seen.
 * - **1×** — first exposure or seen within 7 days
 * - **2×** — 7+ days since last seen (spaced recall bonus)
 * - **3×** — 30+ days since last seen (long-term retention bonus)
 * @param itemId - The content item ID to check
 */
export function getRecallMultiplier(itemId: string): number {
  if (!isValidContentId(itemId)) return 1; // invalid ID → treat as unseen
  const current = getProgress();
  const score = current.itemScores[itemId];
  if (!score) return 1; // Never seen — first exposure, base XP
  const daysSinceLastSeen = (Date.now() - score.lastSeen) / (1000 * 60 * 60 * 24);
  if (daysSinceLastSeen >= 30) return 3;  // 30-day recall = 3x XP
  if (daysSinceLastSeen >= 7) return 2;   // 7-day recall = 2x XP
  return 1;
}

/**
 * Mark a level as completed. Awards a streak freeze every 10 levels.
 * Idempotent — completing an already-completed level is a no-op.
 * @param categoryId - Category containing the level
 * @param levelId - Numeric level ID within the category
 */
export function completeLevel(categoryId: string, levelId: number): UserProgress {
  if (!isValidContentId(categoryId)) return getProgress(); // reject dangerous category IDs
  const safeLevelId = safeNumber(levelId, 0, 0, 10_000);
  const current = getProgress();
  const levelKey = `${categoryId}-${safeLevelId}`;
  if (!current.completedLevels.includes(levelKey)) {
    // Award streak freeze every 10 levels
    const newCompleted = [...current.completedLevels, levelKey];
    const earnedFreeze = newCompleted.length % 10 === 0;
    return updateProgress({
      completedLevels: newCompleted,
      streakFreezes: current.streakFreezes + (earnedFreeze ? 1 : 0),
    });
  }
  return current;
}

/**
 * Record a correct or incorrect answer for a content item.
 * Updates the item's score counters and `lastSeen` timestamp.
 * @param itemId - The content item ID
 * @param isCorrect - Whether the player answered correctly
 */
export function updateItemScore(itemId: string, isCorrect: boolean): UserProgress {
  if (!isValidContentId(itemId)) return getProgress(); // reject dangerous/malformed IDs
  const current = getProgress();
  const existing = current.itemScores[itemId] || {
    correct: 0,
    incorrect: 0,
    lastSeen: 0,
  };
  return updateProgress({
    itemScores: {
      ...current.itemScores,
      [itemId]: {
        correct: existing.correct + (isCorrect ? 1 : 0),
        incorrect: existing.incorrect + (isCorrect ? 0 : 1),
        lastSeen: Date.now(),
      },
    },
  });
}

// ─── FSRS-4.5 Spaced Repetition ───
// Uses ts-fsrs for research-grade scheduling.
// Cards stored in localStorage, keyed by item ID.
// Each card tracks: difficulty, stability, retrievability, due date.
// Passion Agent will integrate ts-fsrs during build.
// This is the localStorage bridge for FSRS card state.

/** FSRS-4.5 spaced repetition card stored in localStorage. One card per content item. */
export interface FSRSCard {
  itemId: string;
  due: number;         // timestamp when review is due
  stability: number;   // memory stability
  difficulty: number;  // item difficulty (0-1)
  reps: number;        // number of reviews
  lapses: number;      // number of times forgotten
  lastReview: number;  // timestamp of last review
}

/**
 * Load all FSRS cards from localStorage. Malformed entries are silently filtered.
 * Each card must have a string `itemId`, finite `due`, and finite `stability`.
 */
export function getFSRSCards(): FSRSCard[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(storageKey("fsrs_cards"));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Validate each card has required shape — reject malformed entries
    return parsed.filter(
      (c: unknown): c is FSRSCard =>
        c != null &&
        typeof c === "object" &&
        typeof (c as FSRSCard).itemId === "string" &&
        Number.isFinite((c as FSRSCard).due) &&
        Number.isFinite((c as FSRSCard).stability)
    );
  } catch {
    return [];
  }
}

/** Upsert an FSRS card — updates existing card by `itemId` or appends a new one. */
export function saveFSRSCard(card: FSRSCard): void {
  if (typeof window === "undefined") return;
  if (!isValidContentId(card.itemId)) return; // reject dangerous/malformed IDs
  const cards = getFSRSCards();
  const idx = cards.findIndex((c) => c.itemId === card.itemId);
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.push(card);
  }
  localStorage.setItem(storageKey("fsrs_cards"), JSON.stringify(cards));
}

/**
 * Get item IDs with overdue FSRS reviews, sorted by most overdue first.
 * @param limit - Maximum items to return (default `5`)
 */
export function getDueItems(limit = 5): string[] {
  const now = Date.now();
  return getFSRSCards()
    .filter((card) => card.due <= now)
    .sort((a, b) => a.due - b.due)
    .slice(0, limit)
    .map((card) => card.itemId);
}

/**
 * Get items needing review. Prefers FSRS-scheduled items; falls back to
 * a naive sort (most incorrect, least recently seen) when no FSRS cards exist.
 * @param limit - Maximum items to return (default `5`)
 */
export function getItemsForReview(limit = 5): string[] {
  // Prefer FSRS-scheduled items
  const fsrsDue = getDueItems(limit);
  if (fsrsDue.length > 0) return fsrsDue;

  // Fallback: naive incorrect > correct sorting
  const current = getProgress();
  return Object.entries(current.itemScores)
    .filter(([, score]) => score.incorrect > score.correct)
    .sort((a, b) => a[1].lastSeen - b[1].lastSeen)
    .slice(0, limit)
    .map(([id]) => id);
}

// ─── Streak System with Freeze ───

/**
 * Update the daily streak. Extends on consecutive days, consumes streak freezes
 * to cover gaps, or resets if not enough freezes. Idempotent within a single day.
 * @returns Updated {@link UserProgress} with new streak and freeze counts.
 */
export function updateStreak(): UserProgress {
  if (typeof window === "undefined") return getProgress();
  const current = getProgress();
  const lastPlayed = localStorage.getItem(storageKey("last_played"));
  const today = new Date().toDateString();

  let newStreak = current.streak;
  let freezesUsed = 0;

  if (lastPlayed === today) {
    // Already played today — no change
  } else if (lastPlayed) {
    // Calculate actual days missed (not just "yesterday" check)
    const lastDate = new Date(lastPlayed);
    const todayDate = new Date(today);
    const daysMissed = Math.round(
      (todayDate.getTime() - lastDate.getTime()) / 86400000
    ) - 1; // subtract 1: the gap between last played and today

    if (daysMissed <= 0) {
      // Played yesterday — extend streak
      newStreak = current.streak + 1;
    } else if (current.streakFreezes >= daysMissed) {
      // Have enough freezes to cover the gap
      freezesUsed = daysMissed;
      newStreak = current.streak + 1; // Continue streak
    } else {
      // Not enough freezes — streak resets
      newStreak = 1;
    }
  } else {
    // First time playing
    newStreak = 1;
  }

  localStorage.setItem(storageKey("last_played"), today);
  return updateProgress({
    streak: newStreak,
    streakFreezes: current.streakFreezes - freezesUsed,
  });
}

// ─── Mastery Gate (Kumon-style) ───
// 90% accuracy on last 3 attempts to unlock next level

interface MasteryAttempt {
  accuracy: number;
  timestamp: number;
}

/**
 * Record a mastery gate attempt. Keeps the last 5 attempts per level.
 * Accuracy is clamped to 0–100. See {@link checkMastery} for the unlock check.
 * @param levelKey - Level identifier in `"categoryId-levelId"` format
 * @param accuracy - Percentage score for this attempt (0–100)
 */
export function recordMasteryAttempt(levelKey: string, accuracy: number): void {
  if (typeof window === "undefined") return;
  if (!isValidContentId(levelKey)) return; // reject dangerous/malformed level keys
  const safeAccuracy = safeNumber(accuracy, 0, 0, 100);
  try {
    const stored = localStorage.getItem(storageKey("mastery"));
    const parsed = stored ? JSON.parse(stored) : {};
    const data: Record<string, MasteryAttempt[]> =
      (parsed != null && typeof parsed === "object" && !Array.isArray(parsed))
        ? stripDangerousKeys(parsed)
        : {};
    const attempts = Array.isArray(data[levelKey]) ? data[levelKey] : [];
    attempts.push({ accuracy: safeAccuracy, timestamp: Date.now() });
    data[levelKey] = attempts.slice(-5);
    localStorage.setItem(storageKey("mastery"), JSON.stringify(data));
  } catch {
    // Silently fail on storage errors
  }
}

/**
 * Check if a level meets the Kumon-style mastery gate: ≥90% accuracy on the last 3 attempts.
 * @param levelKey - Level identifier in `"categoryId-levelId"` format
 * @returns `true` if the player has mastered this level
 */
export function checkMastery(levelKey: string): boolean {
  if (typeof window === "undefined") return false;
  if (!isValidContentId(levelKey)) return false; // reject dangerous/malformed level keys
  try {
    const stored = localStorage.getItem(storageKey("mastery"));
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    // Validate top-level shape — must be a plain object, not array/null/primitive
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const data = stripDangerousKeys(parsed as Record<string, unknown>);
    const rawAttempts = data[levelKey];
    if (!Array.isArray(rawAttempts)) return false;
    // Validate each attempt has a finite numeric accuracy
    const attempts: MasteryAttempt[] = rawAttempts.filter(
      (a: unknown): a is MasteryAttempt =>
        a != null &&
        typeof a === "object" &&
        Number.isFinite((a as MasteryAttempt).accuracy) &&
        Number.isFinite((a as MasteryAttempt).timestamp)
    );
    if (attempts.length < 3) return false;
    const last3 = attempts.slice(-3);
    return last3.every((a) => a.accuracy >= 90);
  } catch {
    return false;
  }
}

// ─── Learning Analytics ───
// Track what matters: are people LEARNING, not just playing?

/**
 * A tracked learning analytics event. Only the 5 whitelisted types are accepted.
 * Events are stored in localStorage (max 1,000 per game namespace).
 */
export interface LearningEvent {
  type: "first_correct" | "review_correct" | "review_incorrect" | "concept_mastered" | "drop_off";
  itemId: string;
  timestamp: number;
  daysSinceLastSeen?: number;
  accuracy?: number;
}

const VALID_EVENT_TYPES: ReadonlySet<LearningEvent["type"]> = new Set([
  "first_correct", "review_correct", "review_incorrect", "concept_mastered", "drop_off",
]);

/**
 * Record a learning analytics event. Unknown event types are silently dropped.
 * Storage is capped at 1,000 events (oldest trimmed on overflow).
 */
export function recordLearningEvent(event: LearningEvent): void {
  if (typeof window === "undefined") return;
  // Validate event type against whitelist — reject unknown types
  if (!VALID_EVENT_TYPES.has(event.type)) return;
  try {
    const stored = localStorage.getItem(storageKey("analytics"));
    const parsed = stored ? JSON.parse(stored) : [];
    const events: LearningEvent[] = Array.isArray(parsed) ? parsed : [];
    events.push(event);
    // Keep last 1000 events
    const trimmed = events.slice(-1000);
    localStorage.setItem(storageKey("analytics"), JSON.stringify(trimmed));
  } catch {
    // Silently fail
  }
}

/**
 * Compute aggregate learning analytics from stored events.
 * @returns Object with `totalItemsSeen`, `itemsMastered`, `averageTimeToMastery` (ms),
 * `retentionRate7Day` (%), and `retentionRate30Day` (%). All zero on SSR or empty data.
 */
export function getLearningAnalytics(): {
  totalItemsSeen: number;
  itemsMastered: number;
  averageTimeToMastery: number;
  retentionRate7Day: number;
  retentionRate30Day: number;
} {
  if (typeof window === "undefined") {
    return { totalItemsSeen: 0, itemsMastered: 0, averageTimeToMastery: 0, retentionRate7Day: 0, retentionRate30Day: 0 };
  }
  try {
    const stored = localStorage.getItem(storageKey("analytics"));
    const events: LearningEvent[] = stored ? JSON.parse(stored) : [];

    const itemsSeen = new Set(events.map((e) => e.itemId));
    const mastered = events.filter((e) => e.type === "concept_mastered");
    const reviews7d = events.filter((e) => e.type === "review_correct" && (e.daysSinceLastSeen || 0) >= 7);
    const reviewAttempts7d = events.filter(
      (e) => (e.type === "review_correct" || e.type === "review_incorrect") && (e.daysSinceLastSeen || 0) >= 7
    );
    const reviews30d = events.filter((e) => e.type === "review_correct" && (e.daysSinceLastSeen || 0) >= 30);
    const reviewAttempts30d = events.filter(
      (e) => (e.type === "review_correct" || e.type === "review_incorrect") && (e.daysSinceLastSeen || 0) >= 30
    );

    // Compute average time from first_correct to concept_mastered per item
    const firstCorrectByItem = new Map<string, number>();
    const masteredByItem = new Map<string, number>();
    for (const e of events) {
      if (e.type === "first_correct" && !firstCorrectByItem.has(e.itemId)) {
        firstCorrectByItem.set(e.itemId, e.timestamp);
      }
      if (e.type === "concept_mastered") {
        masteredByItem.set(e.itemId, e.timestamp);
      }
    }
    const masteryDurations: number[] = [];
    for (const [itemId, masteredAt] of masteredByItem) {
      const firstAt = firstCorrectByItem.get(itemId);
      if (firstAt !== undefined && masteredAt > firstAt) {
        masteryDurations.push(masteredAt - firstAt);
      }
    }
    const avgTimeToMastery = masteryDurations.length > 0
      ? Math.round(masteryDurations.reduce((a, b) => a + b, 0) / masteryDurations.length)
      : 0;

    return {
      totalItemsSeen: itemsSeen.size,
      itemsMastered: mastered.length,
      averageTimeToMastery: avgTimeToMastery,
      retentionRate7Day: reviewAttempts7d.length > 0
        ? Math.round((reviews7d.length / reviewAttempts7d.length) * 100)
        : 0,
      retentionRate30Day: reviewAttempts30d.length > 0
        ? Math.round((reviews30d.length / reviewAttempts30d.length) * 100)
        : 0,
    };
  } catch {
    return { totalItemsSeen: 0, itemsMastered: 0, averageTimeToMastery: 0, retentionRate7Day: 0, retentionRate30Day: 0 };
  }
}

/**
 * Wipe all game data for the current namespace: progress, streaks, mastery,
 * FSRS cards, and analytics. Irreversible. No-op during SSR.
 */
export function resetProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey("progress"));
  localStorage.removeItem(storageKey("last_played"));
  localStorage.removeItem(storageKey("mastery"));
  localStorage.removeItem(storageKey("fsrs_cards"));
  localStorage.removeItem(storageKey("analytics"));
}
