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
  configureStorage,
  getGameId,
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

// ─── Configurable Game ID ───
describe("configureStorage", () => {
  it("defaults to passionate_learning namespace", () => {
    expect(getGameId()).toBe("passionate_learning");
  });

  it("switches localStorage namespace when configured", () => {
    addXP(100);
    expect(getProgress().xp).toBe(100);

    configureStorage("other_game");
    expect(getProgress().xp).toBe(0); // different namespace = fresh state

    addXP(50);
    expect(getProgress().xp).toBe(50);

    // Restore default so other tests aren't affected
    configureStorage("passionate_learning");
    expect(getProgress().xp).toBe(100); // original namespace preserved
  });
});

// ─── Analytics: averageTimeToMastery + retentionRate30Day ───
describe("analytics computed metrics", () => {
  it("computes averageTimeToMastery from first_correct → concept_mastered", () => {
    recordLearningEvent({ type: "first_correct", itemId: "a", timestamp: 1000 });
    recordLearningEvent({ type: "first_correct", itemId: "b", timestamp: 2000 });
    recordLearningEvent({ type: "concept_mastered", itemId: "a", timestamp: 5000 }); // 4000ms
    recordLearningEvent({ type: "concept_mastered", itemId: "b", timestamp: 8000 }); // 6000ms
    const analytics = getLearningAnalytics();
    expect(analytics.averageTimeToMastery).toBe(5000); // (4000+6000)/2
  });

  it("computes retentionRate30Day from 30-day review events", () => {
    recordLearningEvent({ type: "review_correct", itemId: "a", timestamp: Date.now(), daysSinceLastSeen: 31 });
    recordLearningEvent({ type: "review_incorrect", itemId: "b", timestamp: Date.now(), daysSinceLastSeen: 35 });
    recordLearningEvent({ type: "review_correct", itemId: "c", timestamp: Date.now(), daysSinceLastSeen: 40 });
    const analytics = getLearningAnalytics();
    expect(analytics.retentionRate30Day).toBe(67); // 2/3 = 67%
  });
});

// ─── Security: Input Validation ───
describe("security hardening", () => {
  it("configureStorage rejects IDs with special characters", () => {
    expect(() => configureStorage("../../etc")).toThrow("Invalid game ID");
    expect(() => configureStorage("<script>alert(1)</script>")).toThrow("Invalid game ID");
    expect(() => configureStorage("a".repeat(65))).toThrow("Invalid game ID");
    expect(() => configureStorage("")).toThrow("Invalid game ID");
  });

  it("configureStorage accepts valid IDs", () => {
    configureStorage("my-game_v2");
    expect(getGameId()).toBe("my-game_v2");
    configureStorage("passionate_learning"); // restore
  });

  it("getProgress strips prototype pollution keys from localStorage", () => {
    const poisoned = JSON.stringify({
      xp: 50,
      level: 1,
      __proto__: { isAdmin: true },
      constructor: { prototype: { polluted: true } },
      currentCategory: "",
      completedLevels: [],
      streak: 0,
      streakFreezes: 0,
      itemScores: {},
    });
    localStorageMock.setItem("passionate_learning_progress", poisoned);
    const p = getProgress();
    expect(p.xp).toBe(50);
    expect((p as Record<string, unknown>)["isAdmin"]).toBeUndefined();
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("getProgress clamps negative XP and level to safe minimums", () => {
    const malicious = JSON.stringify({ xp: -999, level: -5, currentCategory: "", completedLevels: [], streak: -1, streakFreezes: -2, itemScores: {} });
    localStorageMock.setItem("passionate_learning_progress", malicious);
    const p = getProgress();
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.streak).toBe(0);
    expect(p.streakFreezes).toBe(0);
  });

  it("getProgress handles corrupted non-object localStorage gracefully", () => {
    localStorageMock.setItem("passionate_learning_progress", '"just a string"');
    expect(getProgress().xp).toBe(0);
    localStorageMock.setItem("passionate_learning_progress", "[1,2,3]");
    expect(getProgress().xp).toBe(0);
  });

  it("addXP clamps negative and extreme values", () => {
    addXP(-100); // negative amount → clamped to 0
    expect(getProgress().xp).toBe(0);
    addXP(NaN);
    expect(getProgress().xp).toBe(0);
    addXP(50, -2); // negative multiplier → clamped to 0
    expect(getProgress().xp).toBe(0);
  });

  it("recordMasteryAttempt clamps accuracy to 0-100", () => {
    recordMasteryAttempt("sec-1", 150); // over 100 → clamped to 100
    recordMasteryAttempt("sec-1", -10); // under 0 → clamped to 0
    recordMasteryAttempt("sec-1", 95);
    const stored = JSON.parse(localStorageMock.getItem("passionate_learning_mastery")!);
    expect(stored["sec-1"][0].accuracy).toBe(100);
    expect(stored["sec-1"][1].accuracy).toBe(0);
    expect(stored["sec-1"][2].accuracy).toBe(95);
  });

  it("getFSRSCards rejects malformed entries", () => {
    localStorageMock.setItem("passionate_learning_fsrs_cards", JSON.stringify([
      { itemId: "valid", due: 1000, stability: 0.5, difficulty: 0.3, reps: 1, lapses: 0, lastReview: 0 },
      { noItemId: true },           // missing itemId
      "not an object",              // wrong type
      null,                         // null
      { itemId: "bad-due", due: "tomorrow", stability: 0.5 }, // non-numeric due
    ]));
    const cards = getFSRSCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].itemId).toBe("valid");
  });
});

// ─── Edge Cases: Corruption + Integration ───
describe("corruption recovery", () => {
  it("recovers from syntactically invalid JSON in localStorage", () => {
    localStorageMock.setItem("passionate_learning_progress", "{not json at all!!!");
    const p = getProgress();
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
  });

  it("recovers from null stored progress", () => {
    localStorageMock.setItem("passionate_learning_progress", "null");
    expect(getProgress().xp).toBe(0);
  });
});

describe("addXP edge cases", () => {
  it("clamps Infinity multiplier to fallback of 1", () => {
    addXP(50, Infinity);
    expect(getProgress().xp).toBe(50); // Infinity not finite → safeNumber fallback 1
  });

  it("handles zero amount gracefully", () => {
    addXP(0);
    expect(getProgress().xp).toBe(0);
  });
});

describe("recordLearningEvent edge cases", () => {
  it("silently drops events with invalid type", () => {
    recordLearningEvent({ type: "hacked_event" as never, itemId: "x", timestamp: Date.now() });
    const analytics = getLearningAnalytics();
    expect(analytics.totalItemsSeen).toBe(0);
  });
});

describe("level + XP integration", () => {
  it("completing levels then adding XP preserves both independently", () => {
    completeLevel("cat-a", 1);
    addXP(250);
    completeLevel("cat-a", 2);
    const p = getProgress();
    expect(p.completedLevels).toContain("cat-a-1");
    expect(p.completedLevels).toContain("cat-a-2");
    expect(p.xp).toBe(250);
    expect(p.level).toBe(3);
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
