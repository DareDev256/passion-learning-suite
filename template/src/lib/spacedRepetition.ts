// ─── Passionate Learning — Spaced Repetition Scheduler ───
// Bridges ts-fsrs scheduling with the game's storage layer.
// The storage layer persists FSRS cards; this module actually RUNS the algorithm.
// Pure functions — no React, no side effects beyond storage writes.

import { FSRS, Rating, createEmptyCard, type Card, type Grade } from "ts-fsrs";
import { getFSRSCards, saveFSRSCard, type FSRSCard } from "@/lib/storage";

// Singleton scheduler — enable fuzz to prevent predictable review patterns
const scheduler = new FSRS({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: true,
});

/** Map a boolean correct/incorrect to an FSRS grade with nuance. */
export type AnswerQuality = "again" | "hard" | "good" | "easy";

const GRADE_MAP: Record<AnswerQuality, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/**
 * Convert a simple correct/incorrect + optional confidence into an FSRS grade.
 * - Incorrect → Again
 * - Correct but slow (confidence < 0.5) → Hard
 * - Correct with normal confidence → Good
 * - Correct with high confidence (≥ 0.9) → Easy
 */
export function inferGrade(isCorrect: boolean, confidence = 0.7): AnswerQuality {
  if (!isCorrect) return "again";
  if (confidence < 0.5) return "hard";
  if (confidence >= 0.9) return "easy";
  return "good";
}

/** Convert stored FSRSCard (timestamps) → ts-fsrs Card (Date objects). */
function toFSRSCard(stored: FSRSCard): Card {
  return {
    due: new Date(stored.due),
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: stored.reps,
    lapses: stored.lapses,
    state: 0, // Will be inferred by ts-fsrs from reps/lapses
    last_review: stored.lastReview ? new Date(stored.lastReview) : undefined,
  };
}

/** Convert ts-fsrs Card → storable FSRSCard (timestamps). */
function toStoredCard(itemId: string, card: Card): FSRSCard {
  return {
    itemId,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review?.getTime() ?? Date.now(),
  };
}

export interface GradeResult {
  itemId: string;
  grade: AnswerQuality;
  nextDue: number;           // timestamp of next review
  interval: number;          // days until next review
  stability: number;         // FSRS memory stability
  difficulty: number;        // FSRS item difficulty (0-1 scale)
}

/**
 * Grade an item and schedule its next review via FSRS.
 * Creates a new card if the item has never been reviewed.
 * Persists the updated card to localStorage.
 *
 * @param itemId - Content item ID
 * @param quality - Answer quality (again/hard/good/easy), or use inferGrade()
 * @returns Scheduling result with next due date and FSRS metrics
 */
export function gradeItem(itemId: string, quality: AnswerQuality): GradeResult {
  const now = new Date();
  const stored = getFSRSCards().find((c) => c.itemId === itemId);
  const card = stored ? toFSRSCard(stored) : createEmptyCard(now);

  const recordLog = scheduler.repeat(card, now);
  const grade = GRADE_MAP[quality];
  const result = recordLog[grade];

  // Persist the updated card
  saveFSRSCard(toStoredCard(itemId, result.card));

  return {
    itemId,
    grade: quality,
    nextDue: result.card.due.getTime(),
    interval: result.card.scheduled_days,
    stability: result.card.stability,
    difficulty: result.card.difficulty,
  };
}

export interface ReviewQueue {
  due: string[];             // item IDs due now (overdue or due today)
  upcoming: string[];        // item IDs due within the next 24h
  totalCards: number;        // total FSRS cards tracked
  nextReviewAt: number | null; // timestamp of earliest upcoming review
}

/**
 * Build a prioritized review queue from all tracked FSRS cards.
 * Due items sorted by most overdue first. Upcoming = due within 24h.
 *
 * @param limit - Max items in the due queue (default 10)
 */
export function getReviewQueue(limit = 10): ReviewQueue {
  const now = Date.now();
  const oneDay = 86_400_000;
  const cards = getFSRSCards();

  const due: FSRSCard[] = [];
  const upcoming: FSRSCard[] = [];

  for (const card of cards) {
    if (card.due <= now) {
      due.push(card);
    } else if (card.due <= now + oneDay) {
      upcoming.push(card);
    }
  }

  // Sort: most overdue first
  due.sort((a, b) => a.due - b.due);
  upcoming.sort((a, b) => a.due - b.due);

  const nextReviewAt = upcoming.length > 0
    ? upcoming[0].due
    : due.length > 0 ? null : (cards.length > 0 ? Math.min(...cards.map((c) => c.due)) : null);

  return {
    due: due.slice(0, limit).map((c) => c.itemId),
    upcoming: upcoming.slice(0, limit).map((c) => c.itemId),
    totalCards: cards.length,
    nextReviewAt,
  };
}

/**
 * Compute a memory strength score (0-100) across all tracked items.
 * Based on average FSRS stability — higher stability = stronger memory.
 * Returns 0 if no cards are tracked.
 */
export function computeMemoryStrength(): number {
  const cards = getFSRSCards();
  if (cards.length === 0) return 0;
  const avgStability = cards.reduce((sum, c) => sum + c.stability, 0) / cards.length;
  // Map stability (typically 1-365 days) to 0-100 score
  // stability of 30 days = ~50%, 90 days = ~75%, 365 days = ~100%
  return Math.min(100, Math.round((avgStability / 365) * 100));
}
