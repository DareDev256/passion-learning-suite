import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateDailyChallenge,
  calculateDailyBonusXP,
  isDailyChallengeComplete,
  saveDailyChallengeResult,
  getDailyChallengeResult,
  timeUntilExpiry,
  getTodayKey,
  type DailyChallengeResult,
} from "@/lib/dailyChallenge";
import { ContentItem } from "@/types/game";

// Mock storage to avoid localStorage dependency in unit tests
vi.mock("@/lib/storage", () => ({
  getProgress: () => ({
    xp: 500,
    level: 6,
    currentCategory: "basics",
    completedLevels: [],
    streak: 10,
    streakFreezes: 1,
    itemScores: {},
  }),
}));

// ─── localStorage mock (matches storage.test.ts pattern) ───
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

const ITEMS: ContentItem[] = [
  { id: "b1", prompt: "Q1", answer: "A1", category: "basics", difficulty: "easy" },
  { id: "b2", prompt: "Q2", answer: "A2", category: "basics", difficulty: "easy" },
  { id: "b3", prompt: "Q3", answer: "A3", category: "basics", difficulty: "medium" },
  { id: "b4", prompt: "Q4", answer: "A4", category: "basics", difficulty: "hard" },
  { id: "a1", prompt: "Q5", answer: "A5", category: "advanced", difficulty: "medium" },
  { id: "a2", prompt: "Q6", answer: "A6", category: "advanced", difficulty: "hard" },
  { id: "a3", prompt: "Q7", answer: "A7", category: "advanced", difficulty: "easy" },
  { id: "e1", prompt: "Q8", answer: "A8", category: "ethics", difficulty: "medium" },
  { id: "e2", prompt: "Q9", answer: "A9", category: "ethics", difficulty: "hard" },
  { id: "e3", prompt: "Q10", answer: "A10", category: "ethics", difficulty: "easy" },
];

describe("generateDailyChallenge", () => {
  it("returns a challenge with the correct date", () => {
    const challenge = generateDailyChallenge(ITEMS);
    expect(challenge.date).toBe(getTodayKey());
  });

  it("returns exactly challengeSize items (default 5)", () => {
    const challenge = generateDailyChallenge(ITEMS);
    expect(challenge.items).toHaveLength(5);
  });

  it("respects custom challengeSize", () => {
    const challenge = generateDailyChallenge(ITEMS, 3);
    expect(challenge.items).toHaveLength(3);
  });

  it("is deterministic — same date produces same items", () => {
    const a = generateDailyChallenge(ITEMS);
    const b = generateDailyChallenge(ITEMS);
    expect(a.items.map((i) => i.id)).toEqual(b.items.map((i) => i.id));
    expect(a.seed).toBe(b.seed);
    expect(a.category).toBe(b.category);
  });

  it("selects a valid focus category from the catalog", () => {
    const challenge = generateDailyChallenge(ITEMS);
    const validCategories = [...new Set(ITEMS.map((i) => i.category))];
    expect(validCategories).toContain(challenge.category);
  });

  it("includes items from the focus category", () => {
    const challenge = generateDailyChallenge(ITEMS);
    const focusItems = challenge.items.filter((i) => i.category === challenge.category);
    expect(focusItems.length).toBeGreaterThan(0);
  });

  it("sets expiresAt to a future timestamp", () => {
    const challenge = generateDailyChallenge(ITEMS);
    expect(challenge.expiresAt).toBeGreaterThan(Date.now());
  });

  it("calculates bonus multiplier from streak (streak=10 → 2.5×)", () => {
    // Mock returns streak: 10 → floor(10/5) * 0.5 = 1.0 → 1.5 + 1.0 = 2.5
    const challenge = generateDailyChallenge(ITEMS);
    expect(challenge.bonusMultiplier).toBe(2.5);
  });

  it("handles empty content catalog gracefully", () => {
    const challenge = generateDailyChallenge([]);
    expect(challenge.items).toHaveLength(0);
    expect(challenge.category).toBe("");
  });

  it("handles catalog smaller than challengeSize", () => {
    const small = ITEMS.slice(0, 2);
    const challenge = generateDailyChallenge(small, 5);
    expect(challenge.items).toHaveLength(2);
  });

  it("never duplicates items in a single challenge", () => {
    const challenge = generateDailyChallenge(ITEMS);
    const ids = challenge.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("calculateDailyBonusXP", () => {
  it("awards base XP × multiplier", () => {
    // 3 correct × 10 XP × 2.0 = 60
    expect(calculateDailyBonusXP(3, 5, 2.0)).toBe(60);
  });

  it("awards perfect bonus on 100% accuracy", () => {
    // 5 correct × 10 × 1.5 = 75, + 25 perfect = 100
    expect(calculateDailyBonusXP(5, 5, 1.5)).toBe(100);
  });

  it("no perfect bonus on imperfect accuracy", () => {
    // 4 correct × 10 × 1.5 = 60, no perfect bonus
    expect(calculateDailyBonusXP(4, 5, 1.5)).toBe(60);
  });

  it("returns 0 for zero correct answers", () => {
    expect(calculateDailyBonusXP(0, 5, 2.0)).toBe(0);
  });

  it("handles zero total (edge case)", () => {
    expect(calculateDailyBonusXP(0, 0, 1.5)).toBe(0);
  });

  it("rounds multiplied XP to nearest integer", () => {
    // 3 × 10 × 1.5 = 45 (exact)
    expect(calculateDailyBonusXP(3, 5, 1.5)).toBe(45);
    // 1 × 10 × 2.5 = 25 (exact)
    expect(calculateDailyBonusXP(1, 5, 2.5)).toBe(25);
  });
});

describe("timeUntilExpiry", () => {
  it("formats hours and minutes", () => {
    const future = Date.now() + 3 * 3_600_000 + 45 * 60_000;
    expect(timeUntilExpiry(future)).toBe("3h 45m");
  });

  it("formats minutes only when under 1 hour", () => {
    const future = Date.now() + 30 * 60_000;
    expect(timeUntilExpiry(future)).toBe("30m");
  });

  it("returns 'Expired' for past timestamps", () => {
    expect(timeUntilExpiry(Date.now() - 1000)).toBe("Expired");
  });
});

describe("daily challenge localStorage", () => {

  it("isDailyChallengeComplete returns false when no result stored", () => {
    expect(isDailyChallengeComplete()).toBe(false);
  });

  it("saves and retrieves today's result", () => {
    const result: DailyChallengeResult = {
      date: getTodayKey(),
      completed: true,
      accuracy: 80,
      bonusXP: 60,
      timeTaken: 120,
    };
    saveDailyChallengeResult(result);
    expect(isDailyChallengeComplete()).toBe(true);
    expect(getDailyChallengeResult()).toEqual(result);
  });

  it("returns null for yesterday's result", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    const result: DailyChallengeResult = {
      date: key,
      completed: true,
      accuracy: 90,
      bonusXP: 100,
      timeTaken: 90,
    };
    saveDailyChallengeResult(result);
    expect(getDailyChallengeResult()).toBeNull();
    expect(isDailyChallengeComplete()).toBe(false);
  });

  it("isDailyChallengeComplete returns false for incomplete result", () => {
    const result: DailyChallengeResult = {
      date: getTodayKey(),
      completed: false,
      accuracy: 0,
      bonusXP: 0,
      timeTaken: 0,
    };
    saveDailyChallengeResult(result);
    expect(isDailyChallengeComplete()).toBe(false);
  });
});

describe("getTodayKey", () => {
  it("returns YYYY-MM-DD format", () => {
    const key = getTodayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
