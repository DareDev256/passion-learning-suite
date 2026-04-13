import { describe, it, expect } from "vitest";
import {
  isItemMastered,
  classifyStatus,
  projectSessions,
  computeCategoryMilestones,
  buildMilestoneReport,
  MASTERY_RATIO,
  MIN_ATTEMPTS_FOR_MASTERY,
} from "@/lib/masteryMilestones";
import type { ItemScore } from "@/types/game";

// ─── Helpers ───

const score = (correct: number, incorrect: number, lastSeen = 1000): ItemScore => ({
  correct,
  incorrect,
  lastSeen,
});

const item = (id: string, category: string) => ({ id, category, prompt: "", answer: "", difficulty: "easy" as const });

// ─── isItemMastered ───

describe("isItemMastered", () => {
  it("returns false for undefined score", () => {
    expect(isItemMastered(undefined)).toBe(false);
  });

  it("returns false when attempts below minimum threshold", () => {
    expect(isItemMastered(score(2, 0))).toBe(false); // 2 < MIN_ATTEMPTS_FOR_MASTERY
  });

  it("returns true when ratio meets threshold with enough attempts", () => {
    // 4/5 = 0.8 exactly, meets MASTERY_RATIO
    expect(isItemMastered(score(4, 1))).toBe(true);
  });

  it("returns false when ratio is below threshold", () => {
    // 2/4 = 0.5, below 0.8
    expect(isItemMastered(score(2, 2))).toBe(false);
  });

  it("returns true for perfect score with enough attempts", () => {
    expect(isItemMastered(score(5, 0))).toBe(true);
  });

  it("returns false for zero correct with many attempts", () => {
    expect(isItemMastered(score(0, 5))).toBe(false);
  });

  it("handles boundary: exactly MIN_ATTEMPTS_FOR_MASTERY total", () => {
    // 3/3 = 1.0, meets both thresholds
    expect(isItemMastered(score(3, 0))).toBe(true);
    // 2/3 ≈ 0.667, below MASTERY_RATIO
    expect(isItemMastered(score(2, 1))).toBe(false);
  });
});

// ─── classifyStatus ───

describe("classifyStatus", () => {
  it("classifies 0% as locked", () => {
    expect(classifyStatus(0)).toBe("locked");
  });

  it("classifies 1-30% as emerging", () => {
    expect(classifyStatus(1)).toBe("emerging");
    expect(classifyStatus(15)).toBe("emerging");
    expect(classifyStatus(30)).toBe("emerging");
  });

  it("classifies 31-70% as progressing", () => {
    expect(classifyStatus(31)).toBe("progressing");
    expect(classifyStatus(50)).toBe("progressing");
    expect(classifyStatus(70)).toBe("progressing");
  });

  it("classifies 71-99% as near-mastery", () => {
    expect(classifyStatus(71)).toBe("near-mastery");
    expect(classifyStatus(99)).toBe("near-mastery");
  });

  it("classifies 100% as mastered", () => {
    expect(classifyStatus(100)).toBe("mastered");
  });

  it("classifies negative as locked", () => {
    expect(classifyStatus(-5)).toBe("locked");
  });
});

// ─── projectSessions ───

describe("projectSessions", () => {
  it("returns 0 when nothing remaining", () => {
    expect(projectSessions(0, 2)).toBe(0);
  });

  it("returns -1 when mastery rate is zero", () => {
    expect(projectSessions(10, 0)).toBe(-1);
  });

  it("returns -1 for negative mastery rate", () => {
    expect(projectSessions(5, -1)).toBe(-1);
  });

  it("returns -1 for NaN mastery rate", () => {
    expect(projectSessions(5, NaN)).toBe(-1);
  });

  it("returns -1 for Infinity mastery rate", () => {
    expect(projectSessions(5, Infinity)).toBe(-1);
  });

  it("rounds up to next whole session", () => {
    // 7 items / 3 per session = 2.33 → 3
    expect(projectSessions(7, 3)).toBe(3);
  });

  it("exact division returns exact sessions", () => {
    expect(projectSessions(10, 5)).toBe(2);
  });

  it("handles fractional mastery rate", () => {
    // 5 items / 0.5 per session = 10
    expect(projectSessions(5, 0.5)).toBe(10);
  });
});

// ─── computeCategoryMilestones ───

describe("computeCategoryMilestones", () => {
  it("returns empty array for no items", () => {
    expect(computeCategoryMilestones([], {})).toEqual([]);
  });

  it("computes correct mastery for single category", () => {
    const items = [item("a", "cat1"), item("b", "cat1"), item("c", "cat1")];
    const scores = { a: score(5, 0), b: score(4, 1), c: score(1, 3) }; // a: mastered, b: mastered, c: not
    const result = computeCategoryMilestones(items, scores);
    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe("cat1");
    expect(result[0].itemsMastered).toBe(2);
    expect(result[0].totalItems).toBe(3);
    expect(result[0].masteryPercent).toBe(67);
    expect(result[0].status).toBe("progressing");
  });

  it("handles items with no scores as unmastered", () => {
    const items = [item("a", "cat1"), item("b", "cat1")];
    const result = computeCategoryMilestones(items, {});
    expect(result[0].itemsMastered).toBe(0);
    expect(result[0].masteryPercent).toBe(0);
    expect(result[0].status).toBe("locked");
  });

  it("sorts categories by mastery percent descending", () => {
    const items = [item("a", "easy"), item("b", "hard")];
    const scores = { a: score(5, 0), b: score(1, 4) };
    const result = computeCategoryMilestones(items, scores);
    expect(result[0].categoryId).toBe("easy");
    expect(result[1].categoryId).toBe("hard");
  });

  it("groups items correctly across multiple categories", () => {
    const items = [
      item("a1", "alpha"), item("a2", "alpha"),
      item("b1", "beta"), item("b2", "beta"), item("b3", "beta"),
    ];
    const scores = {
      a1: score(5, 0), a2: score(5, 0), // both mastered
      b1: score(5, 0),                   // 1 of 3 mastered
    };
    const result = computeCategoryMilestones(items, scores);
    const alpha = result.find((c) => c.categoryId === "alpha")!;
    const beta = result.find((c) => c.categoryId === "beta")!;
    expect(alpha.itemsMastered).toBe(2);
    expect(alpha.masteryPercent).toBe(100);
    expect(alpha.status).toBe("mastered");
    expect(beta.itemsMastered).toBe(1);
    expect(beta.masteryPercent).toBe(33);
    expect(beta.status).toBe("progressing");
  });
});

// ─── buildMilestoneReport ───

describe("buildMilestoneReport", () => {
  const items = [
    item("a1", "alpha"), item("a2", "alpha"),
    item("b1", "beta"), item("b2", "beta"), item("b3", "beta"),
    item("c1", "gamma"),
  ];

  it("computes overall progress correctly", () => {
    const scores = {
      a1: score(5, 0), a2: score(5, 0), // alpha: 2/2
      b1: score(5, 0),                   // beta: 1/3
    };
    const report = buildMilestoneReport(items, scores, 1.5);
    expect(report.totalItemsMastered).toBe(3);
    expect(report.totalItems).toBe(6);
    expect(report.overallPercent).toBe(50);
  });

  it("identifies next milestone as closest-to-complete non-mastered category", () => {
    const scores = {
      a1: score(5, 0), a2: score(5, 0), // alpha: 100%
      b1: score(5, 0), b2: score(5, 0), // beta: 67%
    };
    const report = buildMilestoneReport(items, scores, 2);
    expect(report.nextMilestone).not.toBeNull();
    expect(report.nextMilestone!.categoryId).toBe("beta");
  });

  it("returns null nextMilestone when all categories are mastered", () => {
    const scores = {
      a1: score(5, 0), a2: score(5, 0),
      b1: score(5, 0), b2: score(5, 0), b3: score(5, 0),
      c1: score(5, 0),
    };
    const report = buildMilestoneReport(items, scores, 2);
    expect(report.nextMilestone).toBeNull();
    expect(report.overallPercent).toBe(100);
  });

  it("projects session estimates using mastery rate", () => {
    const scores = {}; // nothing mastered, 6 items total
    const report = buildMilestoneReport(items, scores, 2); // 2 items/session
    expect(report.estimatedTotalSessions).toBe(3); // ceil(6/2)
  });

  it("returns -1 for estimates when mastery rate is zero", () => {
    const report = buildMilestoneReport(items, {}, 0);
    expect(report.estimatedTotalSessions).toBe(-1);
    for (const cat of report.categories) {
      expect(cat.estimatedSessionsLeft).toBe(-1);
    }
  });

  it("handles empty curriculum gracefully", () => {
    const report = buildMilestoneReport([], {}, 1);
    expect(report.categories).toEqual([]);
    expect(report.overallPercent).toBe(0);
    expect(report.totalItems).toBe(0);
    expect(report.nextMilestone).toBeNull();
    expect(report.estimatedTotalSessions).toBe(0);
  });

  it("constants are sensible", () => {
    expect(MASTERY_RATIO).toBeGreaterThan(0.5);
    expect(MASTERY_RATIO).toBeLessThanOrEqual(1);
    expect(MIN_ATTEMPTS_FOR_MASTERY).toBeGreaterThanOrEqual(2);
  });
});
