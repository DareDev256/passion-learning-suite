import { describe, it, expect } from "vitest";
import {
  computeCategoryStrengths,
  findWeakestItems,
  computeMasteryRate,
} from "@/lib/insights";
import { ItemScore } from "@/types/game";

const now = Date.now();
const day = 86_400_000;

function makeScore(correct: number, incorrect: number, daysAgo = 0): ItemScore {
  return { correct, incorrect, lastSeen: now - daysAgo * day };
}

describe("computeCategoryStrengths", () => {
  const items = [
    { id: "a1", category: "basics" },
    { id: "a2", category: "basics" },
    { id: "b1", category: "advanced" },
  ];

  it("returns empty array when no scores match", () => {
    expect(computeCategoryStrengths(items, {})).toEqual([]);
  });

  it("computes per-category accuracy from item scores", () => {
    const scores: Record<string, ItemScore> = {
      a1: makeScore(8, 2),
      a2: makeScore(6, 4),
      b1: makeScore(3, 7),
    };
    const result = computeCategoryStrengths(items, scores);
    expect(result).toHaveLength(2);
    // basics: 14 correct / 20 total = 70%
    const basics = result.find((r) => r.categoryId === "basics")!;
    expect(basics.accuracy).toBe(70);
    expect(basics.totalItems).toBe(2);
    expect(basics.strongCount).toBe(2);
    expect(basics.weakCount).toBe(0);
    // advanced: 3/10 = 30%
    const advanced = result.find((r) => r.categoryId === "advanced")!;
    expect(advanced.accuracy).toBe(30);
    expect(advanced.weakCount).toBe(1);
  });

  it("sorts by accuracy descending", () => {
    const scores: Record<string, ItemScore> = {
      a1: makeScore(1, 9),
      b1: makeScore(9, 1),
    };
    const result = computeCategoryStrengths(items, scores);
    expect(result[0].categoryId).toBe("advanced");
    expect(result[1].categoryId).toBe("basics");
  });

  it("skips items with zero attempts", () => {
    const scores: Record<string, ItemScore> = {
      a1: makeScore(0, 0),
      b1: makeScore(5, 5),
    };
    const result = computeCategoryStrengths(items, scores);
    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe("advanced");
  });
});

describe("findWeakestItems", () => {
  it("returns empty array for empty scores", () => {
    expect(findWeakestItems({})).toEqual([]);
  });

  it("ranks items by worst correct-to-total ratio", () => {
    const scores: Record<string, ItemScore> = {
      good: makeScore(9, 1),
      bad: makeScore(1, 9),
      mid: makeScore(5, 5),
    };
    const result = findWeakestItems(scores, 3);
    expect(result[0].itemId).toBe("bad");
    expect(result[0].ratio).toBeCloseTo(0.1);
    expect(result[1].itemId).toBe("mid");
    expect(result[2].itemId).toBe("good");
  });

  it("respects limit parameter", () => {
    const scores: Record<string, ItemScore> = {
      a: makeScore(1, 5),
      b: makeScore(2, 5),
      c: makeScore(3, 5),
    };
    expect(findWeakestItems(scores, 2)).toHaveLength(2);
  });

  it("breaks ties by days since review (older first)", () => {
    const scores: Record<string, ItemScore> = {
      recent: makeScore(5, 5, 1),
      stale: makeScore(5, 5, 30),
    };
    const result = findWeakestItems(scores, 2);
    expect(result[0].itemId).toBe("stale");
  });

  it("computes daysSinceReview correctly", () => {
    const scores: Record<string, ItemScore> = {
      item: makeScore(1, 1, 7),
    };
    const result = findWeakestItems(scores);
    expect(result[0].daysSinceReview).toBe(7);
  });

  it("excludes items with zero attempts", () => {
    const scores: Record<string, ItemScore> = {
      unseen: makeScore(0, 0),
      seen: makeScore(1, 3),
    };
    const result = findWeakestItems(scores);
    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe("seen");
  });
});

describe("computeMasteryRate", () => {
  it("returns 0 when no items seen", () => {
    expect(computeMasteryRate(0, 0)).toBe(0);
  });

  it("returns 100 when all items mastered", () => {
    expect(computeMasteryRate(10, 10)).toBe(100);
  });

  it("returns correct percentage for partial mastery", () => {
    expect(computeMasteryRate(20, 5)).toBe(25);
  });

  it("rounds to nearest integer", () => {
    expect(computeMasteryRate(3, 1)).toBe(33);
  });

  it("handles negative totalSeen gracefully", () => {
    expect(computeMasteryRate(-1, 5)).toBe(0);
  });
});
