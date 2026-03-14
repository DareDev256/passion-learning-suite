import { UserProgress } from "@/types/game";

// ─── Passionate Learning — Persistence Layer ───
// Pure functions over localStorage. SSR-safe. Merge-on-read for forward compat.
// Call configureStorage("my_game") once at app init to namespace all keys.

let gameId = "passionate_learning";

export function configureStorage(id: string): void {
  gameId = id;
}

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

export function getProgress(): UserProgress {
  if (typeof window === "undefined") return defaultProgress;
  try {
    const stored = localStorage.getItem(storageKey("progress"));
    if (!stored) return defaultProgress;
    return { ...defaultProgress, ...JSON.parse(stored) };
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey("progress"), JSON.stringify(progress));
}

export function updateProgress(updates: Partial<UserProgress>): UserProgress {
  const current = getProgress();
  const updated = { ...current, ...updates };
  saveProgress(updated);
  return updated;
}

// ─── XP System with Delayed Rewards ───
// 1x on first correct, 2x on 7-day recall, 3x on 30-day recall

export function addXP(amount: number, multiplier = 1): UserProgress {
  const current = getProgress();
  const newXP = current.xp + Math.round(amount * multiplier);
  const newLevel = Math.floor(newXP / 100) + 1;
  return updateProgress({ xp: newXP, level: newLevel });
}

export function getRecallMultiplier(itemId: string): number {
  const current = getProgress();
  const score = current.itemScores[itemId];
  if (!score) return 1; // Never seen — first exposure, base XP
  const daysSinceLastSeen = (Date.now() - score.lastSeen) / (1000 * 60 * 60 * 24);
  if (daysSinceLastSeen >= 30) return 3;  // 30-day recall = 3x XP
  if (daysSinceLastSeen >= 7) return 2;   // 7-day recall = 2x XP
  return 1;
}

export function completeLevel(categoryId: string, levelId: number): UserProgress {
  const current = getProgress();
  const levelKey = `${categoryId}-${levelId}`;
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

export function updateItemScore(itemId: string, isCorrect: boolean): UserProgress {
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

export interface FSRSCard {
  itemId: string;
  due: number;         // timestamp when review is due
  stability: number;   // memory stability
  difficulty: number;  // item difficulty (0-1)
  reps: number;        // number of reviews
  lapses: number;      // number of times forgotten
  lastReview: number;  // timestamp of last review
}

export function getFSRSCards(): FSRSCard[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(storageKey("fsrs_cards"));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveFSRSCard(card: FSRSCard): void {
  if (typeof window === "undefined") return;
  const cards = getFSRSCards();
  const idx = cards.findIndex((c) => c.itemId === card.itemId);
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.push(card);
  }
  localStorage.setItem(storageKey("fsrs_cards"), JSON.stringify(cards));
}

export function getDueItems(limit = 5): string[] {
  const now = Date.now();
  return getFSRSCards()
    .filter((card) => card.due <= now)
    .sort((a, b) => a.due - b.due)
    .slice(0, limit)
    .map((card) => card.itemId);
}

// Fallback review queue (for before FSRS is fully integrated)
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

export function recordMasteryAttempt(levelKey: string, accuracy: number): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(storageKey("mastery"));
    const data: Record<string, MasteryAttempt[]> = stored ? JSON.parse(stored) : {};
    const attempts = data[levelKey] || [];
    attempts.push({ accuracy, timestamp: Date.now() });
    data[levelKey] = attempts.slice(-5);
    localStorage.setItem(storageKey("mastery"), JSON.stringify(data));
  } catch {
    // Silently fail on storage errors
  }
}

export function checkMastery(levelKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(storageKey("mastery"));
    if (!stored) return false;
    const data: Record<string, MasteryAttempt[]> = JSON.parse(stored);
    const attempts = data[levelKey] || [];
    if (attempts.length < 3) return false;
    const last3 = attempts.slice(-3);
    return last3.every((a) => a.accuracy >= 90);
  } catch {
    return false;
  }
}

// ─── Learning Analytics ───
// Track what matters: are people LEARNING, not just playing?

export interface LearningEvent {
  type: "first_correct" | "review_correct" | "review_incorrect" | "concept_mastered" | "drop_off";
  itemId: string;
  timestamp: number;
  daysSinceLastSeen?: number;
  accuracy?: number;
}

export function recordLearningEvent(event: LearningEvent): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(storageKey("analytics"));
    const events: LearningEvent[] = stored ? JSON.parse(stored) : [];
    events.push(event);
    // Keep last 1000 events
    const trimmed = events.slice(-1000);
    localStorage.setItem(storageKey("analytics"), JSON.stringify(trimmed));
  } catch {
    // Silently fail
  }
}

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

export function resetProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey("progress"));
  localStorage.removeItem(storageKey("last_played"));
  localStorage.removeItem(storageKey("mastery"));
  localStorage.removeItem(storageKey("fsrs_cards"));
  localStorage.removeItem(storageKey("analytics"));
}
