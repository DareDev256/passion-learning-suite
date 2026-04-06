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
import { planSession, hasReviewsDue, describeSession } from "@/lib/sessionPlanner";

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

// ─── computeRecommendation cascade: hard<50% + medium data ───
describe("recommendation cascade when hard fails and medium exists", () => {
  const items = [
    mk("h1", "a", "hard"), mk("h2", "a", "hard"),
    mk("m1", "a", "medium"), mk("m2", "a", "medium"),
    mk("e1", "a", "easy"), mk("e2", "a", "easy"),
  ];

  it("hard<50% + medium≥85% → promotes to hard (medium overrides)", () => {
    seed({
      h1: { correct: 1, incorrect: 4, lastSeen: now - 1000 }, // hard: 20%
      m1: { correct: 5, incorrect: 0, lastSeen: now - 2000 },
      m2: { correct: 5, incorrect: 0, lastSeen: now - 3000 }, // medium: 100%
    });
    // hard < 50% → falls through; medium ≥ 85% → recommends hard
    expect(analyzeDifficulty(items).recommended).toBe("hard");
  });

  it("hard<50% + medium≥50% but <85% → stays medium", () => {
    seed({
      h1: { correct: 1, incorrect: 4, lastSeen: now - 1000 }, // hard: 20%
      m1: { correct: 3, incorrect: 2, lastSeen: now - 2000 }, // medium: 60%
    });
    expect(analyzeDifficulty(items).recommended).toBe("medium");
  });

  it("hard<50% + medium<50% → demotes to easy", () => {
    seed({
      h1: { correct: 0, incorrect: 3, lastSeen: now - 1000 }, // hard: 0%
      m1: { correct: 1, incorrect: 4, lastSeen: now - 2000 }, // medium: 20%
    });
    expect(analyzeDifficulty(items).recommended).toBe("easy");
  });
});

// ─── Recall-bonus 7-day boundary ───
describe("recall-bonus boundary at exactly 7 days", () => {
  const items = [mk("r1", "cat", "easy"), mk("r2", "cat", "easy")];

  it("item reviewed 7.0 days ago → recall-bonus", () => {
    const exactly7 = now - 7 * day;
    seedCards([
      { itemId: "r1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: exactly7 },
    ]);
    seed({ r1: { correct: 3, incorrect: 0, lastSeen: exactly7 } });
    const plan = planSession(items, { sessionSize: 2, reviewRatio: 1 });
    const r1 = plan.items.find((i) => i.item.id === "r1");
    expect(r1?.reason).toBe("recall-bonus");
    expect(plan.recallBonusCount).toBe(1);
  });

  it("item reviewed 6.99 days ago → regular review (no bonus)", () => {
    const justUnder7 = now - 6.99 * day;
    seedCards([
      { itemId: "r1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: justUnder7 },
    ]);
    seed({ r1: { correct: 3, incorrect: 0, lastSeen: justUnder7 } });
    const plan = planSession(items, { sessionSize: 2, reviewRatio: 1 });
    const r1 = plan.items.find((i) => i.item.id === "r1");
    expect(r1?.reason).toBe("review");
    expect(plan.recallBonusCount).toBe(0);
  });

  it("recall-bonus uses FSRS lastReview even when itemScores.lastSeen diverges", () => {
    // FSRS says 8 days ago (bonus), itemScores says 2 days ago (no bonus)
    // FSRS should win per v0.17.2 fix
    seedCards([
      { itemId: "r1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 8 * day },
    ]);
    seed({ r1: { correct: 3, incorrect: 0, lastSeen: now - 2 * day } });
    const plan = planSession(items, { sessionSize: 2, reviewRatio: 1 });
    expect(plan.items.find((i) => i.item.id === "r1")?.reason).toBe("recall-bonus");
  });
});

// ─── selectItems boundary inputs ───
describe("selectItems — boundary counts", () => {
  const items = [mk("a", "x", "easy"), mk("b", "x", "easy"), mk("c", "x", "medium")];
  const profile: DifficultyProfile = {
    recommended: "easy",
    performance: {
      easy: { accuracy: 90, attempts: 10, streak: 5 },
      medium: { accuracy: 50, attempts: 3, streak: 0 },
      hard: { accuracy: NaN, attempts: 0, streak: 0 },
    },
    confidence: "high",
  };

  it("count=0 returns empty array", () => {
    expect(selectItems(items, 0, profile)).toEqual([]);
  });

  it("count exceeding catalog returns all reachable items", () => {
    // easy→medium (no hard access), so 3 items total reachable
    const sel = selectItems(items, 100, profile);
    expect(sel.length).toBe(3);
  });

  it("empty catalog returns empty regardless of count", () => {
    expect(selectItems([], 10, profile)).toEqual([]);
  });
});

// ─── Same-millisecond sort stability ───
describe("selectItems — timestamp tiebreaking", () => {
  it("items with identical lastSeen are all selectable (no drops)", () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      mk(`s${i}`, "cat", "easy"),
    );
    const sameTs = now - 5000;
    const scores: Record<string, ItemScore> = {};
    for (const item of items) {
      scores[item.id] = { correct: 1, incorrect: 0, lastSeen: sameTs };
    }
    seed(scores);
    const profile: DifficultyProfile = {
      recommended: "easy",
      performance: {
        easy: { accuracy: 80, attempts: 6, streak: 3 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
      confidence: "high",
    };
    const sel = selectItems(items, 6, profile);
    expect(sel.length).toBe(6);
    expect(new Set(sel.map((s) => s.id)).size).toBe(6);
  });
});

// ─── Catalog exhaustion: fewer items than sessionSize ───
describe("planSession — catalog exhaustion", () => {
  const tinyItems = [mk("x1", "cat", "easy"), mk("x2", "cat", "medium")];

  it("gracefully returns fewer items than sessionSize", () => {
    const plan = planSession(tinyItems, { sessionSize: 10 });
    expect(plan.items.length).toBeLessThanOrEqual(2);
    expect(plan.items.length).toBeGreaterThan(0);
    // No duplicates even under pressure
    const ids = plan.items.map((i) => i.item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("estimated minutes reflects actual items, not requested sessionSize", () => {
    const plan = planSession(tinyItems, { sessionSize: 20, minutesPerItem: 1 });
    expect(plan.estimatedMinutes).toBeLessThanOrEqual(2);
  });
});

// ─── hasReviewsDue ───
describe("hasReviewsDue", () => {
  it("returns true when FSRS has due items", () => {
    seedCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
    ]);
    seed({ a1: { correct: 3, incorrect: 0, lastSeen: now - 2 * day } });
    expect(hasReviewsDue()).toBe(true);
  });

  it("returns false when no cards exist", () => {
    expect(hasReviewsDue()).toBe(false);
  });

  it("returns false when all cards are in the future", () => {
    seedCards([
      { itemId: "a1", due: now + 5 * day, stability: 3, difficulty: 4, reps: 5, lapses: 0, lastReview: now },
    ]);
    seed({ a1: { correct: 5, incorrect: 0, lastSeen: now } });
    expect(hasReviewsDue()).toBe(false);
  });
});

// ─── Full 3-phase competition on constrained catalog ───
describe("three-phase deduplication under catalog pressure", () => {
  it("each item appears exactly once even when eligible for multiple phases", () => {
    // a1: due for review AND in a weak category AND matches difficulty
    const items = [
      mk("a1", "weak-cat", "easy"),
      mk("a2", "weak-cat", "easy"),
      mk("b1", "strong-cat", "medium"),
    ];
    seedCards([
      { itemId: "a1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
    ]);
    seed({
      a1: { correct: 1, incorrect: 9, lastSeen: now - 2 * day }, // weak-cat: 10%
      a2: { correct: 0, incorrect: 5, lastSeen: now - 3 * day },
      b1: { correct: 9, incorrect: 1, lastSeen: now - day },     // strong-cat: 90%
    });
    const plan = planSession(items, { sessionSize: 3, reviewRatio: 0.4, weakCategoryBoost: 0.5 });

    // a1 should be "review" (phase 1 claims it), NOT weak-category
    const a1 = plan.items.find((i) => i.item.id === "a1");
    expect(a1).toBeDefined();
    expect(a1!.reason === "review" || a1!.reason === "recall-bonus").toBe(true);

    // No duplicates
    const ids = plan.items.map((i) => i.item.id);
    expect(new Set(ids).size).toBe(ids.length);

    // All items accounted for (catalog is tiny enough to use all)
    expect(plan.items.length).toBe(3);
  });
});
