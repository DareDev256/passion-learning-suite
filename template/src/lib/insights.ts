// ─── Passionate Learning — Player Insights Engine ───
// Pure functions that transform raw progress + analytics into displayable insights.
// No side effects, no localStorage access — takes data in, returns insights out.

import { UserProgress, ItemScore, ContentItem } from "@/types/game";

export interface CategoryStrength {
  categoryId: string;
  totalItems: number;
  accuracy: number;        // 0-100
  strongCount: number;     // correct > incorrect
  weakCount: number;       // incorrect >= correct
}

export interface WeakItem {
  itemId: string;
  correct: number;
  incorrect: number;
  ratio: number;           // correct / total attempts — lower = weaker
  daysSinceReview: number;
}

/**
 * Compute per-category accuracy from item scores.
 * Items are grouped by splitting their ID on the first `-` or `.` delimiter.
 * @param items - Content items with category field
 * @param scores - Player's item score map
 */
export function computeCategoryStrengths(
  items: Pick<ContentItem, "id" | "category">[],
  scores: Record<string, ItemScore>,
): CategoryStrength[] {
  const groups = new Map<string, { total: number; correct: number; incorrect: number; strong: number; weak: number }>();

  for (const item of items) {
    const cat = item.category;
    const score = scores[item.id];
    if (!score || (score.correct + score.incorrect === 0)) continue;

    const group = groups.get(cat) ?? { total: 0, correct: 0, incorrect: 0, strong: 0, weak: 0 };
    group.total += 1;
    group.correct += score.correct;
    group.incorrect += score.incorrect;
    group.strong += score.correct > score.incorrect ? 1 : 0;
    group.weak += score.incorrect >= score.correct ? 1 : 0;
    groups.set(cat, group);
  }

  return Array.from(groups.entries())
    .map(([categoryId, g]) => ({
      categoryId,
      totalItems: g.total,
      accuracy: g.correct + g.incorrect > 0
        ? Math.round((g.correct / (g.correct + g.incorrect)) * 100)
        : 0,
      strongCount: g.strong,
      weakCount: g.weak,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

/**
 * Find the weakest items — lowest correct-to-total ratio, most in need of review.
 * @param scores - Player's item score map
 * @param limit - Max items to return (default 5)
 */
export function findWeakestItems(
  scores: Record<string, ItemScore>,
  limit = 5,
): WeakItem[] {
  const now = Date.now();
  return Object.entries(scores)
    .filter(([, s]) => s.correct + s.incorrect > 0)
    .map(([itemId, s]) => ({
      itemId,
      correct: s.correct,
      incorrect: s.incorrect,
      ratio: s.correct / (s.correct + s.incorrect),
      daysSinceReview: Math.floor((now - s.lastSeen) / 86_400_000),
    }))
    .sort((a, b) => a.ratio - b.ratio || b.daysSinceReview - a.daysSinceReview)
    .slice(0, limit);
}

/**
 * Compute a learning velocity score: mastered items relative to total seen.
 * Higher = converting more exposure into mastery.
 * @returns 0-100 percentage, or 0 if no items seen
 */
export function computeMasteryRate(totalSeen: number, totalMastered: number): number {
  if (totalSeen <= 0) return 0;
  return Math.round((totalMastered / totalSeen) * 100);
}
