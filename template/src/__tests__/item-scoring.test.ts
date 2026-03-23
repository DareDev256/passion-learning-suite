import { describe, it, expect, beforeEach } from "vitest";
import {
  updateItemScore,
  getProgress,
  saveProgress,
  getItemsForReview,
  getRecallMultiplier,
  saveFSRSCard,
  getDueItems,
} from "@/lib/storage";

// ─── localStorage mock ───
const store: Record<string, string> = {};
const ls = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};

beforeEach(() => {
  ls.clear();
  Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: ls, writable: true, configurable: true });
});

// ─── updateItemScore ───
describe("updateItemScore", () => {
  it("creates a new score entry for an unseen item", () => {
    const p = updateItemScore("new-item", true);
    expect(p.itemScores["new-item"]).toBeDefined();
    expect(p.itemScores["new-item"].correct).toBe(1);
    expect(p.itemScores["new-item"].incorrect).toBe(0);
    expect(p.itemScores["new-item"].lastSeen).toBeGreaterThan(0);
  });

  it("increments incorrect counter on wrong answer", () => {
    updateItemScore("q1", false);
    const p = getProgress();
    expect(p.itemScores["q1"].correct).toBe(0);
    expect(p.itemScores["q1"].incorrect).toBe(1);
  });

  it("accumulates scores across multiple answers", () => {
    updateItemScore("q1", true);
    updateItemScore("q1", true);
    updateItemScore("q1", false);
    const p = getProgress();
    expect(p.itemScores["q1"].correct).toBe(2);
    expect(p.itemScores["q1"].incorrect).toBe(1);
  });

  it("updates lastSeen on each answer", () => {
    updateItemScore("q1", true);
    const first = getProgress().itemScores["q1"].lastSeen;
    // Ensure time advances (vi.advanceTimersByTime not needed — Date.now() is monotonic enough)
    updateItemScore("q1", false);
    const second = getProgress().itemScores["q1"].lastSeen;
    expect(second).toBeGreaterThanOrEqual(first);
  });

  it("preserves other items when updating one", () => {
    updateItemScore("q1", true);
    updateItemScore("q2", false);
    const p = getProgress();
    expect(p.itemScores["q1"].correct).toBe(1);
    expect(p.itemScores["q2"].incorrect).toBe(1);
  });

  it("preserves non-itemScore progress fields", () => {
    saveProgress({ ...getProgress(), xp: 500, streak: 7 });
    updateItemScore("q1", true);
    const p = getProgress();
    expect(p.xp).toBe(500);
    expect(p.streak).toBe(7);
  });
});

// ─── getItemsForReview fallback sort order ───
describe("getItemsForReview fallback ordering", () => {
  it("sorts by lastSeen ascending (oldest mistakes first)", () => {
    const base = getProgress();
    base.itemScores = {
      recent: { correct: 0, incorrect: 3, lastSeen: 3000 },
      oldest: { correct: 0, incorrect: 2, lastSeen: 1000 },
      middle: { correct: 0, incorrect: 4, lastSeen: 2000 },
    };
    saveProgress(base);
    const review = getItemsForReview(3);
    expect(review).toEqual(["oldest", "middle", "recent"]);
  });

  it("excludes items where correct > incorrect", () => {
    const base = getProgress();
    base.itemScores = {
      strong: { correct: 5, incorrect: 1, lastSeen: 1000 },
      weak: { correct: 1, incorrect: 3, lastSeen: 2000 },
    };
    saveProgress(base);
    const review = getItemsForReview(5);
    expect(review).toContain("weak");
    expect(review).not.toContain("strong");
  });

  it("returns empty when all items are strong", () => {
    const base = getProgress();
    base.itemScores = {
      a: { correct: 5, incorrect: 0, lastSeen: 1000 },
      b: { correct: 3, incorrect: 1, lastSeen: 2000 },
    };
    saveProgress(base);
    expect(getItemsForReview(5)).toEqual([]);
  });

  it("respects limit parameter", () => {
    const base = getProgress();
    base.itemScores = {
      a: { correct: 0, incorrect: 5, lastSeen: 1000 },
      b: { correct: 0, incorrect: 3, lastSeen: 2000 },
      c: { correct: 0, incorrect: 2, lastSeen: 3000 },
    };
    saveProgress(base);
    expect(getItemsForReview(2)).toHaveLength(2);
  });

  it("FSRS due items take priority over naive fallback", () => {
    const now = Date.now();
    saveFSRSCard({ itemId: "fsrs-1", due: now - 5000, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 0 });
    const base = getProgress();
    base.itemScores = { weak: { correct: 0, incorrect: 10, lastSeen: 1000 } };
    saveProgress(base);
    const review = getItemsForReview(5);
    expect(review[0]).toBe("fsrs-1");
    expect(review).not.toContain("weak"); // FSRS returned results, so fallback not used
  });
});

// ─── getDueItems edge cases ───
describe("getDueItems edge cases", () => {
  it("returns empty when no FSRS cards exist", () => {
    expect(getDueItems()).toEqual([]);
  });

  it("returns empty when all cards are future-due", () => {
    const future = Date.now() + 999999;
    saveFSRSCard({ itemId: "a", due: future, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 0 });
    expect(getDueItems()).toEqual([]);
  });

  it("respects default limit of 5", () => {
    const past = Date.now() - 1000;
    for (let i = 0; i < 8; i++) {
      saveFSRSCard({ itemId: `card-${i}`, due: past - i * 100, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 0 });
    }
    expect(getDueItems()).toHaveLength(5);
  });
});

// ─── Recall multiplier boundary ───
describe("getRecallMultiplier boundaries", () => {
  it("returns 1x at exactly 6 days 23 hours (just under 7 days)", () => {
    const almostSevenDays = Date.now() - (6.96 * 86400000);
    saveProgress({ ...getProgress(), itemScores: { x: { correct: 1, incorrect: 0, lastSeen: almostSevenDays } } });
    expect(getRecallMultiplier("x")).toBe(1);
  });

  it("returns 2x at exactly 7 days", () => {
    const exactlySevenDays = Date.now() - (7 * 86400000);
    saveProgress({ ...getProgress(), itemScores: { x: { correct: 1, incorrect: 0, lastSeen: exactlySevenDays } } });
    expect(getRecallMultiplier("x")).toBe(2);
  });

  it("returns 2x at 29 days (just under 30)", () => {
    const twentyNineDays = Date.now() - (29 * 86400000);
    saveProgress({ ...getProgress(), itemScores: { x: { correct: 1, incorrect: 0, lastSeen: twentyNineDays } } });
    expect(getRecallMultiplier("x")).toBe(2);
  });

  it("returns 3x at exactly 30 days", () => {
    const exactlyThirtyDays = Date.now() - (30 * 86400000);
    saveProgress({ ...getProgress(), itemScores: { x: { correct: 1, incorrect: 0, lastSeen: exactlyThirtyDays } } });
    expect(getRecallMultiplier("x")).toBe(3);
  });
});
