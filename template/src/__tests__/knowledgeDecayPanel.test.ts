import { describe, it, expect } from "vitest";
import {
  retrievability,
  predictDecay,
  DECAY_HORIZONS,
  type DecayHorizon,
} from "@/lib/knowledgeDecay";
import type { FSRSCard } from "@/lib/storage";
import type { ContentItem } from "@/types/game";

// ─── KnowledgeDecayPanel integration tests ───
// Tests the data pipeline that drives the panel: forecast generation,
// health scoring, category risk aggregation, and horizon switching.

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function makeCard(overrides: Partial<FSRSCard> & { itemId: string }): FSRSCard {
  return {
    due: NOW,
    stability: 5,
    difficulty: 0.5,
    reps: 3,
    lapses: 0,
    lastReview: NOW - 2 * DAY,
    ...overrides,
  };
}

const ITEMS: Pick<ContentItem, "id" | "category">[] = [
  { id: "p1", category: "prompts" },
  { id: "p2", category: "prompts" },
  { id: "p3", category: "prompts" },
  { id: "t1", category: "tokens" },
  { id: "t2", category: "tokens" },
  { id: "h1", category: "hallucinations" },
];

// ─── Panel data pipeline: empty state ───

describe("KnowledgeDecayPanel data — empty state", () => {
  it("returns 100 health when no reviewed cards exist", () => {
    const forecast = predictDecay([], ITEMS, 7, NOW);
    expect(forecast.healthScore).toBe(100);
    expect(forecast.totalAtRisk).toBe(0);
    expect(forecast.atRiskItems).toHaveLength(0);
    expect(forecast.categoryRisks).toHaveLength(0);
  });

  it("ignores unreviewed cards (reps === 0)", () => {
    const cards = [makeCard({ itemId: "p1", reps: 0 })];
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    expect(forecast.totalAtRisk).toBe(0);
    expect(forecast.healthScore).toBe(100);
  });
});

// ─── Panel data pipeline: health scoring ───

describe("KnowledgeDecayPanel data — health score", () => {
  it("healthy cards yield high health score", () => {
    const cards = ITEMS.map((i) =>
      makeCard({ itemId: i.id, stability: 90, lastReview: NOW - DAY }),
    );
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    expect(forecast.healthScore).toBeGreaterThanOrEqual(80);
  });

  it("decayed cards yield low health score", () => {
    const cards = ITEMS.map((i) =>
      makeCard({ itemId: i.id, stability: 1, lastReview: NOW - 30 * DAY }),
    );
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    expect(forecast.healthScore).toBeLessThan(30);
  });

  it("health score is bounded 0-100", () => {
    for (const horizon of DECAY_HORIZONS) {
      const cards = [makeCard({ itemId: "p1", stability: 0.1, lastReview: NOW - 60 * DAY })];
      const forecast = predictDecay(cards, ITEMS, horizon, NOW);
      expect(forecast.healthScore).toBeGreaterThanOrEqual(0);
      expect(forecast.healthScore).toBeLessThanOrEqual(100);
    }
  });
});

// ─── Panel data pipeline: horizon switching ───

describe("KnowledgeDecayPanel data — horizon switching", () => {
  it("longer horizons surface more at-risk items", () => {
    const cards = ITEMS.map((i) =>
      makeCard({ itemId: i.id, stability: 8, lastReview: NOW - 3 * DAY }),
    );
    const f1 = predictDecay(cards, ITEMS, 1, NOW);
    const f30 = predictDecay(cards, ITEMS, 30, NOW);
    expect(f30.totalAtRisk).toBeGreaterThanOrEqual(f1.totalAtRisk);
  });

  it("all standard horizons produce valid forecasts", () => {
    const cards = [makeCard({ itemId: "p1" })];
    for (const h of DECAY_HORIZONS) {
      const f = predictDecay(cards, ITEMS, h, NOW);
      expect(f.horizon).toBe(h);
      expect(typeof f.healthScore).toBe("number");
      expect(f.atRiskItems.every((i) => typeof i.currentRetention === "number")).toBe(true);
    }
  });
});

// ─── Panel data pipeline: category risk aggregation ───

describe("KnowledgeDecayPanel data — category risks", () => {
  it("groups at-risk items by category", () => {
    // All prompts items decayed, tokens stable
    const cards = [
      makeCard({ itemId: "p1", stability: 1, lastReview: NOW - 10 * DAY }),
      makeCard({ itemId: "p2", stability: 1, lastReview: NOW - 10 * DAY }),
      makeCard({ itemId: "p3", stability: 1, lastReview: NOW - 10 * DAY }),
      makeCard({ itemId: "t1", stability: 200, lastReview: NOW - DAY }),
      makeCard({ itemId: "t2", stability: 200, lastReview: NOW - DAY }),
    ];
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    const promptRisk = forecast.categoryRisks.find((c) => c.categoryId === "prompts");
    expect(promptRisk).toBeDefined();
    expect(promptRisk!.atRiskCount).toBe(3);
    // tokens should not appear as at-risk
    const tokenRisk = forecast.categoryRisks.find((c) => c.categoryId === "tokens");
    expect(tokenRisk).toBeUndefined();
  });

  it("assigns critical urgency to categories with 5+ at-risk items", () => {
    const manyItems = Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, category: "mass" }));
    const cards = manyItems.map((item) =>
      makeCard({ itemId: item.id, stability: 0.5, lastReview: NOW - 20 * DAY }),
    );
    const forecast = predictDecay(cards, [...ITEMS, ...manyItems], 7, NOW);
    const massRisk = forecast.categoryRisks.find((c) => c.categoryId === "mass");
    expect(massRisk?.urgency).toBe("critical");
  });

  it("assigns warning urgency to categories with 2-4 at-risk items", () => {
    const cards = [
      makeCard({ itemId: "p1", stability: 1, lastReview: NOW - 10 * DAY }),
      makeCard({ itemId: "p2", stability: 1, lastReview: NOW - 10 * DAY }),
    ];
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    const promptRisk = forecast.categoryRisks.find((c) => c.categoryId === "prompts");
    expect(promptRisk?.urgency).toBe("warning");
  });
});

// ─── Panel data pipeline: at-risk items sorted by urgency ───

describe("KnowledgeDecayPanel data — at-risk item ordering", () => {
  it("sorts at-risk items by daysUntilThreshold ascending (most urgent first)", () => {
    const cards = [
      makeCard({ itemId: "p1", stability: 2, lastReview: NOW - 5 * DAY }),  // very decayed
      makeCard({ itemId: "t1", stability: 10, lastReview: NOW - 8 * DAY }), // moderately decayed
      makeCard({ itemId: "h1", stability: 6, lastReview: NOW - 3 * DAY }),  // less decayed
    ];
    const forecast = predictDecay(cards, ITEMS, 30, NOW);
    const thresholds = forecast.atRiskItems.map((i) => i.daysUntilThreshold);
    for (let i = 1; i < thresholds.length; i++) {
      expect(thresholds[i]).toBeGreaterThanOrEqual(thresholds[i - 1]);
    }
  });

  it("includes retention percentages as integers 0-100", () => {
    const cards = [makeCard({ itemId: "p1", stability: 3, lastReview: NOW - 4 * DAY })];
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    for (const item of forecast.atRiskItems) {
      expect(item.currentRetention).toBeGreaterThanOrEqual(0);
      expect(item.currentRetention).toBeLessThanOrEqual(100);
      expect(Number.isInteger(item.currentRetention)).toBe(true);
    }
  });
});
