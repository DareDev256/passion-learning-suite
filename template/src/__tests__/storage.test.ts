import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getProgress,
  saveProgress,
  addXP,
  completeLevel,
  updateStreak,
  getRecallMultiplier,
  updateItemScore,
  checkMastery,
  recordMasteryAttempt,
  saveFSRSCard,
  getFSRSCards,
  getDueItems,
  getItemsForReview,
  recordLearningEvent,
  getLearningAnalytics,
  resetProgress,
} from "@/lib/storage";

// ─── localStorage mock ───
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
};

beforeEach(() => {
  localStorageMock.clear();
  Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true, configurable: true });
});

// ─── XP + Leveling ───
describe("XP system", () => {
  it("starts at 0 XP level 1", () => {
    const p = getProgress();
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
  });

  it("addXP increases XP and computes level (100 XP per level)", () => {
    addXP(250);
    const p = getProgress();
    expect(p.xp).toBe(250);
    expect(p.level).toBe(3); // floor(250/100) + 1
  });

  it("addXP applies multiplier correctly", () => {
    addXP(50, 3);
    expect(getProgress().xp).toBe(150);
  });

  it("addXP accumulates across calls", () => {
    addXP(60);
    addXP(90);
    expect(getProgress().xp).toBe(150);
  });
});

// ─── Recall Multiplier ───
describe("recall multiplier", () => {
  it("returns 1x for never-seen items", () => {
    expect(getRecallMultiplier("new-item")).toBe(1);
  });

  it("returns 1x for recently seen items", () => {
    updateItemScore("item-1", true);
    expect(getRecallMultiplier("item-1")).toBe(1);
  });

  it("returns 2x after 7+ days", () => {
    const sevenDaysAgo = Date.now() - 8 * 86400000;
    const p = getProgress();
    p.itemScores["item-2"] = { correct: 1, incorrect: 0, lastSeen: sevenDaysAgo };
    saveProgress(p);
    expect(getRecallMultiplier("item-2")).toBe(2);
  });

  it("returns 3x after 30+ days", () => {
    const thirtyDaysAgo = Date.now() - 31 * 86400000;
    const p = getProgress();
    p.itemScores["item-3"] = { correct: 1, incorrect: 0, lastSeen: thirtyDaysAgo };
    saveProgress(p);
    expect(getRecallMultiplier("item-3")).toBe(3);
  });
});

// ─── Streak System ───
describe("streak system", () => {
  it("first play starts streak at 1", () => {
    const p = updateStreak();
    expect(p.streak).toBe(1);
  });

  it("same day does not increment streak", () => {
    updateStreak();
    const p = updateStreak();
    expect(p.streak).toBe(1);
  });

  it("consecutive day extends streak", () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    localStorageMock.setItem("passionate_learning_last_played", yesterday);
    saveProgress({ ...getProgress(), streak: 5 });

    const p = updateStreak();
    expect(p.streak).toBe(6);
  });

  it("2-day gap with 1 freeze continues streak", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toDateString();
    localStorageMock.setItem("passionate_learning_last_played", twoDaysAgo);
    saveProgress({ ...getProgress(), streak: 3, streakFreezes: 2 });

    const p = updateStreak();
    expect(p.streak).toBe(4);
    expect(p.streakFreezes).toBe(1); // used 1 freeze for 1 missed day
  });

  it("3-day gap without enough freezes resets streak", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toDateString();
    localStorageMock.setItem("passionate_learning_last_played", threeDaysAgo);
    saveProgress({ ...getProgress(), streak: 10, streakFreezes: 1 });

    const p = updateStreak();
    expect(p.streak).toBe(1); // reset — needed 2 freezes, had 1
  });
});

// ─── Level Completion + Streak Freeze Earning ───
describe("level completion", () => {
  it("adds level to completedLevels", () => {
    const p = completeLevel("ai-basics", 1);
    expect(p.completedLevels).toContain("ai-basics-1");
  });

  it("does not duplicate completed levels", () => {
    completeLevel("ai-basics", 1);
    const p = completeLevel("ai-basics", 1);
    expect(p.completedLevels.filter((l: string) => l === "ai-basics-1")).toHaveLength(1);
  });

  it("awards streak freeze every 10 levels completed", () => {
    for (let i = 1; i <= 10; i++) completeLevel("cat", i);
    const p = getProgress();
    expect(p.streakFreezes).toBe(1);
  });

  it("does not award freeze at 9 levels", () => {
    for (let i = 1; i <= 9; i++) completeLevel("cat", i);
    expect(getProgress().streakFreezes).toBe(0);
  });
});

// ─── Mastery Gate ───
describe("mastery gate", () => {
  it("requires 3 attempts minimum", () => {
    recordMasteryAttempt("lv-1", 100);
    recordMasteryAttempt("lv-1", 95);
    expect(checkMastery("lv-1")).toBe(false);
  });

  it("passes when last 3 attempts are all ≥90%", () => {
    recordMasteryAttempt("lv-2", 50);
    recordMasteryAttempt("lv-2", 92);
    recordMasteryAttempt("lv-2", 91);
    recordMasteryAttempt("lv-2", 95);
    expect(checkMastery("lv-2")).toBe(true);
  });

  it("fails when any of last 3 attempts is <90%", () => {
    recordMasteryAttempt("lv-3", 95);
    recordMasteryAttempt("lv-3", 89);
    recordMasteryAttempt("lv-3", 100);
    expect(checkMastery("lv-3")).toBe(false);
  });

  it("keeps only last 5 attempts", () => {
    for (let i = 0; i < 7; i++) recordMasteryAttempt("lv-4", 70);
    const stored = JSON.parse(localStorageMock.getItem("passionate_learning_mastery")!);
    expect(stored["lv-4"]).toHaveLength(5);
  });
});

// ─── FSRS Cards ───
describe("FSRS card storage", () => {
  it("saves and retrieves cards", () => {
    saveFSRSCard({ itemId: "q1", due: 1000, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 900 });
    const cards = getFSRSCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].itemId).toBe("q1");
  });

  it("updates existing card by itemId", () => {
    saveFSRSCard({ itemId: "q1", due: 1000, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 900 });
    saveFSRSCard({ itemId: "q1", due: 2000, stability: 0.8, difficulty: 0.2, reps: 2, lapses: 0, lastReview: 1500 });
    const cards = getFSRSCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].due).toBe(2000);
  });

  it("getDueItems returns only past-due items sorted by due date", () => {
    const now = Date.now();
    saveFSRSCard({ itemId: "late", due: now - 5000, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 0 });
    saveFSRSCard({ itemId: "future", due: now + 99999, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 0 });
    saveFSRSCard({ itemId: "earlier", due: now - 10000, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 0 });
    const due = getDueItems(10);
    expect(due).toEqual(["earlier", "late"]);
  });
});

// ─── Review Queue Fallback ───
describe("review queue", () => {
  it("prefers FSRS-scheduled items over naive fallback", () => {
    const now = Date.now();
    saveFSRSCard({ itemId: "fsrs-item", due: now - 1000, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 0 });
    updateItemScore("weak-item", false);
    const items = getItemsForReview();
    expect(items[0]).toBe("fsrs-item");
  });

  it("falls back to incorrect-heavy items when no FSRS cards are due", () => {
    updateItemScore("weak", false);
    updateItemScore("weak", false);
    updateItemScore("strong", true);
    const items = getItemsForReview();
    expect(items).toContain("weak");
    expect(items).not.toContain("strong");
  });
});

// ─── Analytics ───
describe("learning analytics", () => {
  it("records events and computes retention rate", () => {
    recordLearningEvent({ type: "review_correct", itemId: "a", timestamp: Date.now(), daysSinceLastSeen: 10 });
    recordLearningEvent({ type: "review_incorrect", itemId: "b", timestamp: Date.now(), daysSinceLastSeen: 8 });
    const analytics = getLearningAnalytics();
    expect(analytics.totalItemsSeen).toBe(2);
    expect(analytics.retentionRate7Day).toBe(50); // 1 correct / 2 attempts at 7d+
  });

  it("trims events to last 1000", () => {
    for (let i = 0; i < 1050; i++) {
      recordLearningEvent({ type: "first_correct", itemId: `item-${i}`, timestamp: i });
    }
    const stored = JSON.parse(localStorageMock.getItem("passionate_learning_analytics")!);
    expect(stored).toHaveLength(1000);
  });
});

// ─── Reset ───
describe("resetProgress", () => {
  it("clears all storage keys", () => {
    addXP(100);
    saveFSRSCard({ itemId: "x", due: 0, stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: 0 });
    recordMasteryAttempt("lv-1", 95);
    recordLearningEvent({ type: "first_correct", itemId: "y", timestamp: 0 });
    resetProgress();
    expect(getProgress().xp).toBe(0);
    expect(getFSRSCards()).toEqual([]);
    expect(checkMastery("lv-1")).toBe(false);
    expect(getLearningAnalytics().totalItemsSeen).toBe(0);
  });
});
