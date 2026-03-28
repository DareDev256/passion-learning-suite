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

import {
  planSession,
  describeSession,
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

const catalog = [
  makeItem("a1", "basics", "easy"),  makeItem("a2", "basics", "easy"),
  makeItem("a3", "basics", "medium"), makeItem("b1", "advanced", "medium"),
  makeItem("b2", "advanced", "hard"), makeItem("c1", "expert", "hard"),
  makeItem("c2", "expert", "easy"),  makeItem("c3", "expert", "medium"),
  makeItem("d1", "misc", "easy"),    makeItem("d2", "misc", "medium"),
  makeItem("d3", "misc", "hard"),    makeItem("d4", "misc", "easy"),
];

// ── Phase 1: upcoming fallback ──
describe("planSession — review queue fallback to upcoming", () => {
  it("fills remaining review slots from upcoming when due queue is small", () => {
    seedFSRSCards([
      // 1 due item
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
      // 2 upcoming items (due within next 24h)
      { itemId: "b1", due: now + 6 * 3_600_000, stability: 2, difficulty: 4, reps: 1, lapses: 0, lastReview: now - day },
      { itemId: "c1", due: now + 12 * 3_600_000, stability: 2, difficulty: 4, reps: 1, lapses: 0, lastReview: now - day },
    ]);
    seedProgress({
      a1: { correct: 3, incorrect: 1, lastSeen: now - 2 * day },
      b1: { correct: 5, incorrect: 0, lastSeen: now - day },
      c1: { correct: 4, incorrect: 1, lastSeen: now - day },
    });
    // reviewRatio 0.5 on sessionSize 6 → 3 review slots
    const plan = planSession(catalog, { sessionSize: 6, reviewRatio: 0.5 });
    const reviews = plan.items.filter((i) => i.reason === "review" || i.reason === "recall-bonus");
    // Should fill all 3 slots: 1 from due + 2 from upcoming
    expect(reviews.length).toBe(3);
  });

  it("assigns priority 1 to upcoming items (lower urgency than due)", () => {
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
      { itemId: "b1", due: now + 3_600_000, stability: 2, difficulty: 4, reps: 1, lapses: 0, lastReview: now - day },
    ]);
    seedProgress({
      a1: { correct: 3, incorrect: 1, lastSeen: now - 2 * day },
      b1: { correct: 5, incorrect: 0, lastSeen: now - day },
    });
    const plan = planSession(catalog, { sessionSize: 4, reviewRatio: 0.5 });
    const dueItem = plan.items.find((i) => i.item.id === "a1");
    const upcomingItem = plan.items.find((i) => i.item.id === "b1");
    expect(dueItem?.priority).toBe(0);
    expect(upcomingItem?.priority).toBe(1);
  });
});

// ── Orphaned FSRS cards ──
describe("planSession — orphaned FSRS references", () => {
  it("silently skips FSRS cards that reference items not in catalog", () => {
    seedFSRSCards([
      { itemId: "deleted-item", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
    ]);
    seedProgress({
      a1: { correct: 3, incorrect: 1, lastSeen: now - 2 * day },
    });
    const plan = planSession(catalog, { sessionSize: 6 });
    const ids = plan.items.map((i) => i.item.id);
    expect(ids).not.toContain("deleted-item");
    expect(ids).toContain("a1");
  });
});

// ── Zero-ratio edge cases ──
describe("planSession — extreme ratio options", () => {
  it("reviewRatio: 0 skips review phase entirely, all items are new/weak", () => {
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
    ]);
    seedProgress({ a1: { correct: 3, incorrect: 1, lastSeen: now - 2 * day } });
    const plan = planSession(catalog, { sessionSize: 5, reviewRatio: 0 });
    const reviews = plan.items.filter((i) => i.reason === "review" || i.reason === "recall-bonus");
    expect(reviews.length).toBe(0);
    expect(plan.items.length).toBe(5);
  });

  it("reviewRatio: 1 fills all slots with reviews when available", () => {
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
      { itemId: "b1", due: now - day, stability: 2, difficulty: 4, reps: 1, lapses: 0, lastReview: now - 3 * day },
      { itemId: "c1", due: now - day, stability: 1, difficulty: 6, reps: 3, lapses: 0, lastReview: now - 4 * day },
    ]);
    seedProgress({
      a1: { correct: 3, incorrect: 1, lastSeen: now - 2 * day },
      b1: { correct: 5, incorrect: 0, lastSeen: now - 3 * day },
      c1: { correct: 2, incorrect: 2, lastSeen: now - 4 * day },
    });
    const plan = planSession(catalog, { sessionSize: 3, reviewRatio: 1 });
    const newItems = plan.items.filter((i) => i.reason === "new" || i.reason === "weak-category");
    expect(newItems.length).toBe(0);
  });

  it("weakCategoryBoost: 0 skips weak-category targeting", () => {
    seedProgress({
      a1: { correct: 1, incorrect: 9, lastSeen: now - day },
      a2: { correct: 0, incorrect: 10, lastSeen: now - day },
    });
    const plan = planSession(catalog, { sessionSize: 6, weakCategoryBoost: 0 });
    const weak = plan.items.filter((i) => i.reason === "weak-category");
    expect(weak.length).toBe(0);
  });
});

// ── Multi weak-category ──
describe("planSession — multiple weak categories", () => {
  it("pulls items from multiple weak categories", () => {
    seedProgress({
      a1: { correct: 1, incorrect: 9, lastSeen: now - day },  // basics: 10% acc
      b1: { correct: 2, incorrect: 8, lastSeen: now - day },  // advanced: 20% acc
      c1: { correct: 9, incorrect: 1, lastSeen: now - day },  // expert: 90% (strong)
    });
    const plan = planSession(catalog, { sessionSize: 10, weakCategoryBoost: 0.5 });
    const weakCats = new Set(
      plan.items.filter((i) => i.reason === "weak-category").map((i) => i.item.category),
    );
    expect(weakCats.has("basics")).toBe(true);
    expect(weakCats.has("advanced")).toBe(true);
    expect(weakCats.has("expert")).toBe(false);
  });
});

// ── describeSession edge cases ──
describe("describeSession — edge cases", () => {
  function makePlan(overrides: Partial<SessionPlan>): SessionPlan {
    return {
      items: [], reviewCount: 0, newCount: 0,
      weakCategoryCount: 0, recallBonusCount: 0,
      estimatedMinutes: 0, dominantReason: "new", ...overrides,
    };
  }

  it("handles all-zero plan (empty session)", () => {
    const desc = describeSession(makePlan({}));
    expect(desc).toContain("~0 min");
    // Should not crash — the parts array is empty, so we get " · ~0 min"
    expect(desc).toBeDefined();
  });

  it("includes all three section types when present", () => {
    const desc = describeSession(makePlan({
      reviewCount: 1, recallBonusCount: 1, weakCategoryCount: 2, newCount: 3, estimatedMinutes: 5,
    }));
    expect(desc).toContain("1 review");
    expect(desc).toContain("1 bonus XP!");
    expect(desc).toContain("2 weak-area drills");
    expect(desc).toContain("3 new items");
    expect(desc).toContain("~5 min");
    // Verify ordering: reviews + weak + new
    const reviewIdx = desc.indexOf("review");
    const weakIdx = desc.indexOf("weak-area");
    const newIdx = desc.indexOf("new item");
    expect(reviewIdx).toBeLessThan(weakIdx);
    expect(weakIdx).toBeLessThan(newIdx);
  });

  it("large session produces correct estimated minutes", () => {
    const desc = describeSession(makePlan({ newCount: 20, estimatedMinutes: 15 }));
    expect(desc).toContain("~15 min");
  });
});

// ── Full pipeline integration ──
describe("planSession — three-phase integration", () => {
  it("combines reviews + weak-category + new items without overlap", () => {
    // Set up: a1 due for review, basics is weak, rest fills as new
    seedFSRSCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
    ]);
    seedProgress({
      a1: { correct: 2, incorrect: 8, lastSeen: now - 2 * day },
      a2: { correct: 1, incorrect: 9, lastSeen: now - 3 * day }, // basics weak
    });
    const plan = planSession(catalog, { sessionSize: 8, reviewRatio: 0.25, weakCategoryBoost: 0.3 });

    const reasons = new Set(plan.items.map((i) => i.reason));
    // Should have at least reviews and new items
    expect(reasons.has("review") || reasons.has("recall-bonus")).toBe(true);
    expect(reasons.has("new")).toBe(true);

    // No duplicates
    const ids = plan.items.map((i) => i.item.id);
    expect(new Set(ids).size).toBe(ids.length);

    // a1 should appear as review, NOT as weak-category or new
    const a1Entry = plan.items.find((i) => i.item.id === "a1");
    expect(a1Entry?.reason === "review" || a1Entry?.reason === "recall-bonus").toBe(true);
  });
});
