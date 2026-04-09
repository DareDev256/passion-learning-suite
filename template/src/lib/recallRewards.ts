// ─── Passionate Learning — Recall Rewards Engine ───
// Surfaces the delayed-reward XP system as player-facing countdowns.
// Scans item scores to find items approaching 7-day (2×) and 30-day (3×)
// recall windows. Pure functions, SSR-safe, injectable timestamps for testing.

import { ItemScore } from "@/types/game";

const MS_PER_DAY = 86_400_000;

export type RewardTier = "2x" | "3x";

export interface UpcomingReward {
  itemId: string;
  tier: RewardTier;
  /** Days until the reward window opens (0 = claimable now). */
  daysUntil: number;
  /** Unix timestamp when the window opens. */
  availableAt: number;
}

export interface RecallRewardsSummary {
  /** Items currently in a bonus window (eligible right now). */
  claimable: UpcomingReward[];
  /** Items approaching a bonus window within the lookahead. */
  upcoming: UpcomingReward[];
  /** Total potential bonus XP if all claimable items are reviewed correctly. */
  claimableXP: number;
}

/**
 * Compute upcoming recall reward windows for all scored items.
 * Items last seen 5-6 days ago → "2× in N days". Items 28-29 days ago → "3× in N days".
 * Items already in window (7-29 days = 2×, 30+ days = 3×) show as claimable.
 *
 * @param scores - Player's item score map
 * @param lookaheadDays - How far ahead to scan (default 3)
 * @param baseXP - XP per correct answer for bonus calculation (default 10)
 * @param now - Injectable timestamp for testing (default Date.now())
 */
export function computeRecallRewards(
  scores: Record<string, ItemScore>,
  lookaheadDays = 3,
  baseXP = 10,
  now = Date.now(),
): RecallRewardsSummary {
  const claimable: UpcomingReward[] = [];
  const upcoming: UpcomingReward[] = [];

  for (const [itemId, score] of Object.entries(scores)) {
    if (score.correct + score.incorrect === 0) continue;
    const daysSince = (now - score.lastSeen) / MS_PER_DAY;

    // 30+ days → 3× claimable now
    if (daysSince >= 30) {
      claimable.push({ itemId, tier: "3x", daysUntil: 0, availableAt: score.lastSeen + 30 * MS_PER_DAY });
    }
    // 7-29 days → 2× claimable now
    else if (daysSince >= 7) {
      claimable.push({ itemId, tier: "2x", daysUntil: 0, availableAt: score.lastSeen + 7 * MS_PER_DAY });
    }
    // Approaching 30-day window (already past 7-day, so 30 - daysSince <= lookahead)
    // This case is covered by the 7-29 claimable check above, so we only look
    // at items approaching the 7-day threshold from below
    else if (daysSince >= 7 - lookaheadDays) {
      const daysUntil = Math.ceil(7 - daysSince);
      if (daysUntil > 0) {
        upcoming.push({ itemId, tier: "2x", daysUntil, availableAt: score.lastSeen + 7 * MS_PER_DAY });
      }
    }
  }

  // Sort: claimable by tier (3× first), upcoming by daysUntil ascending
  claimable.sort((a, b) => (a.tier === "3x" ? -1 : 1) - (b.tier === "3x" ? -1 : 1) || a.itemId.localeCompare(b.itemId));
  upcoming.sort((a, b) => a.daysUntil - b.daysUntil || a.itemId.localeCompare(b.itemId));

  const claimableXP = claimable.reduce((sum, r) => sum + baseXP * (r.tier === "3x" ? 3 : 2), 0);

  return { claimable, upcoming, claimableXP };
}

/**
 * Count total rewards available (claimable + upcoming).
 * Useful for badge counts on navigation elements.
 */
export function countRewards(summary: RecallRewardsSummary): number {
  return summary.claimable.length + summary.upcoming.length;
}
