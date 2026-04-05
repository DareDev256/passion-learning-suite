import { describe, it, expect, beforeEach, vi } from "vitest";
import { ContentItem, ItemScore } from "@/types/game";

// ─── Mocks ───
const store: Record<string, string> = {};
const ls = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};

vi.stubGlobal("window", { localStorage: ls });
vi.stubGlobal("localStorage", ls);

// Import after mocks are in place
import {
  planSession,
  describeSession,
  hasReviewsDue,
  SessionPlan,
} from "@/lib/sessionPlanner";

const now = Date.now();
const day = 86_400_000;

function makeItem(id: string, category: string, difficulty: "easy" | "medium" | "hard" = "medium"): ContentItem {
  return { id, prompt: `Q: ${id}`, answer: `A: ${id}`, category, difficulty };
}

function seedProgress(scores: Record<string, ItemScore>) {
  store["passionate_learning_progress"] = JSON.stringify({
    xp: 100, level: 1, currentCategory: "basics", completedLevels: [],
    streak: 1, streakFreezes: 0, itemScores: scores,
  });
}

function seedFSRSCards(cards: Array<{ itemId: string; due: number; stability: number; difficulty: number; reps: number; lapses: number; lastReview: number }>) {
  store["passionate_learning_fsrs_cards"] = JSON.stringify(cards);
}

beforeEach(() => { ls.clear(); });

// ─── planSession ───
describe("planSession", () => {
  const catalog = [
    makeItem("a1", "basics", "easy"),
    makeItem("a2", "basics", "easy"),
    makeItem("a3", "basics", "medium"),
    makeItem("b1", "advanced", "medium"),
    makeItem("b2", "advanced", "hard"),
    makeItem("c1", "expert", "hard"),
    makeItem("c2", "expert", "easy"),
    makeItem("c3", "expert", "medium"),
    makeItem("d1", "misc", "easy"),
    makeItem("d2", "misc", "medium"),
    makeItem("d3", "misc", "hard"),
    makeItem("d4", "misc", "easy"),
  ];

  it("returns a valid plan shape with all required fields", () => {
    const plan = planSession(catalog);
    expect(plan).toHaveProperty("items");
    expect(plan).toHaveProperty("reviewCount");
    expect(plan).toHaveProperty("newCount");
    expect(plan).toHaveProperty("weakCategoryCount");
    expect(plan).toHaveProperty("recallBonusCount");
    expect(plan).toHaveProperty("estimatedMinutes");
    expect(plan).toHaveProperty("dominantReason");
    expect(Array.isArray(plan.items)).toBe(true);
  });

  it("respects sessionSize option", () => {
    const plan = planSession(catalog, { sessionSize: 5 });
    expect(plan.items.length).toBeLessThanOrEqual(5);
  });

  it("defaults to 10 items when catalog is large enough", () => {
    const plan = planSession(catalog);
    expect(plan.items.length).toBeLessThanOrEqual(10);
  });

  it("handles empty catalog without crashing", () => {
    const plan = planSession([]);
    expect(plan.items).toHaveLength(0);
    expect(plan.reviewCount).toBe(0);
    expect(plan.newCount).toBe(0);
    expect(plan.estimatedMinutes).toBe(0);
  });

  it("handles catalog smaller than sessionSize", () => {
    const small = [makeItem("x1", "a"), makeItem("x2", "b")];
    const plan = planSession(small, { sessionSize: 10 });
    expect(plan.items.length).toBeLessThanOrEqual(2);
  });

  it("never duplicates items in a session", () => {
    const plan = planSession(catalog, { sessionSize: 10 });
    const ids = plan.items.map((si) => si.item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("counts sum to total items", () => {
    const plan = planSession(catalog, { sessionSize: 8 });
    const counted = plan.reviewCount + plan.newCount + plan.weakCategoryCount;
    // recallBonusCount is a subset of reviewCount, so don't double-count
    expect(plan.items.length).toBe(
      plan.items.filter((i) => i.reason === "review").length +
      plan.items.filter((i) => i.reason === "recall-bonus").length +
      plan.items.filter((i) => i.reason === "new").length +
      plan.items.filter((i) => i.reason === "weak-category").length
    );
  });

  it("items are sorted by priority (lower = more urgent)", () => {
    seedProgress({
      a1: { correct: 3, incorrect: 7, lastSeen: now - 2 * day },
      a2: { correct: 2, incorrect: 8, lastSeen: now - 3 * day },
    });
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 1, lastReview: now - 2 * day },
    ]);
    const plan = planSession(catalog, { sessionSize: 6 });
    for (let i = 1; i < plan.items.length; i++) {
      expect(plan.items[i].priority).toBeGreaterThanOrEqual(plan.items[i - 1].priority);
    }
  });

  it("estimated minutes scales with session size and minutesPerItem", () => {
    const plan = planSession(catalog, { sessionSize: 4, minutesPerItem: 2 });
    expect(plan.estimatedMinutes).toBe(Math.ceil(plan.items.length * 2));
  });

  // ── Review integration ──
  it("fills review slots from FSRS due queue", () => {
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 3, lapses: 0, lastReview: now - 2 * day },
      { itemId: "b1", due: now - 2 * day, stability: 2, difficulty: 4, reps: 2, lapses: 1, lastReview: now - 3 * day },
    ]);
    seedProgress({
      a1: { correct: 5, incorrect: 1, lastSeen: now - 2 * day },
      b1: { correct: 4, incorrect: 2, lastSeen: now - 3 * day },
    });
    const plan = planSession(catalog, { sessionSize: 10, reviewRatio: 0.5 });
    const reviews = plan.items.filter((i) => i.reason === "review" || i.reason === "recall-bonus");
    expect(reviews.length).toBeGreaterThanOrEqual(1);
  });

  it("flags items with 7+ day gap as recall-bonus", () => {
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 3, lapses: 0, lastReview: now - 10 * day },
    ]);
    seedProgress({
      a1: { correct: 5, incorrect: 1, lastSeen: now - 10 * day },
    });
    const plan = planSession(catalog, { sessionSize: 10, reviewRatio: 0.5 });
    const bonus = plan.items.filter((i) => i.reason === "recall-bonus");
    expect(bonus.length).toBeGreaterThanOrEqual(1);
    expect(bonus[0].item.id).toBe("a1");
  });

  it("flags recall-bonus from FSRS lastReview even without itemScores entry", () => {
    // Bug: planSession used itemScores.lastSeen for recall detection, missing
    // bonuses when only gradeItem() ran (FSRS card exists, no itemScores entry)
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 3, lapses: 0, lastReview: now - 10 * day },
    ]);
    // Deliberately NO seedProgress — simulates gradeItem() without updateItemScore()
    const plan = planSession(catalog, { sessionSize: 10, reviewRatio: 0.5 });
    const bonus = plan.items.filter((i) => i.reason === "recall-bonus");
    expect(bonus.length).toBeGreaterThanOrEqual(1);
    expect(bonus[0].item.id).toBe("a1");
  });

  it("prefers FSRS lastReview over itemScores.lastSeen for recall-bonus", () => {
    // FSRS card says last review was 10 days ago, but itemScores says 2 days ago
    // FSRS card is authoritative — should still flag as recall-bonus
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 3, lapses: 0, lastReview: now - 10 * day },
    ]);
    seedProgress({
      a1: { correct: 5, incorrect: 1, lastSeen: now - 2 * day },
    });
    const plan = planSession(catalog, { sessionSize: 10, reviewRatio: 0.5 });
    const bonus = plan.items.filter((i) => i.reason === "recall-bonus");
    expect(bonus.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT flag recent items as recall-bonus", () => {
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 3, lapses: 0, lastReview: now - 2 * day },
    ]);
    seedProgress({
      a1: { correct: 5, incorrect: 1, lastSeen: now - 2 * day },
    });
    const plan = planSession(catalog, { sessionSize: 10, reviewRatio: 0.5 });
    const bonus = plan.items.filter((i) => i.reason === "recall-bonus");
    expect(bonus.length).toBe(0);
  });

  // ── Weak category targeting ──
  it("includes weak-category items when accuracy < 70%", () => {
    // "basics" has low accuracy — should get targeted
    seedProgress({
      a1: { correct: 2, incorrect: 8, lastSeen: now - day },
      a2: { correct: 1, incorrect: 9, lastSeen: now - day },
      b1: { correct: 9, incorrect: 1, lastSeen: now - day },
    });
    const plan = planSession(catalog, { sessionSize: 8, weakCategoryBoost: 0.5 });
    const weak = plan.items.filter((i) => i.reason === "weak-category");
    expect(weak.length).toBeGreaterThanOrEqual(1);
    // Weak items should come from "basics" category
    for (const w of weak) {
      expect(w.item.category).toBe("basics");
    }
  });

  it("skips weak-category phase when all categories are strong", () => {
    seedProgress({
      a1: { correct: 9, incorrect: 1, lastSeen: now - day },
      b1: { correct: 8, incorrect: 2, lastSeen: now - day },
      c1: { correct: 10, incorrect: 0, lastSeen: now - day },
    });
    const plan = planSession(catalog, { sessionSize: 6 });
    const weak = plan.items.filter((i) => i.reason === "weak-category");
    expect(weak.length).toBe(0);
  });

  // ── Dominant reason ──
  it("dominantReason reflects the most common item type", () => {
    // No reviews, no weak categories — should be "new"
    const plan = planSession(catalog, { sessionSize: 5 });
    expect(plan.dominantReason).toBe("new");
  });
});

// ─── describeSession ───
describe("describeSession", () => {
  function makePlan(overrides: Partial<SessionPlan>): SessionPlan {
    return {
      items: [],
      reviewCount: 0,
      newCount: 0,
      weakCategoryCount: 0,
      recallBonusCount: 0,
      estimatedMinutes: 5,
      dominantReason: "new",
      ...overrides,
    };
  }

  it("describes reviews-only session", () => {
    const desc = describeSession(makePlan({ reviewCount: 3, estimatedMinutes: 2 }));
    expect(desc).toContain("3 reviews");
    expect(desc).toContain("~2 min");
  });

  it("uses singular for 1 review", () => {
    const desc = describeSession(makePlan({ reviewCount: 1 }));
    expect(desc).toContain("1 review");
    expect(desc).not.toContain("1 reviews");
  });

  it("describes new-items-only session", () => {
    const desc = describeSession(makePlan({ newCount: 6, estimatedMinutes: 5 }));
    expect(desc).toContain("6 new items");
  });

  it("uses singular for 1 new item", () => {
    const desc = describeSession(makePlan({ newCount: 1 }));
    expect(desc).toContain("1 new item");
    expect(desc).not.toContain("1 new items");
  });

  it("includes bonus XP notation when recall bonuses exist", () => {
    const desc = describeSession(makePlan({ reviewCount: 4, recallBonusCount: 2 }));
    expect(desc).toContain("2 bonus XP!");
  });

  it("omits bonus XP when recallBonusCount is 0", () => {
    const desc = describeSession(makePlan({ reviewCount: 3 }));
    expect(desc).not.toContain("bonus XP");
  });

  it("joins multiple parts with ' + '", () => {
    const desc = describeSession(makePlan({
      reviewCount: 2, weakCategoryCount: 1, newCount: 3, estimatedMinutes: 4,
    }));
    expect(desc).toContain(" + ");
    expect(desc).toContain("2 reviews");
    expect(desc).toContain("1 weak-area drill");
    expect(desc).toContain("3 new items");
  });

  it("uses singular for 1 weak-area drill", () => {
    const desc = describeSession(makePlan({ weakCategoryCount: 1 }));
    expect(desc).toContain("1 weak-area drill");
    expect(desc).not.toContain("1 weak-area drills");
  });

  it("uses plural for multiple weak-area drills", () => {
    const desc = describeSession(makePlan({ weakCategoryCount: 3 }));
    expect(desc).toContain("3 weak-area drills");
  });
});

// ─── hasReviewsDue ───
describe("hasReviewsDue", () => {
  it("returns false when no FSRS cards exist", () => {
    expect(hasReviewsDue()).toBe(false);
  });

  it("returns true when overdue cards exist", () => {
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
    ]);
    expect(hasReviewsDue()).toBe(true);
  });

  it("returns false when all cards are scheduled in the future", () => {
    seedFSRSCards([
      { itemId: "a1", due: now + 5 * day, stability: 3, difficulty: 4, reps: 5, lapses: 0, lastReview: now },
    ]);
    expect(hasReviewsDue()).toBe(false);
  });
});
