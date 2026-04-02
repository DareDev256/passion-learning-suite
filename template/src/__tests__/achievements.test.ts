import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ACHIEVEMENTS,
  checkAchievements,
  getUnlocked,
  getTrophyCase,
} from "@/lib/achievements";
import type { UserProgress } from "@/types/game";

// ─── localStorage mock ───
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
};
// Mock getLearningAnalytics to control return values
vi.mock("@/lib/storage", () => ({
  getLearningAnalytics: vi.fn(() => ({
    totalItemsSeen: 0,
    itemsMastered: 0,
    averageTimeToMastery: 0,
    retentionRate7Day: 0,
    retentionRate30Day: 0,
  })),
}));

import { getLearningAnalytics } from "@/lib/storage";
const mockAnalytics = vi.mocked(getLearningAnalytics);

const baseProgress: UserProgress = {
  xp: 0, level: 1, currentCategory: "", completedLevels: [],
  streak: 0, streakFreezes: 0, itemScores: {},
};

beforeEach(() => {
  localStorageMock.clear();
  // Stub window + localStorage like storage.test.ts does for SSR guards
  Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true, configurable: true });
  // Fix time to 10:00 AM to avoid night_owl/early_bird triggering unpredictably
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 3, 2, 10, 0, 0));
  mockAnalytics.mockReturnValue({
    totalItemsSeen: 0, itemsMastered: 0, averageTimeToMastery: 0,
    retentionRate7Day: 0, retentionRate30Day: 0,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("achievements definitions", () => {
  it("has unique IDs", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every achievement has required fields", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(["bronze", "silver", "gold"]).toContain(a.tier);
    }
  });
});

describe("checkAchievements", () => {
  it("returns empty when no conditions met", () => {
    const result = checkAchievements(baseProgress);
    expect(result).toEqual([]);
  });

  it("unlocks first_step on first level completion", () => {
    const progress = { ...baseProgress, completedLevels: ["basics-1"] };
    const result = checkAchievements(progress);
    expect(result.map((a) => a.id)).toContain("first_step");
  });

  it("unlocks streak achievements at thresholds", () => {
    const p3 = { ...baseProgress, streak: 3, completedLevels: ["a-1"] };
    const r3 = checkAchievements(p3);
    expect(r3.map((a) => a.id)).toContain("streak_3");

    const p7 = { ...baseProgress, streak: 7, completedLevels: ["a-1"] };
    const r7 = checkAchievements(p7);
    expect(r7.map((a) => a.id)).toContain("streak_7");
  });

  it("unlocks centurion at 1000 XP", () => {
    const progress = { ...baseProgress, xp: 1000 };
    const result = checkAchievements(progress);
    expect(result.map((a) => a.id)).toContain("centurion");
  });

  it("unlocks perfect on 100% accuracy", () => {
    const result = checkAchievements(baseProgress, 100);
    expect(result.map((a) => a.id)).toContain("perfect");
  });

  it("does NOT unlock perfect on 99% accuracy", () => {
    const result = checkAchievements(baseProgress, 99);
    expect(result.map((a) => a.id)).not.toContain("perfect");
  });

  it("unlocks ten_mastered from analytics", () => {
    mockAnalytics.mockReturnValue({
      totalItemsSeen: 20, itemsMastered: 10, averageTimeToMastery: 5000,
      retentionRate7Day: 80, retentionRate30Day: 50,
    });
    const result = checkAchievements(baseProgress);
    expect(result.map((a) => a.id)).toContain("ten_mastered");
  });

  it("unlocks recall_ace with 90%+ retention and enough data", () => {
    mockAnalytics.mockReturnValue({
      totalItemsSeen: 10, itemsMastered: 5, averageTimeToMastery: 3000,
      retentionRate7Day: 92, retentionRate30Day: 60,
    });
    const result = checkAchievements(baseProgress);
    expect(result.map((a) => a.id)).toContain("recall_ace");
  });

  it("does NOT double-unlock achievements", () => {
    const progress = { ...baseProgress, completedLevels: ["a-1"] };
    const first = checkAchievements(progress);
    expect(first.map((a) => a.id)).toContain("first_step");
    const second = checkAchievements(progress);
    expect(second.map((a) => a.id)).not.toContain("first_step");
  });

  it("unlocks xp_titan at 10000 XP", () => {
    const progress = { ...baseProgress, xp: 10000 };
    const result = checkAchievements(progress);
    expect(result.map((a) => a.id)).toContain("xp_titan");
  });

  it("unlocks night_owl when playing after midnight", () => {
    vi.setSystemTime(new Date(2026, 3, 2, 2, 0, 0)); // 2 AM
    const result = checkAchievements(baseProgress);
    expect(result.map((a) => a.id)).toContain("night_owl");
  });

  it("unlocks early_bird when playing before 7 AM", () => {
    vi.setSystemTime(new Date(2026, 3, 2, 6, 0, 0)); // 6 AM
    const result = checkAchievements(baseProgress);
    expect(result.map((a) => a.id)).toContain("early_bird");
  });

  it("does NOT unlock time achievements during normal hours", () => {
    vi.setSystemTime(new Date(2026, 3, 2, 14, 0, 0)); // 2 PM
    const result = checkAchievements(baseProgress);
    const ids = result.map((a) => a.id);
    expect(ids).not.toContain("night_owl");
    expect(ids).not.toContain("early_bird");
  });
});

describe("getUnlocked", () => {
  it("returns empty array on fresh state", () => {
    expect(getUnlocked()).toEqual([]);
  });

  it("returns unlocked achievements after check", () => {
    const progress = { ...baseProgress, completedLevels: ["a-1"], streak: 3 };
    checkAchievements(progress);
    const unlocked = getUnlocked();
    expect(unlocked.length).toBeGreaterThanOrEqual(2);
    expect(unlocked.every((u) => typeof u.unlockedAt === "number")).toBe(true);
  });

  it("handles malformed localStorage gracefully", () => {
    localStorageMock.setItem("pl_achievements", "not json[]");
    expect(getUnlocked()).toEqual([]);
  });

  it("filters invalid entries", () => {
    localStorageMock.setItem("pl_achievements", JSON.stringify([
      { id: "first_step", unlockedAt: 123 },
      { id: null, unlockedAt: "bad" },
      "garbage",
    ]));
    expect(getUnlocked()).toHaveLength(1);
  });
});

describe("getTrophyCase", () => {
  it("returns all achievements with unlock status", () => {
    const trophies = getTrophyCase();
    expect(trophies).toHaveLength(ACHIEVEMENTS.length);
    expect(trophies.every((t) => typeof t.unlocked === "boolean")).toBe(true);
  });

  it("marks unlocked achievements correctly", () => {
    checkAchievements({ ...baseProgress, completedLevels: ["a-1"] });
    const trophies = getTrophyCase();
    const firstStep = trophies.find((t) => t.id === "first_step");
    expect(firstStep?.unlocked).toBe(true);
    expect(firstStep?.unlockedAt).toBeTypeOf("number");
  });

  it("sorts by tier: bronze < silver < gold", () => {
    const trophies = getTrophyCase();
    const tiers = trophies.map((t) => t.tier);
    const tierOrder = { bronze: 0, silver: 1, gold: 2 };
    for (let i = 1; i < tiers.length; i++) {
      expect(tierOrder[tiers[i]]).toBeGreaterThanOrEqual(tierOrder[tiers[i - 1]]);
    }
  });
});
