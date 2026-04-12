import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ContentItem, ItemScore } from "@/types/game";
import type { Difficulty, DifficultyProfile } from "@/lib/difficulty";

// ─── localStorage mock ───
const store: Record<string, string> = {};
const ls = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};
vi.stubGlobal("window", { localStorage: ls });
vi.stubGlobal("localStorage", ls);

import { analyzeDifficulty, selectItems } from "@/lib/difficulty";
import { planSession, describeSession, SessionPlan } from "@/lib/sessionPlanner";
import { computeCategoryStrengths, findWeakestItems } from "@/lib/insights";

const day = 86_400_000;
const now = Date.now();

const mk = (id: string, cat: string, d: Difficulty): ContentItem =>
  ({ id, prompt: `Q:${id}`, answer: `A:${id}`, category: cat, difficulty: d });

function seed(scores: Record<string, ItemScore>) {
  store["passionate_learning_progress"] = JSON.stringify({
    xp: 0, level: 1, currentCategory: "", completedLevels: [],
    streak: 0, streakFreezes: 0, itemScores: scores,
  });
}

function seedCards(cards: Array<{ itemId: string; due: number; stability: number; difficulty: number; reps: number; lapses: number; lastReview: number }>) {
  store["passionate_learning_fsrs_cards"] = JSON.stringify(cards);
}

beforeEach(() => ls.clear());

// ── FSRS queue references items missing from catalog ──
// Bug surface: itemMap.get(id) returns undefined → continue silently.
// If the continue guard broke, it would push { item: undefined } and crash downstream.
describe("planSession — phantom FSRS cards (not in catalog)", () => {
  it("skips due items not in the catalog without crashing", () => {
    const items = [mk("real1", "cat", "easy")];
    seedCards([
      { itemId: "ghost", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 3 * day },
      { itemId: "real1", due: now - 2 * day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 4 * day },
    ]);
    seed({ real1: { correct: 2, incorrect: 0, lastSeen: now - 4 * day } });
    const plan = planSession(items, { sessionSize: 3, reviewRatio: 1 });
    // ghost is skipped, real1 is selected
    expect(plan.items.every((si) => si.item.id !== "ghost")).toBe(true);
    expect(plan.items.some((si) => si.item.id === "real1")).toBe(true);
  });

  it("skips upcoming items not in the catalog", () => {
    const items = [mk("present", "cat", "easy")];
    // ghost is upcoming (due in future), present is also upcoming
    seedCards([
      { itemId: "phantom", due: now + day, stability: 2, difficulty: 4, reps: 3, lapses: 0, lastReview: now - day },
      { itemId: "present", due: now + 2 * day, stability: 2, difficulty: 4, reps: 3, lapses: 0, lastReview: now - day },
    ]);
    seed({ present: { correct: 3, incorrect: 0, lastSeen: now - day } });
    const plan = planSession(items, { sessionSize: 2, reviewRatio: 1 });
    expect(plan.items.every((si) => si.item.id !== "phantom")).toBe(true);
  });
});

// ── Weak category 70% boundary precision ──
// filter is `accuracy < 70` — exactly 70% should NOT be weak
describe("planSession — weak category 70% boundary", () => {
  it("category at exactly 70% is NOT targeted as weak", () => {
    const items = [
      mk("b1", "border", "easy"), mk("b2", "border", "easy"),
      mk("n1", "safe", "medium"),
    ];
    // border category: 7/10 = 70% exactly → should NOT be weak
    seed({
      b1: { correct: 4, incorrect: 1, lastSeen: now - day },
      b2: { correct: 3, incorrect: 2, lastSeen: now - 2 * day },
    });
    const plan = planSession(items, { sessionSize: 3, reviewRatio: 0, weakCategoryBoost: 1.0 });
    expect(plan.weakCategoryCount).toBe(0);
  });

  it("category at 69% IS targeted as weak", () => {
    const items = [
      mk("w1", "borderlow", "easy"), mk("w2", "borderlow", "easy"),
      mk("n1", "other", "medium"),
    ];
    // borderlow: we need accuracy that rounds to 69
    // 9 correct + 4 incorrect = 13 total → 9/13 = 69.2% → rounds to 69%
    seed({
      w1: { correct: 5, incorrect: 2, lastSeen: now - day },
      w2: { correct: 4, incorrect: 2, lastSeen: now - 2 * day },
    });
    const plan = planSession(items, { sessionSize: 3, reviewRatio: 0, weakCategoryBoost: 1.0 });
    expect(plan.weakCategoryCount).toBeGreaterThan(0);
  });
});

// ── Priority sort order in final output ──
// Items should be sorted: overdue(0) → upcoming(1) → weak(2) → new(3)
describe("planSession — output priority ordering", () => {
  it("reviews come before weak-category before new in final items array", () => {
    const items = [
      mk("r1", "weak", "easy"),   // will be review
      mk("w1", "weak", "easy"),   // will be weak-category
      mk("n1", "strong", "easy"), // will be new
      mk("n2", "strong", "medium"),
    ];
    seedCards([
      { itemId: "r1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 3 * day },
    ]);
    seed({
      r1: { correct: 1, incorrect: 9, lastSeen: now - 3 * day }, // weak cat
      w1: { correct: 0, incorrect: 5, lastSeen: now - 5 * day }, // weak cat, not due
      n1: { correct: 9, incorrect: 1, lastSeen: now - day },     // strong cat
    });
    const plan = planSession(items, { sessionSize: 4, reviewRatio: 0.3, weakCategoryBoost: 0.5 });
    // Verify monotonically non-decreasing priority
    for (let i = 1; i < plan.items.length; i++) {
      expect(plan.items[i].priority).toBeGreaterThanOrEqual(plan.items[i - 1].priority);
    }
  });
});

// ── selectItems auto-computes profile when omitted ──
describe("selectItems — implicit profile computation", () => {
  it("selects items without explicit profile (uses analyzeDifficulty internally)", () => {
    const items = [mk("a", "x", "easy"), mk("b", "x", "medium"), mk("c", "x", "hard")];
    seed({
      a: { correct: 10, incorrect: 0, lastSeen: now - 1000 }, // easy: 100% → promote to medium
    });
    // No profile arg → selectItems calls analyzeDifficulty(items) internally
    const sel = selectItems(items, 2);
    expect(sel.length).toBe(2);
    // Should recommend medium (easy at 100% > 85% threshold), so medium items first
    expect(sel[0].id).toBe("b");
  });
});

// ── findWeakestItems secondary sort: equal ratio → older item first ──
describe("findWeakestItems — ratio-tie daysSinceReview tiebreaker", () => {
  it("items with identical ratio sort by daysSinceReview descending", () => {
    const scores: Record<string, ItemScore> = {
      old: { correct: 1, incorrect: 1, lastSeen: now - 30 * day }, // ratio=0.5, 30 days ago
      new: { correct: 1, incorrect: 1, lastSeen: now - 1 * day },  // ratio=0.5, 1 day ago
      mid: { correct: 1, incorrect: 1, lastSeen: now - 15 * day }, // ratio=0.5, 15 days ago
    };
    const result = findWeakestItems(scores, 3);
    // All have ratio 0.5 → secondary sort: most days since review first
    expect(result[0].itemId).toBe("old");
    expect(result[1].itemId).toBe("mid");
    expect(result[2].itemId).toBe("new");
  });
});

// ── computeCategoryStrengths: zero-attempt scores are excluded ──
describe("computeCategoryStrengths — zero-attempt filtering", () => {
  it("items with correct=0 and incorrect=0 are excluded from category stats", () => {
    const items = [
      { id: "z1", category: "ghost" },
      { id: "r1", category: "real" },
    ];
    const scores: Record<string, ItemScore> = {
      z1: { correct: 0, incorrect: 0, lastSeen: now },  // zero attempts
      r1: { correct: 3, incorrect: 1, lastSeen: now },   // real data
    };
    const result = computeCategoryStrengths(items, scores);
    // ghost category should not appear (its only item has zero attempts)
    expect(result.find((s) => s.categoryId === "ghost")).toBeUndefined();
    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe("real");
  });
});

// ── computeCategoryStrengths: descending accuracy sort ──
describe("computeCategoryStrengths — sort order", () => {
  it("categories are sorted by accuracy descending", () => {
    const items = [
      { id: "lo1", category: "low" },
      { id: "hi1", category: "high" },
      { id: "mid1", category: "mid" },
    ];
    const scores: Record<string, ItemScore> = {
      lo1: { correct: 1, incorrect: 9, lastSeen: now },  // 10%
      hi1: { correct: 9, incorrect: 1, lastSeen: now },  // 90%
      mid1: { correct: 5, incorrect: 5, lastSeen: now }, // 50%
    };
    const result = computeCategoryStrengths(items, scores);
    expect(result[0].categoryId).toBe("high");
    expect(result[1].categoryId).toBe("mid");
    expect(result[2].categoryId).toBe("low");
  });
});

// ── analyzeDifficulty confidence thresholds ──
describe("analyzeDifficulty — confidence level boundaries", () => {
  it("zero attempts across all tiers → confidence 'new'", () => {
    const items = [mk("e1", "c", "easy"), mk("m1", "c", "medium")];
    // No seed → no scores
    const profile = analyzeDifficulty(items);
    expect(profile.confidence).toBe("new");
  });

  it("1-4 total attempts → confidence 'low' (below WINDOW=5)", () => {
    const items = [mk("e1", "c", "easy"), mk("m1", "c", "medium")];
    seed({ e1: { correct: 2, incorrect: 1, lastSeen: now } }); // 3 attempts
    const profile = analyzeDifficulty(items);
    expect(profile.confidence).toBe("low");
  });

  it("exactly 5 total attempts → confidence 'high' (equals WINDOW)", () => {
    const items = [mk("e1", "c", "easy")];
    seed({ e1: { correct: 3, incorrect: 2, lastSeen: now } }); // 5 attempts
    const profile = analyzeDifficulty(items);
    expect(profile.confidence).toBe("high");
  });
});

// ── Phase 3 skipped entirely when Phases 1+2 fill all slots ──
describe("planSession — Phase 3 bypassed when earlier phases fill session", () => {
  it("no new-content items when reviews + weak items fill all slots", () => {
    const items = [
      mk("r1", "weak", "easy"), mk("r2", "weak", "easy"),
      mk("w1", "weak", "easy"), mk("w2", "weak", "easy"),
      mk("n1", "other", "medium"), mk("n2", "other", "hard"),
    ];
    seedCards([
      { itemId: "r1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 3 * day },
      { itemId: "r2", due: now - 2 * day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 4 * day },
    ]);
    seed({
      r1: { correct: 1, incorrect: 9, lastSeen: now - 3 * day },
      r2: { correct: 0, incorrect: 5, lastSeen: now - 4 * day },
      w1: { correct: 0, incorrect: 8, lastSeen: now - 6 * day },
      w2: { correct: 1, incorrect: 7, lastSeen: now - 5 * day },
      n1: { correct: 9, incorrect: 1, lastSeen: now - day },
    });
    // sessionSize=4, reviewRatio=0.5 → 2 review slots + 2 new slots
    // weakCategoryBoost=1.0 → all 2 new slots go to weak items
    // remaining = 4 - 4 = 0 → Phase 3 skipped
    const plan = planSession(items, { sessionSize: 4, reviewRatio: 0.5, weakCategoryBoost: 1.0 });
    expect(plan.newCount).toBe(0);
    expect(plan.reviewCount + plan.weakCategoryCount).toBe(4);
  });
});
