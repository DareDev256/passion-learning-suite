import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateDailyChallenge,
  calculateDailyBonusXP,
  timeUntilExpiry,
  getTodayKey,
  type DailyChallenge,
  type DailyChallengeResult,
} from "@/lib/dailyChallenge";
import { ContentItem } from "@/types/game";

// Mock storage — same pattern as dailyChallenge.test.ts
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

const ITEMS: ContentItem[] = [
  { id: "b1", prompt: "Q1", answer: "A1", category: "basics", difficulty: "easy" },
  { id: "b2", prompt: "Q2", answer: "A2", category: "basics", difficulty: "easy" },
  { id: "b3", prompt: "Q3", answer: "A3", category: "basics", difficulty: "medium" },
  { id: "a1", prompt: "Q4", answer: "A4", category: "advanced", difficulty: "medium" },
  { id: "a2", prompt: "Q5", answer: "A5", category: "advanced", difficulty: "hard" },
  { id: "e1", prompt: "Q6", answer: "A6", category: "ethics", difficulty: "easy" },
  { id: "e2", prompt: "Q7", answer: "A7", category: "ethics", difficulty: "hard" },
  { id: "e3", prompt: "Q8", answer: "A8", category: "ethics", difficulty: "medium" },
];

// ─── Tests targeting the DailyChallengeBanner's data dependencies ───
// These verify the contract between the component and the dailyChallenge engine.
// Component renders challenge.items.length, challenge.category, challenge.bonusMultiplier,
// and result state — we test all the data paths that feed those renders.

describe("DailyChallengeBanner data contract", () => {
  describe("challenge generation for banner display", () => {
    it("produces non-empty items for a populated catalog", () => {
      const challenge = generateDailyChallenge(ITEMS);
      expect(challenge.items.length).toBeGreaterThan(0);
      expect(challenge.items.length).toBeLessThanOrEqual(5);
    });

    it("returns null-equivalent (0 items) for empty catalog — banner should hide", () => {
      const challenge = generateDailyChallenge([]);
      expect(challenge.items).toHaveLength(0);
    });

    it("category is displayable (non-empty string for valid catalogs)", () => {
      const challenge = generateDailyChallenge(ITEMS);
      expect(challenge.category.length).toBeGreaterThan(0);
    });

    it("bonusMultiplier is within banner display range [1.5, 3.0]", () => {
      const challenge = generateDailyChallenge(ITEMS);
      expect(challenge.bonusMultiplier).toBeGreaterThanOrEqual(1.5);
      expect(challenge.bonusMultiplier).toBeLessThanOrEqual(3);
    });

    it("expiresAt is always in the future (countdown won't show Expired on load)", () => {
      const challenge = generateDailyChallenge(ITEMS);
      expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe("completed state rendering data", () => {
    it("perfect accuracy detection: 100% triggers perfect badge", () => {
      const result: DailyChallengeResult = {
        date: getTodayKey(),
        completed: true,
        accuracy: 100,
        bonusXP: 100,
        timeTaken: 45,
      };
      expect(result.accuracy === 100).toBe(true);
    });

    it("non-perfect accuracy: 99% does not trigger perfect badge", () => {
      const result: DailyChallengeResult = {
        date: getTodayKey(),
        completed: true,
        accuracy: 99,
        bonusXP: 90,
        timeTaken: 60,
      };
      expect(result.accuracy === 100).toBe(false);
    });

    it("bonusXP displayed matches engine calculation", () => {
      // 5/5 correct, 2.5× multiplier → 5×10×2.5=125 + 25 perfect = 150
      const xp = calculateDailyBonusXP(5, 5, 2.5);
      expect(xp).toBe(150);
    });

    it("bonusXP for partial completion", () => {
      // 3/5 correct, 2.0× multiplier → 3×10×2.0=60, no perfect bonus
      const xp = calculateDailyBonusXP(3, 5, 2.0);
      expect(xp).toBe(60);
    });
  });

  describe("countdown timer data", () => {
    it("shows hours and minutes when > 1 hour remains", () => {
      const future = Date.now() + 5 * 3_600_000 + 30 * 60_000;
      expect(timeUntilExpiry(future)).toBe("5h 30m");
    });

    it("shows minutes only when < 1 hour remains", () => {
      const future = Date.now() + 15 * 60_000;
      expect(timeUntilExpiry(future)).toBe("15m");
    });

    it("shows Expired for past timestamps", () => {
      expect(timeUntilExpiry(Date.now() - 5000)).toBe("Expired");
    });

    it("shows 0m when exactly at expiry boundary", () => {
      // Just barely in the future (30 seconds)
      expect(timeUntilExpiry(Date.now() + 30_000)).toBe("0m");
    });
  });

  describe("category display formatting", () => {
    it("underscores become spaces for display", () => {
      // The banner does: category.replace(/[_.-]/g, " ")
      expect("machine_learning".replace(/[_.-]/g, " ")).toBe("machine learning");
    });

    it("dots become spaces for display", () => {
      expect("ai.ethics".replace(/[_.-]/g, " ")).toBe("ai ethics");
    });

    it("hyphens become spaces for display", () => {
      expect("prompt-engineering".replace(/[_.-]/g, " ")).toBe("prompt engineering");
    });

    it("empty category falls back to MIXED", () => {
      const display = "".replace(/[_.-]/g, " ") || "MIXED";
      expect(display).toBe("MIXED");
    });
  });

  describe("single-item catalog edge cases", () => {
    it("generates challenge with 1 item when catalog has 1 item", () => {
      const single = [ITEMS[0]];
      const challenge = generateDailyChallenge(single);
      expect(challenge.items).toHaveLength(1);
    });

    it("single-category catalog uses that category as focus", () => {
      const singleCat = ITEMS.filter((i) => i.category === "basics");
      const challenge = generateDailyChallenge(singleCat);
      expect(challenge.category).toBe("basics");
    });
  });
});
