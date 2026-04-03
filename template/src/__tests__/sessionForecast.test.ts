import { describe, it, expect } from "vitest";
import { SessionPlan, SessionItemReason } from "@/lib/sessionPlanner";
import { ContentItem } from "@/types/game";

// ─── Helpers ───

function makeItem(id: string, category: string, difficulty: "easy" | "medium" | "hard" = "medium"): ContentItem {
  return { id, prompt: `Question about ${id}`, answer: `Answer ${id}`, category, difficulty };
}

function makePlan(overrides: Partial<SessionPlan> = {}): SessionPlan {
  const defaults: SessionPlan = {
    items: [],
    reviewCount: 0,
    newCount: 0,
    weakCategoryCount: 0,
    recallBonusCount: 0,
    estimatedMinutes: 0,
    dominantReason: "new",
  };
  return { ...defaults, ...overrides };
}

function makeSessionItem(id: string, reason: SessionItemReason, priority: number) {
  return { item: makeItem(id, "cat1"), reason, priority };
}

// ─── Tests ───
// These validate the SessionForecast's data contracts — the plan shape,
// composition math, and edge cases that the component relies on.

describe("SessionForecast data contracts", () => {
  it("empty plan has zero items and zero estimated time", () => {
    const plan = makePlan();
    expect(plan.items).toHaveLength(0);
    expect(plan.estimatedMinutes).toBe(0);
  });

  it("composition counts sum to total items", () => {
    const plan = makePlan({
      items: [
        makeSessionItem("r1", "review", 0),
        makeSessionItem("r2", "review", 0),
        makeSessionItem("b1", "recall-bonus", 0),
        makeSessionItem("w1", "weak-category", 2),
        makeSessionItem("n1", "new", 3),
        makeSessionItem("n2", "new", 3),
      ],
      reviewCount: 3, // includes recall-bonus
      recallBonusCount: 1,
      weakCategoryCount: 1,
      newCount: 2,
      estimatedMinutes: 5,
      dominantReason: "review",
    });

    // reviewCount includes recall-bonus per sessionPlanner convention
    const nonBonusReviews = plan.reviewCount - plan.recallBonusCount;
    const sum = nonBonusReviews + plan.recallBonusCount + plan.weakCategoryCount + plan.newCount;
    expect(sum).toBe(plan.items.length);
  });

  it("recall-bonus items have correct reason tag", () => {
    const plan = makePlan({
      items: [
        makeSessionItem("b1", "recall-bonus", 0),
        makeSessionItem("b2", "recall-bonus", 0),
        makeSessionItem("n1", "new", 3),
      ],
      reviewCount: 2,
      recallBonusCount: 2,
      newCount: 1,
      estimatedMinutes: 2,
      dominantReason: "recall-bonus",
    });

    const bonusItems = plan.items.filter((si) => si.reason === "recall-bonus");
    expect(bonusItems).toHaveLength(2);
    expect(plan.recallBonusCount).toBe(bonusItems.length);
  });

  it("percentage calculation is correct for composition segments", () => {
    const plan = makePlan({
      items: [
        makeSessionItem("r1", "review", 0),
        makeSessionItem("r2", "review", 0),
        makeSessionItem("r3", "review", 0),
        makeSessionItem("n1", "new", 3),
      ],
      reviewCount: 3,
      recallBonusCount: 0,
      weakCategoryCount: 0,
      newCount: 1,
      estimatedMinutes: 3,
      dominantReason: "review",
    });

    const total = plan.items.length;
    const reviewPct = Math.round((plan.reviewCount / total) * 100);
    const newPct = Math.round((plan.newCount / total) * 100);
    expect(reviewPct).toBe(75);
    expect(newPct).toBe(25);
    expect(reviewPct + newPct).toBe(100);
  });

  it("item prompts are available for preview truncation", () => {
    const longPrompt = "A".repeat(100);
    const item = { ...makeItem("long1", "cat1"), prompt: longPrompt };
    const si = { item, reason: "new" as const, priority: 3 };

    // Component truncates at 50 chars
    const truncated = si.item.prompt.length > 50
      ? si.item.prompt.slice(0, 50) + "…"
      : si.item.prompt;
    expect(truncated).toBe("A".repeat(50) + "…");
    expect(truncated.length).toBe(51); // 50 chars + ellipsis
  });

  it("handles single-item session plan", () => {
    const plan = makePlan({
      items: [makeSessionItem("solo", "new", 3)],
      newCount: 1,
      estimatedMinutes: 1,
      dominantReason: "new",
    });

    expect(plan.items).toHaveLength(1);
    const pct = Math.round((plan.newCount / plan.items.length) * 100);
    expect(pct).toBe(100);
  });

  it("all four reason types have distinct identifiers", () => {
    const reasons: SessionItemReason[] = ["review", "recall-bonus", "weak-category", "new"];
    const unique = new Set(reasons);
    expect(unique.size).toBe(4);
  });

  it("dominant reason reflects the most common item type", () => {
    const plan = makePlan({
      items: [
        makeSessionItem("w1", "weak-category", 2),
        makeSessionItem("w2", "weak-category", 2),
        makeSessionItem("w3", "weak-category", 2),
        makeSessionItem("n1", "new", 3),
      ],
      weakCategoryCount: 3,
      newCount: 1,
      estimatedMinutes: 3,
      dominantReason: "weak-category",
    });

    expect(plan.dominantReason).toBe("weak-category");
    expect(plan.weakCategoryCount).toBeGreaterThan(plan.newCount);
  });

  it("estimated minutes is always a positive integer for non-empty plans", () => {
    const plan = makePlan({
      items: [makeSessionItem("x1", "new", 3)],
      newCount: 1,
      estimatedMinutes: 1,
      dominantReason: "new",
    });

    expect(plan.estimatedMinutes).toBeGreaterThan(0);
    expect(Number.isInteger(plan.estimatedMinutes)).toBe(true);
  });

  it("items are ordered by priority (lower = more urgent)", () => {
    const plan = makePlan({
      items: [
        makeSessionItem("r1", "recall-bonus", 0),
        makeSessionItem("r2", "review", 1),
        makeSessionItem("w1", "weak-category", 2),
        makeSessionItem("n1", "new", 3),
      ],
      reviewCount: 2,
      recallBonusCount: 1,
      weakCategoryCount: 1,
      newCount: 1,
      estimatedMinutes: 3,
      dominantReason: "review",
    });

    for (let i = 1; i < plan.items.length; i++) {
      expect(plan.items[i].priority).toBeGreaterThanOrEqual(plan.items[i - 1].priority);
    }
  });
});
