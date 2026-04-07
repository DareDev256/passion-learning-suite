import { describe, it, expect } from "vitest";
import {
  retrievability,
  daysUntilDecay,
  predictDecay,
  fullDecayForecast,
  DECAY_HORIZONS,
} from "@/lib/knowledgeDecay";
import type { FSRSCard } from "@/lib/storage";
import type { ContentItem } from "@/types/game";

const NOW = 1_700_000_000_000; // fixed timestamp for deterministic tests
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
  { id: "a1", category: "basics" },
  { id: "a2", category: "basics" },
  { id: "b1", category: "advanced" },
  { id: "b2", category: "advanced" },
  { id: "c1", category: "expert" },
];

// ─── retrievability ───

describe("retrievability", () => {
  it("returns 1 at day 0", () => {
    expect(retrievability(0, 5)).toBe(1);
  });

  it("returns 1 for negative elapsed days", () => {
    expect(retrievability(-3, 5)).toBe(1);
  });

  it("decays over time", () => {
    const r1 = retrievability(1, 5);
    const r7 = retrievability(7, 5);
    expect(r1).toBeGreaterThan(r7);
    expect(r7).toBeGreaterThan(0);
    expect(r1).toBeLessThan(1);
  });

  it("returns 0 for zero stability", () => {
    expect(retrievability(5, 0)).toBe(0);
  });

  it("returns 0 for negative stability", () => {
    expect(retrievability(5, -2)).toBe(0);
  });

  it("returns 0 for NaN stability", () => {
    expect(retrievability(5, NaN)).toBe(0);
  });

  it("higher stability = slower decay", () => {
    expect(retrievability(7, 10)).toBeGreaterThan(retrievability(7, 2));
  });
});

// ─── daysUntilDecay ───

describe("daysUntilDecay", () => {
  it("returns positive days for valid stability", () => {
    const days = daysUntilDecay(5, 0.9);
    expect(days).toBeGreaterThan(0);
    // Verify: at that many days, retention should be ~0.9
    const r = retrievability(days, 5);
    expect(r).toBeCloseTo(0.9, 4);
  });

  it("returns 0 for zero stability", () => {
    expect(daysUntilDecay(0, 0.9)).toBe(0);
  });

  it("returns 0 for target >= 1", () => {
    expect(daysUntilDecay(5, 1)).toBe(0);
  });

  it("returns 0 for target <= 0", () => {
    expect(daysUntilDecay(5, 0)).toBe(0);
  });

  it("higher stability = more days until decay", () => {
    expect(daysUntilDecay(10, 0.9)).toBeGreaterThan(daysUntilDecay(2, 0.9));
  });
});

// ─── predictDecay ───

describe("predictDecay", () => {
  it("identifies items decaying within horizon", () => {
    const cards: FSRSCard[] = [
      makeCard({ itemId: "a1", stability: 2, lastReview: NOW - 1 * DAY }),
      makeCard({ itemId: "b1", stability: 100, lastReview: NOW - 1 * DAY }),
    ];
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    // Low stability card should be at risk; high stability card should be safe
    expect(forecast.atRiskItems.some((d) => d.itemId === "a1")).toBe(true);
    expect(forecast.atRiskItems.some((d) => d.itemId === "b1")).toBe(false);
  });

  it("skips cards with zero reps (never reviewed)", () => {
    const cards: FSRSCard[] = [
      makeCard({ itemId: "a1", reps: 0, stability: 1, lastReview: NOW - 5 * DAY }),
    ];
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    expect(forecast.totalAtRisk).toBe(0);
  });

  it("sorts at-risk items by urgency (lowest daysUntilThreshold first)", () => {
    const cards: FSRSCard[] = [
      makeCard({ itemId: "a1", stability: 5, lastReview: NOW - 3 * DAY }),
      makeCard({ itemId: "a2", stability: 2, lastReview: NOW - 3 * DAY }),
    ];
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    if (forecast.atRiskItems.length >= 2) {
      expect(forecast.atRiskItems[0].daysUntilThreshold)
        .toBeLessThanOrEqual(forecast.atRiskItems[1].daysUntilThreshold);
    }
  });

  it("computes category risk aggregates", () => {
    const cards: FSRSCard[] = [
      makeCard({ itemId: "a1", stability: 1, lastReview: NOW - 5 * DAY }),
      makeCard({ itemId: "a2", stability: 1, lastReview: NOW - 5 * DAY }),
      makeCard({ itemId: "b1", stability: 1, lastReview: NOW - 5 * DAY }),
    ];
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    const basics = forecast.categoryRisks.find((r) => r.categoryId === "basics");
    expect(basics).toBeDefined();
    expect(basics!.atRiskCount).toBe(2);
    expect(basics!.urgency).toBe("warning");
  });

  it("returns critical urgency for 5+ at-risk items in a category", () => {
    const cards: FSRSCard[] = Array.from({ length: 6 }, (_, i) =>
      makeCard({ itemId: `x${i}`, stability: 1, lastReview: NOW - 5 * DAY }),
    );
    const items = cards.map((c) => ({ id: c.itemId, category: "bigcat" }));
    const forecast = predictDecay(cards, items, 7, NOW);
    const cat = forecast.categoryRisks.find((r) => r.categoryId === "bigcat");
    expect(cat?.urgency).toBe("critical");
  });

  it("health score is 100 when no items are at risk", () => {
    const cards: FSRSCard[] = [
      makeCard({ itemId: "b1", stability: 100, lastReview: NOW }),
    ];
    const forecast = predictDecay(cards, ITEMS, 1, NOW);
    expect(forecast.healthScore).toBe(100);
  });

  it("health score decreases as more items decay", () => {
    const cards: FSRSCard[] = [
      makeCard({ itemId: "a1", stability: 0.5, lastReview: NOW - 10 * DAY }),
      makeCard({ itemId: "b1", stability: 100, lastReview: NOW }),
    ];
    const forecast = predictDecay(cards, ITEMS, 1, NOW);
    expect(forecast.healthScore).toBeLessThan(100);
    expect(forecast.healthScore).toBeGreaterThan(0);
  });

  it("assigns 'unknown' category for items not in catalog", () => {
    const cards: FSRSCard[] = [
      makeCard({ itemId: "orphan", stability: 1, lastReview: NOW - 5 * DAY }),
    ];
    const forecast = predictDecay(cards, ITEMS, 7, NOW);
    const orphan = forecast.atRiskItems.find((d) => d.itemId === "orphan");
    expect(orphan?.category).toBe("unknown");
  });
});

// ─── fullDecayForecast ───

describe("fullDecayForecast", () => {
  it("returns one forecast per horizon", () => {
    const cards: FSRSCard[] = [makeCard({ itemId: "a1" })];
    const forecasts = fullDecayForecast(cards, ITEMS, NOW);
    expect(forecasts).toHaveLength(DECAY_HORIZONS.length);
    expect(forecasts.map((f) => f.horizon)).toEqual([...DECAY_HORIZONS]);
  });

  it("longer horizons have equal or more at-risk items", () => {
    const cards: FSRSCard[] = [
      makeCard({ itemId: "a1", stability: 3, lastReview: NOW - 1 * DAY }),
      makeCard({ itemId: "a2", stability: 8, lastReview: NOW - 1 * DAY }),
      makeCard({ itemId: "b1", stability: 15, lastReview: NOW - 1 * DAY }),
    ];
    const forecasts = fullDecayForecast(cards, ITEMS, NOW);
    for (let i = 1; i < forecasts.length; i++) {
      expect(forecasts[i].totalAtRisk).toBeGreaterThanOrEqual(forecasts[i - 1].totalAtRisk);
    }
  });

  it("returns empty forecasts for empty card list", () => {
    const forecasts = fullDecayForecast([], ITEMS, NOW);
    for (const f of forecasts) {
      expect(f.totalAtRisk).toBe(0);
      expect(f.healthScore).toBe(100);
    }
  });
});
