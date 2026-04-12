import { describe, it, expect } from "vitest";
import {
  buildDifficultyPulse,
  tierFillPercent,
  tierColor,
  tierTextColor,
} from "@/lib/difficultyPulse";
import type { DifficultyProfile } from "@/lib/difficulty";

// ─── Fixtures ───

function makeProfile(overrides: Partial<DifficultyProfile> = {}): DifficultyProfile {
  return {
    recommended: "easy",
    confidence: "new",
    performance: {
      easy: { accuracy: NaN, attempts: 0, streak: 0 },
      medium: { accuracy: NaN, attempts: 0, streak: 0 },
      hard: { accuracy: NaN, attempts: 0, streak: 0 },
    },
    ...overrides,
  };
}

// ─── buildDifficultyPulse ───

describe("buildDifficultyPulse", () => {
  it("returns 3 tiers in easy/medium/hard order", () => {
    const data = buildDifficultyPulse(makeProfile());
    expect(data.tiers).toHaveLength(3);
    expect(data.tiers[0].tier).toBe("easy");
    expect(data.tiers[1].tier).toBe("medium");
    expect(data.tiers[2].tier).toBe("hard");
  });

  it("marks all tiers as untested for a new player", () => {
    const data = buildDifficultyPulse(makeProfile());
    for (const tier of data.tiers) {
      expect(tier.hasData).toBe(false);
      expect(tier.status).toBe("untested");
      expect(tier.promotionReady).toBe(false);
      expect(tier.demotionRisk).toBe(false);
    }
    expect(data.totalAttempts).toBe(0);
    expect(data.confidence).toBe("new");
    expect(data.confidenceLabel).toBe("CALIBRATING");
  });

  it("marks the recommended tier correctly", () => {
    const data = buildDifficultyPulse(makeProfile({ recommended: "medium" }));
    expect(data.tiers[0].isRecommended).toBe(false);
    expect(data.tiers[1].isRecommended).toBe(true);
    expect(data.tiers[2].isRecommended).toBe(false);
    expect(data.recommended).toBe("medium");
  });

  it("classifies promoted status at 85%+ accuracy", () => {
    const data = buildDifficultyPulse(makeProfile({
      performance: {
        easy: { accuracy: 90, attempts: 10, streak: 5 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
    }));
    expect(data.tiers[0].status).toBe("promoted");
    expect(data.tiers[0].promotionReady).toBe(true);
    expect(data.tiers[0].demotionRisk).toBe(false);
  });

  it("classifies on-track status between 50-84%", () => {
    const data = buildDifficultyPulse(makeProfile({
      performance: {
        easy: { accuracy: 70, attempts: 8, streak: 2 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
    }));
    expect(data.tiers[0].status).toBe("on-track");
    expect(data.tiers[0].promotionReady).toBe(false);
    expect(data.tiers[0].demotionRisk).toBe(false);
  });

  it("classifies struggling status below 50%", () => {
    const data = buildDifficultyPulse(makeProfile({
      performance: {
        easy: { accuracy: 30, attempts: 6, streak: 0 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
    }));
    expect(data.tiers[0].status).toBe("struggling");
    expect(data.tiers[0].demotionRisk).toBe(true);
    expect(data.tiers[0].promotionReady).toBe(false);
  });

  it("handles exact boundary at 85% (promoted)", () => {
    const data = buildDifficultyPulse(makeProfile({
      performance: {
        easy: { accuracy: 85, attempts: 5, streak: 3 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
    }));
    expect(data.tiers[0].status).toBe("promoted");
    expect(data.tiers[0].promotionReady).toBe(true);
  });

  it("handles exact boundary at 50% (on-track, not struggling)", () => {
    const data = buildDifficultyPulse(makeProfile({
      performance: {
        easy: { accuracy: 50, attempts: 4, streak: 0 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
    }));
    expect(data.tiers[0].status).toBe("on-track");
    expect(data.tiers[0].demotionRisk).toBe(false);
  });

  it("handles exact boundary at 49% (struggling)", () => {
    const data = buildDifficultyPulse(makeProfile({
      performance: {
        easy: { accuracy: 49, attempts: 4, streak: 0 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
    }));
    expect(data.tiers[0].status).toBe("struggling");
    expect(data.tiers[0].demotionRisk).toBe(true);
  });

  it("computes totalAttempts across all tiers", () => {
    const data = buildDifficultyPulse(makeProfile({
      performance: {
        easy: { accuracy: 80, attempts: 10, streak: 3 },
        medium: { accuracy: 60, attempts: 5, streak: 1 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
    }));
    expect(data.totalAttempts).toBe(15);
  });

  it("maps confidence labels correctly", () => {
    expect(buildDifficultyPulse(makeProfile({ confidence: "new" })).confidenceLabel).toBe("CALIBRATING");
    expect(buildDifficultyPulse(makeProfile({ confidence: "low" })).confidenceLabel).toBe("LEARNING YOU");
    expect(buildDifficultyPulse(makeProfile({ confidence: "high" })).confidenceLabel).toBe("LOCKED IN");
  });

  it("generates aria description for new player", () => {
    const data = buildDifficultyPulse(makeProfile());
    expect(data.ariaDescription).toContain("No difficulty data yet");
  });

  it("generates aria description with tier data", () => {
    const data = buildDifficultyPulse(makeProfile({
      recommended: "medium",
      performance: {
        easy: { accuracy: 90, attempts: 10, streak: 5 },
        medium: { accuracy: 65, attempts: 6, streak: 1 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
    }));
    expect(data.ariaDescription).toContain("Recommended difficulty: MEDIUM");
    expect(data.ariaDescription).toContain("EASY: 90%");
    expect(data.ariaDescription).toContain("MEDIUM: 65%");
    expect(data.ariaDescription).not.toContain("HARD");
  });

  it("handles all tiers with data simultaneously", () => {
    const data = buildDifficultyPulse(makeProfile({
      recommended: "hard",
      confidence: "high",
      performance: {
        easy: { accuracy: 95, attempts: 20, streak: 10 },
        medium: { accuracy: 88, attempts: 15, streak: 5 },
        hard: { accuracy: 55, attempts: 8, streak: 1 },
      },
    }));
    expect(data.tiers[0].status).toBe("promoted");
    expect(data.tiers[1].status).toBe("promoted");
    expect(data.tiers[2].status).toBe("on-track");
    expect(data.totalAttempts).toBe(43);
    expect(data.tiers[2].isRecommended).toBe(true);
  });

  it("preserves NaN accuracy in tier display for untested tiers", () => {
    const data = buildDifficultyPulse(makeProfile({
      performance: {
        easy: { accuracy: 80, attempts: 5, streak: 2 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
    }));
    expect(data.tiers[0].hasData).toBe(true);
    expect(Number.isNaN(data.tiers[1].accuracy)).toBe(true);
    expect(data.tiers[1].hasData).toBe(false);
  });
});

// ─── tierFillPercent ───

describe("tierFillPercent", () => {
  it("returns 0 for NaN", () => {
    expect(tierFillPercent(NaN)).toBe(0);
  });

  it("clamps negative values to 0", () => {
    expect(tierFillPercent(-10)).toBe(0);
  });

  it("clamps values above 100 to 100", () => {
    expect(tierFillPercent(150)).toBe(100);
  });

  it("passes through valid percentages", () => {
    expect(tierFillPercent(75)).toBe(75);
    expect(tierFillPercent(0)).toBe(0);
    expect(tierFillPercent(100)).toBe(100);
  });
});

// ─── tierColor ───

describe("tierColor", () => {
  it("returns primary for promoted", () => {
    expect(tierColor("promoted")).toBe("bg-game-primary");
  });

  it("returns warning for on-track", () => {
    expect(tierColor("on-track")).toBe("bg-game-warning");
  });

  it("returns error for struggling", () => {
    expect(tierColor("struggling")).toBe("bg-game-error");
  });

  it("returns muted accent for untested", () => {
    expect(tierColor("untested")).toBe("bg-game-accent/20");
  });
});

// ─── tierTextColor ───

describe("tierTextColor", () => {
  it("returns matching text colors for all statuses", () => {
    expect(tierTextColor("promoted")).toBe("text-game-primary");
    expect(tierTextColor("on-track")).toBe("text-game-warning");
    expect(tierTextColor("struggling")).toBe("text-game-error");
    expect(tierTextColor("untested")).toBe("text-game-accent/40");
  });
});
