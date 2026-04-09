import { describe, it, expect } from "vitest";
import { computeRecallRewards, countRewards } from "@/lib/recallRewards";
import { ItemScore } from "@/types/game";

const MS_PER_DAY = 86_400_000;
const NOW = 1_700_000_000_000; // fixed timestamp for determinism

function makeScore(daysAgo: number, correct = 3, incorrect = 1): ItemScore {
  return { correct, incorrect, lastSeen: NOW - daysAgo * MS_PER_DAY };
}

describe("recallRewards", () => {
  describe("computeRecallRewards", () => {
    it("returns empty when no items scored", () => {
      const result = computeRecallRewards({}, 3, 10, NOW);
      expect(result.claimable).toHaveLength(0);
      expect(result.upcoming).toHaveLength(0);
      expect(result.claimableXP).toBe(0);
    });

    it("ignores items with zero attempts", () => {
      const scores = { "item-a": { correct: 0, incorrect: 0, lastSeen: NOW - 10 * MS_PER_DAY } };
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.claimable).toHaveLength(0);
    });

    it("marks 7+ day items as 2× claimable", () => {
      const scores = { "item-a": makeScore(8) };
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.claimable).toHaveLength(1);
      expect(result.claimable[0].tier).toBe("2x");
      expect(result.claimable[0].daysUntil).toBe(0);
    });

    it("marks 30+ day items as 3× claimable", () => {
      const scores = { "item-a": makeScore(35) };
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.claimable).toHaveLength(1);
      expect(result.claimable[0].tier).toBe("3x");
    });

    it("marks items approaching 7-day window as upcoming", () => {
      const scores = { "item-a": makeScore(5) }; // 2 days until 7-day window
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.upcoming).toHaveLength(1);
      expect(result.upcoming[0].tier).toBe("2x");
      expect(result.upcoming[0].daysUntil).toBe(2);
    });

    it("excludes items outside lookahead window", () => {
      const scores = { "item-a": makeScore(2) }; // 5 days until 7-day window, beyond 3-day lookahead
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.upcoming).toHaveLength(0);
    });

    it("respects custom lookahead", () => {
      const scores = { "item-a": makeScore(2) };
      const result = computeRecallRewards(scores, 6, 10, NOW);
      expect(result.upcoming).toHaveLength(1);
      expect(result.upcoming[0].daysUntil).toBe(5);
    });

    it("sorts claimable: 3× before 2×", () => {
      const scores = {
        "item-a": makeScore(10),  // 2×
        "item-b": makeScore(40),  // 3×
        "item-c": makeScore(8),   // 2×
      };
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.claimable[0].tier).toBe("3x");
      expect(result.claimable[1].tier).toBe("2x");
    });

    it("sorts upcoming by daysUntil ascending", () => {
      const scores = {
        "item-a": makeScore(5),   // 2 days until
        "item-b": makeScore(6),   // 1 day until
      };
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.upcoming[0].itemId).toBe("item-b");
      expect(result.upcoming[1].itemId).toBe("item-a");
    });

    it("computes claimableXP correctly for mixed tiers", () => {
      const scores = {
        "item-a": makeScore(10),  // 2× = 20 XP
        "item-b": makeScore(40),  // 3× = 30 XP
      };
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.claimableXP).toBe(50);
    });

    it("handles exact 7-day boundary as claimable", () => {
      const scores = { "item-a": makeScore(7) };
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.claimable).toHaveLength(1);
      expect(result.claimable[0].tier).toBe("2x");
    });

    it("handles exact 30-day boundary as 3× claimable", () => {
      const scores = { "item-a": makeScore(30) };
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.claimable).toHaveLength(1);
      expect(result.claimable[0].tier).toBe("3x");
    });

    it("respects custom baseXP for claimableXP calculation", () => {
      const scores = { "item-a": makeScore(10) };
      const result = computeRecallRewards(scores, 3, 25, NOW);
      expect(result.claimableXP).toBe(50); // 25 * 2
    });

    it("handles many items efficiently", () => {
      const scores: Record<string, ItemScore> = {};
      for (let i = 0; i < 100; i++) {
        scores[`item-${i}`] = makeScore(i % 40);
      }
      const result = computeRecallRewards(scores, 3, 10, NOW);
      expect(result.claimable.length + result.upcoming.length).toBeGreaterThan(0);
    });
  });

  describe("countRewards", () => {
    it("sums claimable and upcoming", () => {
      const scores = {
        "item-a": makeScore(10),  // claimable
        "item-b": makeScore(5),   // upcoming
      };
      const summary = computeRecallRewards(scores, 3, 10, NOW);
      expect(countRewards(summary)).toBe(2);
    });

    it("returns 0 for empty summary", () => {
      const summary = computeRecallRewards({}, 3, 10, NOW);
      expect(countRewards(summary)).toBe(0);
    });
  });
});
