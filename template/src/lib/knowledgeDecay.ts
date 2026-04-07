// ─── Passionate Learning — Knowledge Decay Predictor ───
// Forward-looking engine that uses FSRS card stability to predict
// which items will drop below the retention threshold and when.
// Pure functions — takes FSRS cards in, returns decay forecasts out.
// Addresses MASTER_SPEC learning analytics: "retention decay (1/7/30 day)".

import { FSRSCard } from "@/lib/storage";
import { ContentItem } from "@/types/game";

/** Forecast horizons in days. */
export const DECAY_HORIZONS = [1, 3, 7, 14, 30] as const;
export type DecayHorizon = (typeof DECAY_HORIZONS)[number];

/** A single item predicted to decay below retention threshold. */
export interface DecayingItem {
  itemId: string;
  category: string;
  currentRetention: number;    // 0-100, estimated now
  retentionAtHorizon: number;  // 0-100, predicted at horizon
  daysUntilThreshold: number;  // days until R drops below target
  stability: number;           // FSRS stability value
  daysSinceReview: number;     // days since last review
}

/** Per-category risk summary. */
export interface CategoryRisk {
  categoryId: string;
  atRiskCount: number;         // items decaying within horizon
  avgRetention: number;        // mean current retention 0-100
  urgency: "critical" | "warning" | "stable";
}

/** Full decay forecast across all horizons. */
export interface DecayForecast {
  horizon: DecayHorizon;
  atRiskItems: DecayingItem[];
  categoryRisks: CategoryRisk[];
  totalAtRisk: number;
  healthScore: number;         // 0-100, overall knowledge health
}

const MS_PER_DAY = 86_400_000;
const DEFAULT_RETENTION_TARGET = 0.9;

/**
 * FSRS retrievability: R = e^(-t/S)
 * @param daysSinceReview - Elapsed days since last review
 * @param stability - FSRS stability (higher = slower decay)
 * @returns Retention as 0-1 fraction
 */
export function retrievability(daysSinceReview: number, stability: number): number {
  if (stability <= 0 || !Number.isFinite(stability)) return 0;
  if (daysSinceReview <= 0 || !Number.isFinite(daysSinceReview)) return 1;
  return Math.exp(-daysSinceReview / stability);
}

/**
 * Days until retention drops to target threshold.
 * Solves: target = e^(-t/S) → t = -S × ln(target)
 * @returns Days from last review until threshold is breached
 */
export function daysUntilDecay(stability: number, target = DEFAULT_RETENTION_TARGET): number {
  if (stability <= 0 || !Number.isFinite(stability)) return 0;
  if (target <= 0 || target >= 1) return 0;
  return -stability * Math.log(target);
}

/**
 * Predict decaying items for a given horizon.
 * @param cards - FSRS card states from storage
 * @param items - Content catalog (for category lookup)
 * @param horizonDays - How far ahead to look
 * @param now - Current timestamp (injectable for testing)
 * @param retentionTarget - Minimum acceptable retention (default 0.9)
 */
export function predictDecay(
  cards: FSRSCard[],
  items: Pick<ContentItem, "id" | "category">[],
  horizonDays: DecayHorizon,
  now = Date.now(),
  retentionTarget = DEFAULT_RETENTION_TARGET,
): DecayForecast {
  const itemMap = new Map(items.map((i) => [i.id, i.category]));
  const decaying: DecayingItem[] = [];

  for (const card of cards) {
    if (card.reps === 0) continue; // never reviewed — not decaying, just new
    const elapsed = (now - card.lastReview) / MS_PER_DAY;
    const currentR = retrievability(elapsed, card.stability);
    const futureR = retrievability(elapsed + horizonDays, card.stability);
    const thresholdDay = daysUntilDecay(card.stability, retentionTarget);
    const daysLeft = Math.max(0, thresholdDay - elapsed);

    // Item is "at risk" if it will breach threshold within the horizon
    if (futureR < retentionTarget) {
      decaying.push({
        itemId: card.itemId,
        category: itemMap.get(card.itemId) ?? "unknown",
        currentRetention: Math.round(currentR * 100),
        retentionAtHorizon: Math.round(futureR * 100),
        daysUntilThreshold: Math.round(daysLeft * 10) / 10,
        stability: card.stability,
        daysSinceReview: Math.round(elapsed * 10) / 10,
      });
    }
  }

  // Sort by urgency — lowest retention first
  decaying.sort((a, b) => a.daysUntilThreshold - b.daysUntilThreshold);

  // Aggregate per-category risk
  const catGroups = new Map<string, { count: number; retSum: number }>();
  for (const d of decaying) {
    const g = catGroups.get(d.category) ?? { count: 0, retSum: 0 };
    g.count += 1;
    g.retSum += d.currentRetention;
    catGroups.set(d.category, g);
  }

  const categoryRisks: CategoryRisk[] = Array.from(catGroups.entries())
    .map(([categoryId, g]) => ({
      categoryId,
      atRiskCount: g.count,
      avgRetention: Math.round(g.retSum / g.count),
      urgency: g.count >= 5 ? "critical" as const
             : g.count >= 2 ? "warning" as const
             : "stable" as const,
    }))
    .sort((a, b) => b.atRiskCount - a.atRiskCount);

  // Health score: % of reviewed cards still above threshold
  const reviewedCards = cards.filter((c) => c.reps > 0);
  const safeCount = reviewedCards.length - decaying.length;
  const healthScore = reviewedCards.length > 0
    ? Math.round((safeCount / reviewedCards.length) * 100)
    : 100;

  return {
    horizon: horizonDays,
    atRiskItems: decaying,
    categoryRisks,
    totalAtRisk: decaying.length,
    healthScore,
  };
}

/**
 * Generate forecasts across all standard horizons (1, 3, 7, 14, 30 days).
 * Returns an array of DecayForecast, one per horizon.
 */
export function fullDecayForecast(
  cards: FSRSCard[],
  items: Pick<ContentItem, "id" | "category">[],
  now = Date.now(),
): DecayForecast[] {
  return DECAY_HORIZONS.map((h) => predictDecay(cards, items, h, now));
}
