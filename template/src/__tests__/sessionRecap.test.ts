import { describe, it, expect } from "vitest";
import { getRecapMessage, memoryTier } from "@/lib/sessionRecapMessages";
import { SessionPlan, SessionItemReason } from "@/lib/sessionPlanner";

/** Helper: build a minimal SessionPlan with specific counts and dominant reason. */
function makePlan(overrides: Partial<SessionPlan> & { dominantReason: SessionItemReason }): SessionPlan {
  return {
    items: Array.from({ length: overrides.reviewCount ?? 0 + (overrides.newCount ?? 0) + (overrides.weakCategoryCount ?? 0) }, (_, i) => ({
      item: { id: `item-${i}`, prompt: "", answer: "", category: "test", difficulty: "easy" as const },
      reason: overrides.dominantReason,
      priority: 0,
    })),
    reviewCount: 0,
    newCount: 0,
    weakCategoryCount: 0,
    recallBonusCount: 0,
    estimatedMinutes: 8,
    ...overrides,
  };
}

describe("getRecapMessage", () => {
  it("returns empty session message when no items", () => {
    const plan = makePlan({ dominantReason: "new", items: [] });
    expect(getRecapMessage(plan)).toContain("empty");
  });

  it("returns review message for review-dominant sessions", () => {
    const plan = makePlan({ dominantReason: "review", reviewCount: 5, items: [{ item: { id: "a", prompt: "", answer: "", category: "t", difficulty: "easy" }, reason: "review", priority: 0 }] });
    expect(getRecapMessage(plan)).toContain("repetition");
  });

  it("returns weak-category message for drill sessions", () => {
    const plan = makePlan({ dominantReason: "weak-category", weakCategoryCount: 4, items: [{ item: { id: "a", prompt: "", answer: "", category: "t", difficulty: "easy" }, reason: "weak-category", priority: 0 }] });
    expect(getRecapMessage(plan)).toContain("weakest");
  });

  it("returns new-content message for discovery sessions", () => {
    const plan = makePlan({ dominantReason: "new", newCount: 6, items: [{ item: { id: "a", prompt: "", answer: "", category: "t", difficulty: "easy" }, reason: "new", priority: 0 }] });
    expect(getRecapMessage(plan)).toContain("Fresh");
  });

  it("prioritizes recall-bonus message when 2+ bonuses present", () => {
    const plan = makePlan({ dominantReason: "review", recallBonusCount: 3, reviewCount: 5, items: [{ item: { id: "a", prompt: "", answer: "", category: "t", difficulty: "easy" }, reason: "review", priority: 0 }] });
    expect(getRecapMessage(plan)).toContain("Long-term");
  });

  it("returns recall-bonus dominant message", () => {
    const plan = makePlan({ dominantReason: "recall-bonus", recallBonusCount: 1, items: [{ item: { id: "a", prompt: "", answer: "", category: "t", difficulty: "easy" }, reason: "recall-bonus", priority: 0 }] });
    expect(getRecapMessage(plan)).toContain("recall");
  });
});

describe("memoryTier", () => {
  it("returns STRONG for high strength", () => {
    expect(memoryTier(80).label).toBe("STRONG");
    expect(memoryTier(75).label).toBe("STRONG");
  });

  it("returns BUILDING for mid-range", () => {
    expect(memoryTier(50).label).toBe("BUILDING");
    expect(memoryTier(40).label).toBe("BUILDING");
  });

  it("returns FRAGILE for low strength", () => {
    expect(memoryTier(10).label).toBe("FRAGILE");
    expect(memoryTier(1).label).toBe("FRAGILE");
  });

  it("returns NEW for zero strength", () => {
    expect(memoryTier(0).label).toBe("NEW");
  });
});
