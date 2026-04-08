// ─── Passionate Learning — Smart Session Planner ───
// The auto-select brain: orchestrates FSRS reviews, adaptive difficulty,
// and category weakness targeting into one optimal study session.
// Pure functions — takes data in, returns a prioritized session plan.

import { ContentItem } from "@/types/game";
import { getProgress, getFSRSCards } from "@/lib/storage";
import { getReviewQueue } from "@/lib/spacedRepetition";
import { analyzeDifficulty, selectItems } from "@/lib/difficulty";
import { computeCategoryStrengths, findWeakestItems } from "@/lib/insights";

/**
 * Why a particular item was selected for the session.
 * - `review` — FSRS-scheduled spaced repetition review
 * - `recall-bonus` — Review item with 7+ day gap, earning 2×/3× XP multiplier
 * - `weak-category` — Targeted drill from a category with <70% accuracy
 * - `new` — Fresh content matched to the player's difficulty tier
 */
export type SessionItemReason = "review" | "weak-category" | "new" | "recall-bonus";

/**
 * A single item in a session plan, annotated with why it was selected
 * and its priority rank. Lower priority = more urgent (reviews before new content).
 */
export interface SessionItem {
  /** The content item to present. */
  item: ContentItem;
  /** Why this item was selected — drives UI tags and XP multiplier logic. */
  reason: SessionItemReason;
  /** Sort rank: 0 = overdue review, 1 = upcoming review, 2 = weak-area drill, 3 = new content. */
  priority: number;
}

/**
 * Complete session plan produced by `planSession()`. Contains the ordered item
 * list plus aggregate counts for UI composition bars and time estimates.
 */
export interface SessionPlan {
  /** Ordered items for the session (sorted by priority — reviews first, new content last). */
  items: SessionItem[];
  /** Total review items (includes recall-bonus items). */
  reviewCount: number;
  /** Fresh content items at the player's recommended difficulty. */
  newCount: number;
  /** Items selected from weak categories (<70% accuracy). */
  weakCategoryCount: number;
  /** Review items eligible for 2×/3× recall bonus XP (7+ days since last review). */
  recallBonusCount: number;
  /** Estimated session duration in minutes (`items.length × minutesPerItem`). */
  estimatedMinutes: number;
  /** The reason with the highest item count — used for motivational messaging. */
  dominantReason: SessionItemReason;
}

interface PlanOptions {
  sessionSize?: number;       // total items in session (default 10)
  reviewRatio?: number;       // 0-1, portion reserved for reviews (default 0.4)
  weakCategoryBoost?: number; // 0-1, portion of new items from weak categories (default 0.3)
  minutesPerItem?: number;    // estimated time per item (default 0.75)
}

const DEFAULTS: Required<PlanOptions> = {
  sessionSize: 10,
  reviewRatio: 0.4,
  weakCategoryBoost: 0.3,
  minutesPerItem: 0.75,
};

/**
 * Build an optimal study session by combining three signals:
 * 1. FSRS review queue — items due for spaced repetition (highest priority)
 * 2. Weak categories — new items from the player's weakest areas
 * 3. Difficulty-matched new content — fresh items at the right challenge level
 *
 * Items with 7+ day recall bonuses (2×/3× XP) are flagged for motivation.
 *
 * @param items - Full content catalog
 * @param options - Session configuration
 * @returns Prioritized session plan with estimated duration
 */
export function planSession(
  items: ContentItem[],
  options: PlanOptions = {},
): SessionPlan {
  const opts = { ...DEFAULTS, ...options };
  const progress = getProgress();
  const scores = progress.itemScores;
  const usedIds = new Set<string>();

  const sessionItems: SessionItem[] = [];
  const reviewSlots = Math.floor(opts.sessionSize * opts.reviewRatio);
  const newSlots = opts.sessionSize - reviewSlots;

  // ── Phase 1: FSRS review items (overdue first) ──
  const queue = getReviewQueue(reviewSlots);
  const itemMap = new Map(items.map((i) => [i.id, i]));

  // Build FSRS card lookup — lastReview is the authoritative review timestamp.
  // itemScores.lastSeen can diverge when gradeItem() and updateItemScore()
  // fire through different code paths, causing missed recall bonuses.
  const cardMap = new Map(getFSRSCards().map((c) => [c.itemId, c]));

  for (const id of queue.due) {
    if (sessionItems.length >= reviewSlots) break;
    const item = itemMap.get(id);
    if (!item) continue;
    const card = cardMap.get(id);
    const lastReviewTs = card?.lastReview ?? scores[id]?.lastSeen ?? 0;
    const daysSince = lastReviewTs > 0 ? (Date.now() - lastReviewTs) / 86_400_000 : 0;
    sessionItems.push({
      item,
      reason: daysSince >= 7 ? "recall-bonus" : "review",
      priority: 0,
    });
    usedIds.add(id);
  }

  // Fill remaining review slots from upcoming
  for (const id of queue.upcoming) {
    if (sessionItems.length >= reviewSlots) break;
    if (usedIds.has(id)) continue;
    const item = itemMap.get(id);
    if (!item) continue;
    sessionItems.push({ item, reason: "review", priority: 1 });
    usedIds.add(id);
  }

  // ── Phase 2: Weak category targeting ──
  const weakSlots = Math.floor(newSlots * opts.weakCategoryBoost);
  const strengths = computeCategoryStrengths(items, scores);
  const weakCategories = strengths
    .filter((s) => s.accuracy < 70 && s.totalItems > 0)
    .map((s) => s.categoryId);

  if (weakCategories.length > 0) {
    const weakItems = items
      .filter((i) => weakCategories.includes(i.category) && !usedIds.has(i.id))
      .sort((a, b) => {
        const sa = scores[a.id];
        const sb = scores[b.id];
        if (!sa && sb) return -1; // unseen first
        if (sa && !sb) return 1;
        if (!sa && !sb) return 0;
        return sa.lastSeen - sb.lastSeen; // oldest seen first
      });

    for (const item of weakItems.slice(0, weakSlots)) {
      sessionItems.push({ item, reason: "weak-category", priority: 2 });
      usedIds.add(item.id);
    }
  }

  // ── Phase 3: Difficulty-matched new content ──
  const remaining = opts.sessionSize - sessionItems.length;
  if (remaining > 0) {
    const profile = analyzeDifficulty(items);
    const candidates = selectItems(
      items.filter((i) => !usedIds.has(i.id)),
      remaining,
      profile,
    );
    for (const item of candidates) {
      sessionItems.push({ item, reason: "new", priority: 3 });
      usedIds.add(item.id);
    }
  }

  // ── Build plan summary ──
  const counts = { review: 0, new: 0, "weak-category": 0, "recall-bonus": 0 };
  for (const si of sessionItems) counts[si.reason]++;

  const dominantReason = (Object.entries(counts) as [SessionItemReason, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  return {
    items: sessionItems.sort((a, b) => a.priority - b.priority),
    reviewCount: counts.review + counts["recall-bonus"],
    newCount: counts.new,
    weakCategoryCount: counts["weak-category"],
    recallBonusCount: counts["recall-bonus"],
    estimatedMinutes: Math.ceil(sessionItems.length * opts.minutesPerItem),
    dominantReason,
  };
}

/**
 * Quick check: does the player have pending reviews?
 * Useful for showing "Reviews waiting!" badges without computing a full plan.
 */
export function hasReviewsDue(): boolean {
  const queue = getReviewQueue(1);
  return queue.due.length > 0;
}

/**
 * Get a human-readable session summary for UI display.
 * @example "4 reviews + 6 new items · ~8 min"
 */
export function describeSession(plan: SessionPlan): string {
  const parts: string[] = [];
  if (plan.reviewCount > 0) {
    const bonus = plan.recallBonusCount > 0 ? ` (${plan.recallBonusCount} bonus XP!)` : "";
    parts.push(`${plan.reviewCount} review${plan.reviewCount !== 1 ? "s" : ""}${bonus}`);
  }
  if (plan.weakCategoryCount > 0) {
    parts.push(`${plan.weakCategoryCount} weak-area drill${plan.weakCategoryCount !== 1 ? "s" : ""}`);
  }
  if (plan.newCount > 0) {
    parts.push(`${plan.newCount} new item${plan.newCount !== 1 ? "s" : ""}`);
  }
  return `${parts.join(" + ")} · ~${plan.estimatedMinutes} min`;
}
