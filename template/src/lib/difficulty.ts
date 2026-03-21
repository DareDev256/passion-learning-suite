// ─── Passionate Learning — Adaptive Difficulty Engine ───
// Kumon-style diagnostic placement: analyze rolling performance per difficulty
// tier, then auto-select the right challenge level. Works with any game's
// ContentItem[] — no game-specific logic here.

import { ContentItem } from "@/types/game";
import { getProgress } from "@/lib/storage";

export type Difficulty = "easy" | "medium" | "hard";

const TIERS: readonly Difficulty[] = ["easy", "medium", "hard"];
const WINDOW = 5;            // rolling window of recent answers per tier
const PROMOTE_THRESHOLD = 85; // accuracy % to move up
const DEMOTE_THRESHOLD = 50;  // accuracy % to move down

interface TierPerformance {
  accuracy: number;    // 0-100, NaN if no data
  attempts: number;    // total answers in this tier
  streak: number;      // consecutive correct in this tier
}

export interface DifficultyProfile {
  recommended: Difficulty;
  performance: Record<Difficulty, TierPerformance>;
  confidence: "new" | "low" | "high";
}

/**
 * Analyze the player's per-difficulty performance from their itemScores.
 * Groups items by difficulty, computes rolling accuracy per tier,
 * then recommends the optimal difficulty level.
 *
 * @param items - Full content catalog (needs difficulty + id fields)
 * @returns Profile with recommended difficulty and per-tier stats
 */
export function analyzeDifficulty(items: ContentItem[]): DifficultyProfile {
  const progress = getProgress();
  const scores = progress.itemScores;

  // Build a difficulty lookup: itemId → difficulty
  const difficultyMap = new Map<string, Difficulty>();
  for (const item of items) {
    difficultyMap.set(item.id, item.difficulty);
  }

  // Bucket scores by difficulty tier
  const buckets: Record<Difficulty, { correct: number; incorrect: number; lastSeen: number }[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  for (const [itemId, score] of Object.entries(scores)) {
    const diff = difficultyMap.get(itemId);
    if (diff && buckets[diff]) {
      buckets[diff].push(score);
    }
  }

  // Compute per-tier performance from the most recent WINDOW items
  const performance: Record<Difficulty, TierPerformance> = {} as Record<Difficulty, TierPerformance>;

  for (const tier of TIERS) {
    const bucket = buckets[tier]
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, WINDOW);

    const totalCorrect = bucket.reduce((sum, s) => sum + s.correct, 0);
    const totalIncorrect = bucket.reduce((sum, s) => sum + s.incorrect, 0);
    const total = totalCorrect + totalIncorrect;

    // Compute consecutive correct streak (from most recent)
    let streak = 0;
    for (const s of bucket) {
      if (s.correct > 0 && s.incorrect === 0) streak++;
      else break;
    }

    performance[tier] = {
      accuracy: total > 0 ? Math.round((totalCorrect / total) * 100) : NaN,
      attempts: total,
      streak,
    };
  }

  // Determine recommendation using tier ladder logic
  const recommended = computeRecommendation(performance);

  // Confidence: how sure are we about the recommendation?
  const totalAttempts = TIERS.reduce((sum, t) => sum + performance[t].attempts, 0);
  const confidence: DifficultyProfile["confidence"] =
    totalAttempts === 0 ? "new" :
    totalAttempts < WINDOW ? "low" :
    "high";

  return { recommended, performance, confidence };
}

/** Tier ladder: promote if crushing it, demote if struggling, else hold. */
function computeRecommendation(perf: Record<Difficulty, TierPerformance>): Difficulty {
  // Start from easy and climb
  // If easy accuracy is high enough → try medium
  // If medium accuracy is high enough → try hard
  // If any tier accuracy is too low → stay at that tier or drop

  const easyAcc = perf.easy.accuracy;
  const medAcc = perf.medium.accuracy;
  const hardAcc = perf.hard.accuracy;

  // No data at all → start easy
  if (isNaN(easyAcc) && isNaN(medAcc) && isNaN(hardAcc)) return "easy";

  // If player has hard-tier data and is doing well, stay hard
  if (!isNaN(hardAcc) && hardAcc >= DEMOTE_THRESHOLD) return "hard";

  // If player has medium-tier data
  if (!isNaN(medAcc)) {
    if (medAcc >= PROMOTE_THRESHOLD) return "hard";
    if (medAcc >= DEMOTE_THRESHOLD) return "medium";
    return "easy"; // struggling at medium → drop
  }

  // Only easy-tier data exists
  if (!isNaN(easyAcc) && easyAcc >= PROMOTE_THRESHOLD) return "medium";

  return "easy";
}

/**
 * Select content items at the recommended difficulty, with intelligent fallback.
 * Prefers unseen items, then least-recently-seen items. Falls back to adjacent
 * tiers if the recommended tier has insufficient items.
 *
 * @param items - Full content catalog
 * @param count - Number of items to select (default 5)
 * @param profile - Pre-computed profile (or computes fresh)
 * @returns Selected items at or near the recommended difficulty
 */
export function selectItems(
  items: ContentItem[],
  count = 5,
  profile?: DifficultyProfile,
): ContentItem[] {
  const { recommended } = profile ?? analyzeDifficulty(items);
  const progress = getProgress();
  const scores = progress.itemScores;

  // Rank items: unseen first, then oldest-seen, filtered by difficulty
  const rank = (item: ContentItem): number => {
    const score = scores[item.id];
    if (!score) return 0; // unseen → highest priority
    return score.lastSeen;  // older → higher priority
  };

  // Try recommended tier first, then adjacent tiers
  const tierOrder = buildTierOrder(recommended);

  const selected: ContentItem[] = [];
  const usedIds = new Set<string>();

  for (const tier of tierOrder) {
    if (selected.length >= count) break;

    const candidates = items
      .filter((item) => item.difficulty === tier && !usedIds.has(item.id))
      .sort((a, b) => rank(a) - rank(b));

    for (const item of candidates) {
      if (selected.length >= count) break;
      selected.push(item);
      usedIds.add(item.id);
    }
  }

  return selected;
}

/** Build tier search order: recommended first, then adjacent, then remaining. */
function buildTierOrder(recommended: Difficulty): Difficulty[] {
  const idx = TIERS.indexOf(recommended);
  const order: Difficulty[] = [recommended];

  // Add adjacent tiers (prefer harder over easier for growth mindset)
  if (idx + 1 < TIERS.length) order.push(TIERS[idx + 1]);
  if (idx - 1 >= 0) order.push(TIERS[idx - 1]);

  // Deduplicate (shouldn't be needed but defensive)
  return [...new Set(order)];
}
