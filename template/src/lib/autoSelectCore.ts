// ─── Passionate Learning — Auto-Select Core ───
// Pure utility functions powering the auto-select strategy.
// No storage access, no side effects — these are composable building blocks
// used by sessionPlanner and any module that needs auto-select logic.

import type { ContentItem, ItemScore } from "@/types/game";
import type { SessionItemReason, SessionItem } from "@/lib/sessionPlanner";

/** Milliseconds in one day — avoids magic numbers across the codebase. */
export const MS_PER_DAY = 86_400_000;

/** Minimum days since last review to qualify for recall bonus XP. */
export const RECALL_BONUS_THRESHOLD_DAYS = 7;

/** Category accuracy threshold below which it's considered "weak". */
export const WEAK_CATEGORY_THRESHOLD = 70;

// ── Slot allocation ──

export interface SlotAllocation {
  reviewSlots: number;
  newSlots: number;
  weakSlots: number;
}

/**
 * Compute how many slots to allocate to each phase of auto-select.
 * Review slots are carved out first, then weak-category slots are a
 * fraction of the remaining new-content slots.
 */
export function allocateSlots(
  sessionSize: number,
  reviewRatio: number,
  weakCategoryBoost: number,
): SlotAllocation {
  const reviewSlots = Math.floor(sessionSize * reviewRatio);
  const newSlots = sessionSize - reviewSlots;
  const weakSlots = Math.floor(newSlots * weakCategoryBoost);
  return { reviewSlots, newSlots, weakSlots };
}

// ── Recall bonus detection ──

/**
 * Determine whether an item qualifies for recall-bonus XP.
 * Uses the most authoritative timestamp available — FSRS lastReview
 * takes precedence over itemScores.lastSeen when both exist.
 *
 * @param fsrsLastReview - FSRS card's lastReview timestamp (0 if unavailable)
 * @param scoreLastSeen - itemScores.lastSeen timestamp (0 if unavailable)
 * @param now - Current timestamp (defaults to Date.now())
 * @returns "recall-bonus" if 7+ days since last review, otherwise "review"
 */
export function classifyReviewReason(
  fsrsLastReview: number,
  scoreLastSeen: number,
  now: number = Date.now(),
): "recall-bonus" | "review" {
  const lastReviewTs = fsrsLastReview || scoreLastSeen || 0;
  const daysSince = lastReviewTs > 0 ? (now - lastReviewTs) / MS_PER_DAY : 0;
  return daysSince >= RECALL_BONUS_THRESHOLD_DAYS ? "recall-bonus" : "review";
}

// ── Weak-category item sorting ──

/**
 * Sort items for weak-category selection: unseen items first,
 * then oldest-seen items. Stable sort preserves original order for ties.
 */
export function sortByWeakPriority(
  items: ContentItem[],
  scores: Record<string, ItemScore>,
): ContentItem[] {
  return [...items].sort((a, b) => {
    const sa = scores[a.id];
    const sb = scores[b.id];
    if (!sa && sb) return -1;
    if (sa && !sb) return 1;
    if (!sa && !sb) return 0;
    return sa.lastSeen - sb.lastSeen;
  });
}

// ── Session summary ──

export interface SessionCounts {
  review: number;
  new: number;
  "weak-category": number;
  "recall-bonus": number;
}

/** Tally how many items fall under each selection reason. */
export function countByReason(items: SessionItem[]): SessionCounts {
  const counts: SessionCounts = { review: 0, new: 0, "weak-category": 0, "recall-bonus": 0 };
  for (const si of items) counts[si.reason]++;
  return counts;
}

/**
 * Find the reason with the highest item count.
 * Used for motivational messaging ("This session is review-heavy!").
 */
export function findDominantReason(counts: SessionCounts): SessionItemReason {
  return (Object.entries(counts) as [SessionItemReason, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
}

/** Compute estimated session duration, always rounding up. */
export function estimateDuration(itemCount: number, minutesPerItem: number): number {
  return Math.ceil(itemCount * minutesPerItem);
}
