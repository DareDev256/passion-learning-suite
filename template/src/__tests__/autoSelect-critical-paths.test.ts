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

// ── Zero-timestamp FSRS cards: lastReview=0 means "never reviewed" ──
// Bug surface: daysSince = Date.now()/86400000 ≈ 19000+ days → false recall-bonus
describe("planSession — zero-timestamp FSRS lastReview", () => {
  const items = [mk("z1", "cat", "easy"), mk("z2", "cat", "easy")];

  it("lastReview: 0 with no itemScores → daysSince is 0, no false recall-bonus", () => {
    seedCards([
      { itemId: "z1", due: now - day, stability: 1, difficulty: 5, reps: 1, lapses: 0, lastReview: 0 },
    ]);
    // No seedProgress — card.lastReview=0, scores[id]?.lastSeen=undefined → fallback 0
    // daysSince check: lastReviewTs=0, then daysSince=0 (guard path)
    const plan = planSession(items, { sessionSize: 2, reviewRatio: 1 });
    const z1 = plan.items.find((i) => i.item.id === "z1");
    expect(z1).toBeDefined();
    // lastReviewTs=0 → daysSince=0 (the > 0 guard catches it) → regular review
    expect(z1!.reason).toBe("review");
  });

  it("lastReview: 0 with recent itemScores.lastSeen → uses lastSeen fallback", () => {
    seedCards([
      { itemId: "z1", due: now - day, stability: 1, difficulty: 5, reps: 1, lapses: 0, lastReview: 0 },
    ]);
    seed({ z1: { correct: 2, incorrect: 0, lastSeen: now - 2 * day } });
    const plan = planSession(items, { sessionSize: 2, reviewRatio: 1 });
    const z1 = plan.items.find((i) => i.item.id === "z1");
    // card.lastReview=0 → falls to scores[id]?.lastSeen = 2 days ago → no bonus
    expect(z1!.reason).toBe("review");
  });
});

// ── Fractional slot rounding: floor() can zero-out phases ──
describe("planSession — fractional slot rounding", () => {
  const items = Array.from({ length: 10 }, (_, i) => mk(`f${i}`, "cat", "easy"));

  it("sessionSize:3 reviewRatio:0.33 → floor(0.99)=0 review slots", () => {
    seedCards([
      { itemId: "f0", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
    ]);
    seed({ f0: { correct: 3, incorrect: 0, lastSeen: now - 2 * day } });
    const plan = planSession(items, { sessionSize: 3, reviewRatio: 0.33 });
    // floor(3 * 0.33) = floor(0.99) = 0 → review phase gets 0 slots
    const reviews = plan.items.filter((i) => i.reason === "review" || i.reason === "recall-bonus");
    expect(reviews.length).toBe(0);
    expect(plan.items.length).toBe(3);
  });

  it("sessionSize:7 reviewRatio:0.15 → floor(1.05)=1 review slot", () => {
    seedCards([
      { itemId: "f0", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
      { itemId: "f1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 3 * day },
    ]);
    seed({
      f0: { correct: 3, incorrect: 0, lastSeen: now - 2 * day },
      f1: { correct: 2, incorrect: 0, lastSeen: now - 3 * day },
    });
    const plan = planSession(items, { sessionSize: 7, reviewRatio: 0.15 });
    const reviews = plan.items.filter((i) => i.reason === "review" || i.reason === "recall-bonus");
    expect(reviews.length).toBe(1); // only 1 slot despite 2 due cards
  });
});

// ── reviewCount arithmetic: review + recall-bonus must sum correctly ──
describe("planSession — reviewCount includes recall-bonus items", () => {
  const items = [
    mk("r1", "cat", "easy"), mk("r2", "cat", "easy"),
    mk("r3", "cat", "easy"), mk("n1", "cat", "medium"),
  ];

  it("2 recall-bonus + 1 regular review → reviewCount=3, recallBonusCount=2", () => {
    seedCards([
      { itemId: "r1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 10 * day },
      { itemId: "r2", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 8 * day },
      { itemId: "r3", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
    ]);
    seed({
      r1: { correct: 3, incorrect: 0, lastSeen: now - 10 * day },
      r2: { correct: 2, incorrect: 0, lastSeen: now - 8 * day },
      r3: { correct: 4, incorrect: 0, lastSeen: now - 2 * day },
    });
    const plan = planSession(items, { sessionSize: 4, reviewRatio: 1 });
    expect(plan.recallBonusCount).toBe(2);
    expect(plan.reviewCount).toBe(3); // 2 recall-bonus + 1 review
    // Verify the sum: review-reason items + recall-bonus items = reviewCount
    const reviewReasonCount = plan.items.filter((i) => i.reason === "review").length;
    const bonusReasonCount = plan.items.filter((i) => i.reason === "recall-bonus").length;
    expect(reviewReasonCount + bonusReasonCount).toBe(plan.reviewCount);
  });
});

// ── dominantReason tie-breaking: when two reasons have equal counts ──
describe("planSession — dominantReason with ties", () => {
  it("returns a valid SessionItemReason even when counts tie", () => {
    // Force: 2 reviews + 2 new → tie between "review" and "new"
    const items = [
      mk("t1", "cat", "easy"), mk("t2", "cat", "easy"),
      mk("t3", "cat", "medium"), mk("t4", "cat", "medium"),
    ];
    seedCards([
      { itemId: "t1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day },
      { itemId: "t2", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 3 * day },
    ]);
    seed({
      t1: { correct: 3, incorrect: 0, lastSeen: now - 2 * day },
      t2: { correct: 2, incorrect: 0, lastSeen: now - 3 * day },
    });
    const plan = planSession(items, { sessionSize: 4, reviewRatio: 0.5 });
    const validReasons: string[] = ["review", "recall-bonus", "weak-category", "new"];
    expect(validReasons).toContain(plan.dominantReason);
    // Must be one of the tied leaders, not a zero-count reason
    const counts: Record<string, number> = { review: 0, "recall-bonus": 0, "weak-category": 0, new: 0 };
    for (const si of plan.items) counts[si.reason]++;
    const maxCount = Math.max(...Object.values(counts));
    expect(counts[plan.dominantReason]).toBe(maxCount);
  });
});

// ── selectItems: oldest-seen ordering when all items have scores ──
describe("selectItems — oldest-seen tiebreaker with scored items", () => {
  it("prefers oldest-seen items over recently-seen ones", () => {
    const items = [
      mk("o1", "cat", "easy"), mk("o2", "cat", "easy"),
      mk("o3", "cat", "easy"), mk("o4", "cat", "easy"),
    ];
    seed({
      o1: { correct: 1, incorrect: 0, lastSeen: now - 1000 },  // most recent
      o2: { correct: 1, incorrect: 0, lastSeen: now - 50000 }, // oldest
      o3: { correct: 1, incorrect: 0, lastSeen: now - 30000 }, // middle
      o4: { correct: 1, incorrect: 0, lastSeen: now - 40000 }, // second oldest
    });
    const profile: DifficultyProfile = {
      recommended: "easy",
      performance: {
        easy: { accuracy: 80, attempts: 4, streak: 0 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
      confidence: "high",
    };
    const sel = selectItems(items, 2, profile);
    // Should pick the two oldest-seen: o2 (50000ms ago) and o4 (40000ms ago)
    expect(sel[0].id).toBe("o2");
    expect(sel[1].id).toBe("o4");
  });

  it("unseen items always rank above any seen item regardless of age", () => {
    const items = [
      mk("s1", "cat", "easy"), mk("u1", "cat", "easy"),
    ];
    seed({
      s1: { correct: 1, incorrect: 0, lastSeen: now - 999_999_999 }, // very old but seen
      // u1 has no score → unseen
    });
    const profile: DifficultyProfile = {
      recommended: "easy",
      performance: {
        easy: { accuracy: 80, attempts: 1, streak: 0 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
      confidence: "low",
    };
    const sel = selectItems(items, 2, profile);
    expect(sel[0].id).toBe("u1"); // unseen first
    expect(sel[1].id).toBe("s1"); // then oldest seen
  });
});

// ── describeSession: recall-bonus as sole dominant reason ──
describe("describeSession — recall-bonus dominant session", () => {
  function makePlan(overrides: Partial<SessionPlan>): SessionPlan {
    return {
      items: [], reviewCount: 0, newCount: 0,
      weakCategoryCount: 0, recallBonusCount: 0,
      estimatedMinutes: 0, dominantReason: "new", ...overrides,
    };
  }

  it("handles weak-area-only session (no reviews, no new)", () => {
    const desc = describeSession(makePlan({
      weakCategoryCount: 4, estimatedMinutes: 3,
    }));
    expect(desc).toContain("4 weak-area drills");
    expect(desc).not.toContain("review");
    expect(desc).not.toContain("new item");
    expect(desc).toContain("~3 min");
  });

  it("review with all items being recall-bonus", () => {
    const desc = describeSession(makePlan({
      reviewCount: 5, recallBonusCount: 5, estimatedMinutes: 4,
    }));
    expect(desc).toContain("5 reviews");
    expect(desc).toContain("5 bonus XP!");
    expect(desc).toContain("~4 min");
  });
});

// ── analyzeDifficulty: single-answer edge case at exact thresholds ──
describe("analyzeDifficulty — single-item threshold precision", () => {
  const items = [mk("e1", "t", "easy"), mk("m1", "t", "medium"), mk("h1", "t", "hard")];

  it("easy at exactly 85% with 20 attempts → promotes to medium", () => {
    seed({ e1: { correct: 17, incorrect: 3, lastSeen: now } }); // 17/20 = 85%
    expect(analyzeDifficulty(items).recommended).toBe("medium");
  });

  it("easy at 84% → stays easy (just below threshold)", () => {
    // Need accuracy to round to 84: correct=21, incorrect=4 → 21/25 = 84%
    seed({ e1: { correct: 21, incorrect: 4, lastSeen: now } });
    expect(analyzeDifficulty(items).recommended).toBe("easy");
  });

  it("medium at exactly 49% → demotes to easy", () => {
    // 49/100 won't work with window=5. Within window: correct+incorrect < 50
    // Single item: correct=49, incorrect=51 → 49% → below 50 → demote
    seed({ m1: { correct: 49, incorrect: 51, lastSeen: now } });
    expect(analyzeDifficulty(items).recommended).toBe("easy");
  });
});
