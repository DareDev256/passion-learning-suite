// ─── Passionate Learning — Learning Velocity Engine ───
// Tracks per-session performance snapshots and computes learning velocity trends.
// Answers the question: "Am I learning faster, or just grinding?"
// Pure functions + localStorage persistence. SSR-safe.

import { getGameId } from "@/lib/storage";

/** A snapshot of one study session's performance. */
export interface SessionSnapshot {
  timestamp: number;
  itemsSeen: number;
  correctCount: number;
  masteredCount: number;  // items that crossed the mastery threshold this session
  accuracy: number;       // 0-100
  durationMs: number;     // session wall-clock time
}

export type VelocityTrend = "improving" | "declining" | "steady" | "insufficient";

export interface VelocityReport {
  trend: VelocityTrend;
  currentVelocity: number;   // mastered items per session (latest)
  averageVelocity: number;   // mastered items per session (all-time)
  slope: number;             // linear regression slope over recent sessions
  sessions: SessionSnapshot[];
}

const MAX_SESSIONS = 30;
const MIN_SESSIONS_FOR_TREND = 3;
const SLOPE_THRESHOLD = 0.05; // below this magnitude = steady

function storageKey(): string {
  return `${getGameId()}_velocity_sessions`;
}

/** Load session snapshots from localStorage. SSR-safe. */
export function getSessionSnapshots(): SessionSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(storageKey());
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s: unknown): s is SessionSnapshot =>
        s != null &&
        typeof s === "object" &&
        Number.isFinite((s as SessionSnapshot).timestamp) &&
        Number.isFinite((s as SessionSnapshot).itemsSeen) &&
        Number.isFinite((s as SessionSnapshot).accuracy)
    );
  } catch {
    return [];
  }
}

/** Record a session snapshot. Keeps last 30 sessions. No-op during SSR. */
export function recordSession(snapshot: SessionSnapshot): void {
  if (typeof window === "undefined") return;
  if (snapshot.itemsSeen <= 0) return; // don't record empty sessions
  const sessions = getSessionSnapshots();
  sessions.push(snapshot);
  const trimmed = sessions.slice(-MAX_SESSIONS);
  localStorage.setItem(storageKey(), JSON.stringify(trimmed));
}

/**
 * Compute the least-squares regression slope over an array of values.
 * Positive slope = values trending up. Negative = trending down.
 */
export function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Compute a learning velocity report from stored session snapshots.
 * Velocity = mastered items per session. Trend = direction of that metric.
 */
export function computeVelocity(): VelocityReport {
  const sessions = getSessionSnapshots();
  const empty: VelocityReport = {
    trend: "insufficient", currentVelocity: 0, averageVelocity: 0, slope: 0, sessions: [],
  };
  if (sessions.length === 0) return empty;

  const velocities = sessions.map((s) =>
    s.itemsSeen > 0 ? s.masteredCount / s.itemsSeen : 0
  );
  const current = velocities[velocities.length - 1];
  const average = velocities.reduce((a, b) => a + b, 0) / velocities.length;

  if (sessions.length < MIN_SESSIONS_FOR_TREND) {
    return { trend: "insufficient", currentVelocity: current, averageVelocity: average, slope: 0, sessions };
  }

  const slope = linearSlope(velocities);
  let trend: VelocityTrend;
  if (slope > SLOPE_THRESHOLD) trend = "improving";
  else if (slope < -SLOPE_THRESHOLD) trend = "declining";
  else trend = "steady";

  return { trend, currentVelocity: current, averageVelocity: average, slope, sessions };
}
