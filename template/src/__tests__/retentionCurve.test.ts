import { describe, it, expect } from "vitest";
import {
  ebbinghaus,
  findNearestBucket,
  bucketByInterval,
  computeRetentionCurve,
  retentionToSVG,
  pointsToPath,
  RETENTION_DAYS,
} from "@/lib/retentionCurve";
import { LearningEvent } from "@/lib/storage";

// ─── Ebbinghaus forgetting curve ───

describe("ebbinghaus", () => {
  it("returns 100 at day 0", () => {
    expect(ebbinghaus(0)).toBe(100);
  });

  it("returns 100 for negative days", () => {
    expect(ebbinghaus(-5)).toBe(100);
  });

  it("decays over time with default stability", () => {
    const day1 = ebbinghaus(1);
    const day7 = ebbinghaus(7);
    const day30 = ebbinghaus(30);
    expect(day1).toBeGreaterThan(day7);
    expect(day7).toBeGreaterThan(day30);
    expect(day30).toBeGreaterThanOrEqual(0);
  });

  it("returns 0 for NaN input", () => {
    expect(ebbinghaus(NaN)).toBe(0);
  });

  it("returns 0 for zero stability", () => {
    expect(ebbinghaus(5, 0)).toBe(0);
  });

  it("returns 0 for negative stability", () => {
    expect(ebbinghaus(5, -1)).toBe(0);
  });

  it("higher stability = slower decay", () => {
    const low = ebbinghaus(7, 2);
    const high = ebbinghaus(7, 10);
    expect(high).toBeGreaterThan(low);
  });

  it("returns integer percentages", () => {
    for (const d of [1, 3, 7, 14, 30]) {
      const r = ebbinghaus(d);
      expect(r).toBe(Math.round(r));
    }
  });
});

// ─── Bucket matching ───

describe("findNearestBucket", () => {
  it("matches exact RETENTION_DAYS values", () => {
    for (const d of RETENTION_DAYS) {
      expect(findNearestBucket(d)).toBe(d);
    }
  });

  it("returns null for values far from any bucket", () => {
    expect(findNearestBucket(50)).toBeNull(); // beyond 30's threshold (30 ± 12)
  });

  it("returns null for negative days", () => {
    expect(findNearestBucket(-1)).toBeNull();
  });

  it("returns null for NaN", () => {
    expect(findNearestBucket(NaN)).toBeNull();
  });

  it("maps day 0.4 → bucket 0", () => {
    expect(findNearestBucket(0.4)).toBe(0);
  });

  it("maps day 6 → bucket 7 (within 40% threshold)", () => {
    expect(findNearestBucket(6)).toBe(7);
  });

  it("maps day 28 → bucket 30", () => {
    expect(findNearestBucket(28)).toBe(30);
  });

  it("maps day 2 → bucket 3 (within 1.5 threshold)", () => {
    expect(findNearestBucket(2)).toBe(3);
  });
});

// ─── Bucket aggregation ───

describe("bucketByInterval", () => {
  const makeEvent = (type: LearningEvent["type"], days: number): LearningEvent => ({
    type,
    itemId: "test-item",
    timestamp: Date.now(),
    daysSinceLastSeen: days,
  });

  it("returns empty buckets for no events", () => {
    const buckets = bucketByInterval([]);
    expect(buckets.size).toBe(RETENTION_DAYS.length);
    for (const [, b] of buckets) {
      expect(b.total).toBe(0);
    }
  });

  it("counts first_correct as day-0 bucket", () => {
    const events: LearningEvent[] = [
      { type: "first_correct", itemId: "a", timestamp: 1000 },
      { type: "first_correct", itemId: "b", timestamp: 2000 },
    ];
    const buckets = bucketByInterval(events);
    expect(buckets.get(0)).toEqual({ correct: 2, total: 2 });
  });

  it("buckets review_correct at day 7", () => {
    const events = [makeEvent("review_correct", 7)];
    const buckets = bucketByInterval(events);
    expect(buckets.get(7)!.correct).toBe(1);
    expect(buckets.get(7)!.total).toBe(1);
  });

  it("buckets review_incorrect at day 7", () => {
    const events = [makeEvent("review_incorrect", 7)];
    const buckets = bucketByInterval(events);
    expect(buckets.get(7)!.correct).toBe(0);
    expect(buckets.get(7)!.total).toBe(1);
  });

  it("ignores non-review event types", () => {
    const events = [makeEvent("concept_mastered", 7)];
    const buckets = bucketByInterval(events);
    expect(buckets.get(7)!.total).toBe(0);
  });
});

// ─── Full curve computation ───

describe("computeRetentionCurve", () => {
  it("returns zero retention with no events", () => {
    const curve = computeRetentionCurve([]);
    expect(curve.overallRetention).toBe(0);
    expect(curve.totalReviews).toBe(0);
    expect(curve.points.length).toBe(RETENTION_DAYS.length);
    for (const p of curve.points) {
      expect(p.actual).toBeNull();
      expect(p.theoretical).toBeGreaterThanOrEqual(0);
    }
  });

  it("computes actual retention from mixed events", () => {
    const events: LearningEvent[] = [
      { type: "first_correct", itemId: "a", timestamp: 1000 },
      { type: "review_correct", itemId: "a", timestamp: 2000, daysSinceLastSeen: 7 },
      { type: "review_incorrect", itemId: "b", timestamp: 3000, daysSinceLastSeen: 7 },
      { type: "review_correct", itemId: "c", timestamp: 4000, daysSinceLastSeen: 30 },
    ];
    const curve = computeRetentionCurve(events);
    // Day 0: 1 first_correct → 100%
    expect(curve.points.find((p) => p.day === 0)!.actual).toBe(100);
    // Day 7: 1 correct + 1 incorrect → 50%
    expect(curve.points.find((p) => p.day === 7)!.actual).toBe(50);
    // Day 30: 1 correct → 100%
    expect(curve.points.find((p) => p.day === 30)!.actual).toBe(100);
    expect(curve.totalReviews).toBe(4);
  });

  it("theoretical always decreases over time", () => {
    const curve = computeRetentionCurve([]);
    for (let i = 1; i < curve.points.length; i++) {
      expect(curve.points[i].theoretical).toBeLessThanOrEqual(curve.points[i - 1].theoretical);
    }
  });
});

// ─── SVG coordinate mapping ───

describe("retentionToSVG", () => {
  it("maps day=0, retention=100 to top-left of plot area", () => {
    const { x, y } = retentionToSVG(0, 100, 320, 200, 36);
    expect(x).toBe(36);  // left padding
    expect(y).toBe(36);  // top padding
  });

  it("maps day=30, retention=0 to bottom-right of plot area", () => {
    const { x, y } = retentionToSVG(30, 0, 320, 200, 36);
    expect(x).toBe(320 - 36);  // right edge
    expect(y).toBe(200 - 36);  // bottom edge
  });

  it("maps 50% retention to vertical center", () => {
    const { y } = retentionToSVG(0, 50, 320, 200, 36);
    const plotH = 200 - 36 * 2;
    expect(y).toBeCloseTo(36 + plotH / 2, 5);
  });
});

// ─── SVG path generation ───

describe("pointsToPath", () => {
  it("returns empty string for no points", () => {
    expect(pointsToPath([])).toBe("");
  });

  it("returns M command for single point", () => {
    expect(pointsToPath([{ x: 10, y: 20 }])).toBe("M10,20");
  });

  it("generates cubic bezier segments for multiple points", () => {
    const path = pointsToPath([{ x: 0, y: 100 }, { x: 50, y: 80 }, { x: 100, y: 20 }]);
    expect(path).toContain("M");
    expect(path).toContain("C");
    // Should have 2 C commands (one per segment after first point)
    expect((path.match(/C/g) || []).length).toBe(2);
  });
});
