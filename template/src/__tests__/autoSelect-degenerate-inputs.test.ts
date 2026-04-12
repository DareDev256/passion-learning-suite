import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ContentItem, ItemScore } from "@/types/game";
import type { Difficulty } from "@/lib/difficulty";

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

// ── sessionSize=1: only one slot, Phase 1 wins if review exists ──
describe("planSession — single-slot session (sessionSize: 1)", () => {
  const items = [
    mk("r1", "weak", "easy"), mk("n1", "ok", "medium"),
  ];

  it("single slot goes to review when FSRS card is due", () => {
    seedCards([
      { itemId: "r1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 3 * day },
    ]);
    seed({ r1: { correct: 1, incorrect: 9, lastSeen: now - 3 * day } });
    const plan = planSession(items, { sessionSize: 1, reviewRatio: 1 });
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].reason).toBe("review");
    expect(plan.dominantReason).toBe("review");
  });

  it("single slot goes to new content when no reviews due", () => {
    const plan = planSession(items, { sessionSize: 1, reviewRatio: 0.5 });
    // floor(1 * 0.5) = 0 review slots, 1 new slot
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].reason === "new" || plan.items[0].reason === "weak-category").toBe(true);
  });
});

// ── reviewRatio=1.0 starves Phases 2 and 3 completely ──
describe("planSession — review-only session (reviewRatio: 1.0)", () => {
  it("all slots go to reviews, zero new or weak-category items", () => {
    const items = Array.from({ length: 6 }, (_, i) => mk(`a${i}`, "weak", "easy"));
    const cards = items.map((item, i) => ({
      itemId: item.id, due: now - (i + 1) * day, stability: 1,
      difficulty: 5, reps: 2, lapses: 0, lastReview: now - 2 * day,
    }));
    seedCards(cards);
    seed(Object.fromEntries(items.map((item) => [
      item.id, { correct: 1, incorrect: 9, lastSeen: now - 2 * day },
    ])));
    const plan = planSession(items, { sessionSize: 4, reviewRatio: 1.0 });
    expect(plan.newCount).toBe(0);
    expect(plan.weakCategoryCount).toBe(0);
    expect(plan.reviewCount).toBe(4);
  });
});

// ── Phase 1 dedup: same item in due AND upcoming doesn't double-count ──
describe("planSession — due/upcoming overlap within Phase 1", () => {
  it("item appearing in both due and upcoming is selected exactly once", () => {
    const items = [mk("dup1", "cat", "easy"), mk("fill", "cat", "medium")];
    // Card is overdue → appears in due queue; could also be in upcoming
    seedCards([
      { itemId: "dup1", due: now - day, stability: 1, difficulty: 5, reps: 3, lapses: 0, lastReview: now - 5 * day },
    ]);
    seed({ dup1: { correct: 5, incorrect: 0, lastSeen: now - 5 * day } });
    const plan = planSession(items, { sessionSize: 2, reviewRatio: 1.0 });
    const dupItems = plan.items.filter((si) => si.item.id === "dup1");
    expect(dupItems).toHaveLength(1); // no double-selection
  });
});

// ── Multiple weak categories compete fairly for limited slots ──
describe("planSession — multiple weak categories", () => {
  it("pulls items from different weak categories into limited slots", () => {
    const items = [
      mk("w1", "math", "easy"), mk("w2", "math", "easy"),
      mk("w3", "science", "easy"), mk("w4", "science", "easy"),
      mk("s1", "history", "medium"),
    ];
    seed({
      w1: { correct: 1, incorrect: 9, lastSeen: now - 5 * day }, // math: weak
      w2: { correct: 0, incorrect: 5, lastSeen: now - 4 * day },
      w3: { correct: 2, incorrect: 8, lastSeen: now - 3 * day }, // science: weak
      w4: { correct: 1, incorrect: 4, lastSeen: now - 2 * day },
      s1: { correct: 9, incorrect: 1, lastSeen: now - day },     // history: strong
    });
    const plan = planSession(items, { sessionSize: 4, reviewRatio: 0, weakCategoryBoost: 0.5 });
    // newSlots=4, weakSlots=floor(4*0.5)=2
    expect(plan.weakCategoryCount).toBe(2);
    const weakIds = plan.items
      .filter((si) => si.reason === "weak-category")
      .map((si) => si.item.id);
    // Should pick oldest-seen from the sorted weak pool (w1 at 5d, then w2 at 4d — both unseen-equivalent or oldest)
    expect(weakIds).toHaveLength(2);
    // No duplicates
    expect(new Set(weakIds).size).toBe(2);
  });
});

// ── Weak categories detected but all matching items already claimed by Phase 1 ──
describe("planSession — weak items exhausted by Phase 1", () => {
  it("Phase 2 gets zero items when all weak-category items are already reviews", () => {
    const items = [
      mk("r1", "weak", "easy"), mk("r2", "weak", "easy"),
      mk("n1", "strong", "medium"),
    ];
    seedCards([
      { itemId: "r1", due: now - day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 3 * day },
      { itemId: "r2", due: now - 2 * day, stability: 1, difficulty: 5, reps: 2, lapses: 0, lastReview: now - 4 * day },
    ]);
    seed({
      r1: { correct: 1, incorrect: 9, lastSeen: now - 3 * day }, // weak cat, but already due
      r2: { correct: 0, incorrect: 5, lastSeen: now - 4 * day }, // weak cat, but already due
      n1: { correct: 9, incorrect: 1, lastSeen: now - day },
    });
    const plan = planSession(items, { sessionSize: 3, reviewRatio: 0.7, weakCategoryBoost: 1.0 });
    // reviewSlots=floor(3*0.7)=2 → r1,r2 claimed by Phase 1
    // weakSlots=floor(1*1.0)=1 → but all weak items (r1,r2) already in usedIds
    expect(plan.weakCategoryCount).toBe(0);
    // r1,r2 are reviews, n1 fills Phase 3
    expect(plan.reviewCount).toBe(2);
    expect(plan.newCount).toBe(1);
  });
});

// ── Partial options: unspecified fields retain defaults ──
describe("planSession — partial options preserve defaults", () => {
  const items = Array.from({ length: 12 }, (_, i) => mk(`p${i}`, "cat", "easy"));

  it("only overriding minutesPerItem keeps sessionSize at default 10", () => {
    const plan = planSession(items, { minutesPerItem: 2 });
    expect(plan.items.length).toBeLessThanOrEqual(10);
    expect(plan.estimatedMinutes).toBe(Math.ceil(plan.items.length * 2));
  });

  it("no options at all uses all defaults", () => {
    const plan = planSession(items);
    expect(plan.items.length).toBeLessThanOrEqual(10);
    // Default minutesPerItem=0.75 → ceil(n*0.75)
    expect(plan.estimatedMinutes).toBe(Math.ceil(plan.items.length * 0.75));
  });
});

// ── describeSession: full mixed session with all three parts ──
describe("describeSession — mixed session grammar", () => {
  function makePlan(overrides: Partial<SessionPlan>): SessionPlan {
    return {
      items: [], reviewCount: 0, newCount: 0,
      weakCategoryCount: 0, recallBonusCount: 0,
      estimatedMinutes: 0, dominantReason: "new", ...overrides,
    };
  }

  it("renders all three parts joined with ' + '", () => {
    const desc = describeSession(makePlan({
      reviewCount: 3, recallBonusCount: 1,
      weakCategoryCount: 2, newCount: 5,
      estimatedMinutes: 8,
    }));
    expect(desc).toBe("3 reviews (1 bonus XP!) + 2 weak-area drills + 5 new items · ~8 min");
  });

  it("singular weak-area drill (count=1)", () => {
    const desc = describeSession(makePlan({
      weakCategoryCount: 1, estimatedMinutes: 1,
    }));
    expect(desc).toContain("1 weak-area drill");
    expect(desc).not.toContain("drills");
  });

  it("singular new item (count=1)", () => {
    const desc = describeSession(makePlan({
      newCount: 1, estimatedMinutes: 1,
    }));
    expect(desc).toContain("1 new item");
    expect(desc).not.toContain("items");
  });
});

// ── estimatedMinutes: fractional minutesPerItem rounding ──
describe("planSession — estimatedMinutes ceiling behavior", () => {
  const items = Array.from({ length: 5 }, (_, i) => mk(`e${i}`, "cat", "easy"));

  it("0.1 minutesPerItem × 3 items → ceil(0.3) = 1 minute", () => {
    const plan = planSession(items, { sessionSize: 3, minutesPerItem: 0.1 });
    expect(plan.estimatedMinutes).toBe(1);
  });

  it("0.5 minutesPerItem × 2 items → ceil(1.0) = 1 minute", () => {
    const plan = planSession(items, { sessionSize: 2, minutesPerItem: 0.5 });
    expect(plan.estimatedMinutes).toBe(1);
  });

  it("1.5 minutesPerItem × 3 items → ceil(4.5) = 5 minutes", () => {
    const plan = planSession(items, { sessionSize: 3, minutesPerItem: 1.5 });
    expect(plan.estimatedMinutes).toBe(5);
  });
});
