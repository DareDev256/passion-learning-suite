// ─── Passionate Learning — Mastery Milestone Predictor ───
// Forward-looking engine that projects when each category will be mastered.
// Combines per-category item progress with learning velocity to estimate
// completion timelines. Addresses MASTER_SPEC "time-to-mastery" analytics.
// Pure functions — no side effects, no storage access.

import type { ContentItem, ItemScore } from "@/types/game";

/** Ratio of correct/(correct+incorrect) required to count an item as mastered. */
export const MASTERY_RATIO = 0.8;

/** Minimum attempts before an item can qualify as mastered (prevents single-correct flukes). */
export const MIN_ATTEMPTS_FOR_MASTERY = 3;

export type MilestoneStatus =
  | "locked"        // 0% — never attempted
  | "emerging"      // 1-30% — just getting started
  | "progressing"   // 31-70% — solid work in progress
  | "near-mastery"  // 71-99% — almost there
  | "mastered";     // 100% of items cleared

export interface CategoryMilestone {
  categoryId: string;
  itemsMastered: number;
  totalItems: number;
  masteryPercent: number;       // 0-100, rounded
  status: MilestoneStatus;
  estimatedSessionsLeft: number; // projected sessions to 100%, -1 if unprojectable
}

export interface MilestoneReport {
  categories: CategoryMilestone[];
  overallPercent: number;        // weighted by item count
  nextMilestone: CategoryMilestone | null; // closest to completion (non-mastered)
  totalItemsMastered: number;
  totalItems: number;
  estimatedTotalSessions: number; // sessions to master everything, -1 if unprojectable
}

/**
 * Determine whether a single item is mastered based on its score record.
 * Requires both a minimum attempt count and a minimum accuracy ratio.
 */
export function isItemMastered(score: ItemScore | undefined): boolean {
  if (!score) return false;
  const total = score.correct + score.incorrect;
  if (total < MIN_ATTEMPTS_FOR_MASTERY) return false;
  return score.correct / total >= MASTERY_RATIO;
}

/**
 * Classify a mastery percentage into a human-readable status tier.
 */
export function classifyStatus(percent: number): MilestoneStatus {
  if (percent <= 0) return "locked";
  if (percent <= 30) return "emerging";
  if (percent <= 70) return "progressing";
  if (percent < 100) return "near-mastery";
  return "mastered";
}

/**
 * Estimate how many sessions remain to master a category's unmastered items.
 * Uses the player's historical mastery rate (items mastered per session).
 *
 * @param remaining - Number of unmastered items
 * @param masteryRate - Items mastered per session (from velocity data)
 * @returns Estimated sessions, or -1 if rate is zero/unprojectable
 */
export function projectSessions(remaining: number, masteryRate: number): number {
  if (remaining <= 0) return 0;
  if (masteryRate <= 0 || !Number.isFinite(masteryRate)) return -1;
  return Math.ceil(remaining / masteryRate);
}

/**
 * Build per-category milestone data from content items and player scores.
 * Categories are derived from the items' `category` field.
 */
export function computeCategoryMilestones(
  items: Pick<ContentItem, "id" | "category">[],
  scores: Record<string, ItemScore>,
): Omit<CategoryMilestone, "estimatedSessionsLeft">[] {
  const groups = new Map<string, { total: number; mastered: number }>();

  for (const item of items) {
    const g = groups.get(item.category) ?? { total: 0, mastered: 0 };
    g.total += 1;
    if (isItemMastered(scores[item.id])) g.mastered += 1;
    groups.set(item.category, g);
  }

  return Array.from(groups.entries())
    .map(([categoryId, g]) => {
      const masteryPercent = g.total > 0
        ? Math.round((g.mastered / g.total) * 100)
        : 0;
      return {
        categoryId,
        itemsMastered: g.mastered,
        totalItems: g.total,
        masteryPercent,
        status: classifyStatus(masteryPercent),
      };
    })
    .sort((a, b) => b.masteryPercent - a.masteryPercent);
}

/**
 * Build the full milestone report with completion projections.
 *
 * @param items - All content items in the curriculum
 * @param scores - Player's per-item score records
 * @param masteryRate - Average items mastered per session (from velocity engine)
 */
export function buildMilestoneReport(
  items: Pick<ContentItem, "id" | "category">[],
  scores: Record<string, ItemScore>,
  masteryRate: number,
): MilestoneReport {
  const raw = computeCategoryMilestones(items, scores);

  const categories: CategoryMilestone[] = raw.map((c) => ({
    ...c,
    estimatedSessionsLeft: projectSessions(c.totalItems - c.itemsMastered, masteryRate),
  }));

  const totalItems = categories.reduce((s, c) => s + c.totalItems, 0);
  const totalItemsMastered = categories.reduce((s, c) => s + c.itemsMastered, 0);
  const overallPercent = totalItems > 0
    ? Math.round((totalItemsMastered / totalItems) * 100)
    : 0;

  // Next milestone = non-mastered category closest to 100%
  const candidates = categories
    .filter((c) => c.status !== "mastered" && c.totalItems > 0)
    .sort((a, b) => b.masteryPercent - a.masteryPercent);
  const nextMilestone = candidates[0] ?? null;

  const totalRemaining = totalItems - totalItemsMastered;
  const estimatedTotalSessions = projectSessions(totalRemaining, masteryRate);

  return {
    categories,
    overallPercent,
    nextMilestone,
    totalItemsMastered,
    totalItems,
    estimatedTotalSessions,
  };
}
