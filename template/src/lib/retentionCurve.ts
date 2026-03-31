// ─── Passionate Learning — Retention Curve Engine ───
// Pure functions that compute Ebbinghaus-style forgetting curve data
// from real learning events. No side effects, no localStorage access.

import { LearningEvent } from "@/lib/storage";

/** A single data point on the retention curve at a specific day interval. */
export interface RetentionPoint {
  day: number;            // days since first exposure (0, 1, 7, 14, 30)
  theoretical: number;    // Ebbinghaus model prediction 0-100
  actual: number | null;  // player's real retention %, null if no data
  reviewCount: number;    // how many reviews happened at this interval
}

/** Aggregated retention curve data for display. */
export interface RetentionCurveData {
  points: RetentionPoint[];
  overallRetention: number;  // weighted average of actual retention
  totalReviews: number;
}

/** The day intervals we measure retention at. */
export const RETENTION_DAYS = [0, 1, 3, 7, 14, 30] as const;

/**
 * Ebbinghaus forgetting curve: R = e^(-t/S)
 * where t = time in days, S = stability (higher = slower decay).
 * Default stability of 3.5 models a typical untrained learner.
 * @param day - Days since exposure
 * @param stability - Memory stability factor (default 3.5)
 * @returns Retention percentage 0-100
 */
export function ebbinghaus(day: number, stability = 3.5): number {
  if (day <= 0) return 100;
  if (!Number.isFinite(day) || !Number.isFinite(stability) || stability <= 0) return 0;
  return Math.round(Math.exp(-day / stability) * 100);
}

/**
 * Bucket review events by day-interval since first correct.
 * Groups events into nearest RETENTION_DAYS bucket using ±threshold matching.
 * @param events - Raw learning events
 * @returns Map of day-interval → { correct, total } counts
 */
export function bucketByInterval(
  events: LearningEvent[],
): Map<number, { correct: number; total: number }> {
  const buckets = new Map<number, { correct: number; total: number }>();
  for (const day of RETENTION_DAYS) {
    buckets.set(day, { correct: 0, total: 0 });
  }

  for (const e of events) {
    if (e.type !== "review_correct" && e.type !== "review_incorrect") continue;
    const days = e.daysSinceLastSeen ?? 0;

    // Find nearest bucket within threshold
    const bucket = findNearestBucket(days);
    if (bucket === null) continue;

    const b = buckets.get(bucket)!;
    b.total += 1;
    if (e.type === "review_correct") b.correct += 1;
  }

  // Day 0 = first_correct events (always 100% by definition)
  const firstCorrectCount = events.filter((e) => e.type === "first_correct").length;
  if (firstCorrectCount > 0) {
    buckets.set(0, { correct: firstCorrectCount, total: firstCorrectCount });
  }

  return buckets;
}

/**
 * Find the nearest RETENTION_DAYS bucket for a given day count.
 * Uses adaptive thresholds: tighter for small intervals, looser for large.
 * @returns The matched bucket day, or null if no bucket is close enough.
 */
export function findNearestBucket(days: number): number | null {
  if (!Number.isFinite(days) || days < 0) return null;

  let bestDay: number | null = null;
  let bestDist = Infinity;

  for (const d of RETENTION_DAYS) {
    // Threshold scales: ±0.5 for day 0-1, ±1.5 for day 3, ±3 for day 7+
    const threshold = d <= 1 ? 0.5 : d <= 3 ? 1.5 : d * 0.4;
    const dist = Math.abs(days - d);
    if (dist <= threshold && dist < bestDist) {
      bestDist = dist;
      bestDay = d;
    }
  }

  return bestDay;
}

/**
 * Compute the full retention curve from learning events.
 * Combines theoretical Ebbinghaus predictions with actual player data.
 */
export function computeRetentionCurve(events: LearningEvent[]): RetentionCurveData {
  const buckets = bucketByInterval(events);
  let weightedSum = 0;
  let weightTotal = 0;
  let totalReviews = 0;

  const points: RetentionPoint[] = RETENTION_DAYS.map((day) => {
    const b = buckets.get(day)!;
    const actual = b.total > 0 ? Math.round((b.correct / b.total) * 100) : null;
    totalReviews += b.total;

    if (actual !== null) {
      weightedSum += actual * b.total;
      weightTotal += b.total;
    }

    return {
      day,
      theoretical: ebbinghaus(day),
      actual,
      reviewCount: b.total,
    };
  });

  return {
    points,
    overallRetention: weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0,
    totalReviews,
  };
}

/**
 * Map a retention point to SVG coordinates on the curve.
 * X axis = days (0-30), Y axis = retention % (0-100).
 * @param day - Day value (0-30)
 * @param retention - Retention percentage (0-100)
 * @param width - SVG width
 * @param height - SVG height
 * @param padding - Inner padding
 */
export function retentionToSVG(
  day: number,
  retention: number,
  width: number,
  height: number,
  padding = 32,
): { x: number; y: number } {
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;
  return {
    x: padding + (day / 30) * plotW,
    y: padding + ((100 - retention) / 100) * plotH,
  };
}

/**
 * Generate an SVG path `d` string for a smooth curve through retention points.
 * Uses monotone cubic interpolation for visually correct curves.
 */
export function pointsToPath(
  coords: { x: number; y: number }[],
): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M${coords[0].x},${coords[0].y}`;

  let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    // Cubic bezier with horizontal tangents for smooth decay
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  return d;
}
