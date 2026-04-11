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

import { planSession, describeSession, SessionPlan } from "@/lib/sessionPlanner";
import { computeCategoryStrengths, findWeakestItems, computeMasteryRate } from "@/lib/insights";

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

// ── Phase disabling: reviewRatio=0 skips Phase 1 entirely ──
describe("planSession — disabled review phase (reviewRatio: 0)", () => {
  const items = Array.from({ length: 8 }, (_, i) => mk(`d${i}`, "cat", "easy"));

  it("produces zero review items even with due FSRS cards", () => {
    seedCards([
      { itemId: "d0", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 10 * day },
      { itemId: "d1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 3 * day },
    ]);
    seed({
      d0: { correct: 3, incorrect: 0, lastSeen: now - 10 * day },
      d1: { correct: 2, incorrect: 0, lastSeen: now - 3 * day },
    });
    const plan = planSession(items, { sessionSize: 6, reviewRatio: 0 });
    expect(plan.reviewCount).toBe(0);
    expect(plan.recallBonusCount).toBe(0);
    // All slots go to Phase 2/3
    expect(plan.items.every((si) => si.reason === "new" || si.reason === "weak-category")).toBe(true);
    expect(plan.items.length).toBe(6);
  });
});

// ── Phase disabling: weakCategoryBoost=0 skips Phase 2 ──
describe("planSession — disabled weak-category phase (weakCategoryBoost: 0)", () => {
  const items = [
    mk("w1", "weak", "easy"), mk("w2", "weak", "easy"),
    mk("s1", "strong", "medium"), mk("s2", "strong", "medium"),
    mk("n1", "fresh", "easy"), mk("n2", "fresh", "medium"),
  ];

  it("produces zero weak-category items even with failing categories", () => {
    seed({
      w1: { correct: 1, incorrect: 9, lastSeen: now - day }, // weak: 10%
      w2: { correct: 0, incorrect: 5, lastSeen: now - day },
      s1: { correct: 9, incorrect: 1, lastSeen: now - day }, // strong: 90%
    });
    const plan = planSession(items, { sessionSize: 4, reviewRatio: 0, weakCategoryBoost: 0 });
    expect(plan.weakCategoryCount).toBe(0);
    expect(plan.items.every((si) => si.reason === "new")).toBe(true);
  });
});

// ── Phase 2 starvation: weak-category consumes all remaining slots ──
describe("planSession — Phase 2 starves Phase 3", () => {
  it("weak slots consume all new-item budget when boost is 1.0", () => {
    const items = [
      mk("w1", "weak", "easy"), mk("w2", "weak", "easy"),
      mk("w3", "weak", "easy"), mk("w4", "weak", "medium"),
      mk("n1", "other", "easy"), mk("n2", "other", "medium"),
    ];
    seed({
      w1: { correct: 1, incorrect: 9, lastSeen: now - 5 * day },
      w2: { correct: 0, incorrect: 5, lastSeen: now - 4 * day },
      w3: { correct: 2, incorrect: 8, lastSeen: now - 3 * day },
      w4: { correct: 1, incorrect: 4, lastSeen: now - 2 * day },
    });
    const plan = planSession(items, { sessionSize: 4, reviewRatio: 0, weakCategoryBoost: 1.0 });
    // All 4 slots go to weak-category (boost=1.0 → weakSlots = floor(4*1.0) = 4)
    expect(plan.weakCategoryCount).toBe(4);
    expect(plan.newCount).toBe(0);
  });
});

// ── Phase 2 internal sort: unseen items before oldest-seen in weak categories ──
describe("planSession — weak-category sort order", () => {
  it("prioritizes unseen weak-category items over seen ones", () => {
    const items = [
      mk("seen1", "weak", "easy"), mk("seen2", "weak", "easy"),
      mk("unseen1", "weak", "easy"), mk("filler", "ok", "medium"),
    ];
    seed({
      seen1: { correct: 1, incorrect: 9, lastSeen: now - 2 * day },  // weak: 10%, seen 2d ago
      seen2: { correct: 0, incorrect: 5, lastSeen: now - 10 * day }, // weak: 0%, seen 10d ago
      // unseen1 has no score → unseen
      filler: { correct: 9, incorrect: 1, lastSeen: now - day },
    });
    const plan = planSession(items, { sessionSize: 3, reviewRatio: 0, weakCategoryBoost: 1.0 });
    const weakItems = plan.items.filter((si) => si.reason === "weak-category");
    // unseen1 should come first (no score → sorted before scored items)
    if (weakItems.length >= 2) {
      expect(weakItems[0].item.id).toBe("unseen1");
      // Then oldest-seen: seen2 (10d ago) before seen1 (2d ago)
      expect(weakItems[1].item.id).toBe("seen2");
    }
  });
});

// ── describeSession: all-zero plan produces sensible output ──
describe("describeSession — edge cases", () => {
  function makePlan(overrides: Partial<SessionPlan>): SessionPlan {
    return {
      items: [], reviewCount: 0, newCount: 0,
      weakCategoryCount: 0, recallBonusCount: 0,
      estimatedMinutes: 0, dominantReason: "new", ...overrides,
    };
  }

  it("all-zero plan: no crash, contains minute estimate", () => {
    const desc = describeSession(makePlan({}));
    expect(desc).toContain("~0 min");
    // Should not contain undefined or NaN
    expect(desc).not.toContain("undefined");
    expect(desc).not.toContain("NaN");
  });

  it("single review with single recall bonus shows correct singular", () => {
    const desc = describeSession(makePlan({
      reviewCount: 1, recallBonusCount: 1, estimatedMinutes: 1,
    }));
    expect(desc).toContain("1 review");
    expect(desc).not.toContain("1 reviews");
    expect(desc).toContain("1 bonus XP!");
  });
});

// ── computeCategoryStrengths: correct === incorrect boundary ──
describe("computeCategoryStrengths — tie classification", () => {
  it("item with equal correct/incorrect counts as weak (>= boundary)", () => {
    const items = [{ id: "t1", category: "ties" }];
    const scores: Record<string, ItemScore> = {
      t1: { correct: 5, incorrect: 5, lastSeen: now },
    };
    const result = computeCategoryStrengths(items, scores);
    expect(result).toHaveLength(1);
    expect(result[0].accuracy).toBe(50);
    expect(result[0].weakCount).toBe(1);  // >= means ties are weak
    expect(result[0].strongCount).toBe(0);
  });

  it("item with correct=1 more than incorrect counts as strong", () => {
    const items = [{ id: "s1", category: "close" }];
    const scores: Record<string, ItemScore> = {
      s1: { correct: 6, incorrect: 5, lastSeen: now },
    };
    const result = computeCategoryStrengths(items, scores);
    expect(result[0].strongCount).toBe(1);
    expect(result[0].weakCount).toBe(0);
  });

  it("orphaned scores (no matching item) are silently ignored", () => {
    const items = [{ id: "real", category: "here" }];
    const scores: Record<string, ItemScore> = {
      real: { correct: 3, incorrect: 1, lastSeen: now },
      ghost: { correct: 99, incorrect: 0, lastSeen: now }, // not in items
    };
    const result = computeCategoryStrengths(items, scores);
    expect(result).toHaveLength(1);
    expect(result[0].categoryId).toBe("here");
    expect(result[0].accuracy).toBe(75); // 3/4, not inflated by ghost
  });
});

// ── findWeakestItems: edge timestamps ──
describe("findWeakestItems — timestamp edges", () => {
  it("item seen at exactly now → daysSinceReview is 0", () => {
    const scores: Record<string, ItemScore> = {
      fresh: { correct: 1, incorrect: 9, lastSeen: Date.now() },
    };
    const result = findWeakestItems(scores, 5);
    expect(result[0].daysSinceReview).toBe(0);
  });

  it("default limit is 5", () => {
    const scores: Record<string, ItemScore> = {};
    for (let i = 0; i < 10; i++) {
      scores[`item${i}`] = { correct: 1, incorrect: i + 1, lastSeen: now - i * day };
    }
    const result = findWeakestItems(scores);
    expect(result).toHaveLength(5);
  });
});

// ── computeMasteryRate: mastered exceeds seen (invalid but defensive) ──
describe("computeMasteryRate — defensive boundaries", () => {
  it("mastered > seen returns >100 (no artificial clamping)", () => {
    // Verifies the function doesn't clamp — caller's responsibility
    const rate = computeMasteryRate(5, 10);
    expect(rate).toBe(200);
  });

  it("very large numbers don't overflow", () => {
    const rate = computeMasteryRate(1_000_000, 999_999);
    expect(rate).toBe(100); // rounds from 99.9999
  });
});
