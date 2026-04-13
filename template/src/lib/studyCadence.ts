// ─── Passionate Learning — Study Cadence Analyzer ───
// Answers the question: "When should I study next?"
// Analyzes session timing patterns against research-backed optimal cadence
// (3-5 sessions/week, evenly spaced) and recommends next study time.
// Pure functions — reads from learningVelocity's SessionSnapshot storage.

import { getSessionSnapshots } from "@/lib/learningVelocity";

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

/** Research-backed optimal range: 3-5 sessions per week. */
export const OPTIMAL_MIN_WEEKLY = 3;
export const OPTIMAL_MAX_WEEKLY = 5;

/** Gap thresholds for regularity scoring. */
const IDEAL_GAP_DAYS = 7 / OPTIMAL_MAX_WEEKLY; // ~1.4 days between sessions
const MAX_GAP_DAYS = 3; // gaps longer than this hurt retention

export type CadenceRating =
  | "optimal"         // 3-5 sessions/week, evenly spaced
  | "under-practicing" // <3 sessions/week
  | "over-practicing"  // >5 sessions/week (diminishing returns)
  | "irregular"        // right frequency but bursty (e.g., 5 sessions in 2 days)
  | "new";             // not enough data

export interface CadenceReport {
  /** Overall cadence quality. */
  rating: CadenceRating;
  /** Average sessions per week over the analysis window. */
  sessionsPerWeek: number;
  /** How evenly sessions are spaced: 0 = completely irregular, 100 = perfectly even. */
  regularityScore: number;
  /** Recommended next study time as Unix timestamp (ms). */
  nextStudyTime: number;
  /** Hours until recommended next study time. */
  hoursUntilNext: number;
  /** Current gap in days since last session. */
  daysSinceLastSession: number;
  /** Total sessions analyzed. */
  totalSessions: number;
  /** Human-readable cadence message for UI. */
  message: string;
}

/**
 * Compute inter-session gaps in days from an array of timestamps.
 * Returns gaps sorted chronologically.
 */
export function computeGaps(timestamps: number[]): number[] {
  if (timestamps.length < 2) return [];
  const sorted = [...timestamps].sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i] - sorted[i - 1]) / MS_PER_DAY);
  }
  return gaps;
}

/**
 * Score regularity of session spacing: 0 (completely bursty) to 100 (perfectly even).
 * Uses coefficient of variation — lower CV = more regular.
 */
export function scoreRegularity(gaps: number[]): number {
  if (gaps.length === 0) return 0;
  if (gaps.length === 1) return gaps[0] <= MAX_GAP_DAYS ? 80 : 40;

  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (mean === 0) return 100; // all sessions same timestamp — perfectly regular (degenerate)

  const variance = gaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gaps.length;
  const cv = Math.sqrt(variance) / mean; // coefficient of variation

  // CV of 0 = perfectly regular (score 100), CV >= 1.5 = chaotic (score 0)
  const raw = Math.max(0, 1 - cv / 1.5) * 100;
  return Math.round(raw);
}

/**
 * Compute sessions per week from timestamps over a date range.
 * Uses the actual time span, not calendar weeks, for accuracy.
 */
export function computeWeeklyRate(timestamps: number[]): number {
  if (timestamps.length < 2) return timestamps.length > 0 ? timestamps.length : 0;
  const sorted = [...timestamps].sort((a, b) => a - b);
  const spanDays = (sorted[sorted.length - 1] - sorted[0]) / MS_PER_DAY;
  if (spanDays < 1) return timestamps.length; // all within one day
  const weeks = spanDays / 7;
  return timestamps.length / weeks;
}

/**
 * Recommend the next optimal study time based on session history.
 * Aims for ~1.4-day gaps (5 sessions/week sweet spot).
 */
export function recommendNextTime(
  lastSessionTimestamp: number,
  weeklyRate: number,
  now: number = Date.now(),
): number {
  // If already overdue, recommend now
  const daysSinceLast = (now - lastSessionTimestamp) / MS_PER_DAY;
  if (daysSinceLast >= MAX_GAP_DAYS) return now;

  // Target gap: if under-practicing, shorten gap; if over-practicing, lengthen
  let targetGapDays: number;
  if (weeklyRate < OPTIMAL_MIN_WEEKLY) {
    targetGapDays = IDEAL_GAP_DAYS; // tighten up
  } else if (weeklyRate > OPTIMAL_MAX_WEEKLY) {
    targetGapDays = 7 / OPTIMAL_MIN_WEEKLY; // ~2.3 days, ease off
  } else {
    targetGapDays = 7 / Math.min(weeklyRate, OPTIMAL_MAX_WEEKLY);
  }

  const recommended = lastSessionTimestamp + targetGapDays * MS_PER_DAY;
  return Math.max(recommended, now); // never recommend the past
}

/**
 * Generate a human-readable cadence message.
 */
export function cadenceMessage(rating: CadenceRating, sessionsPerWeek: number): string {
  switch (rating) {
    case "optimal":
      return `On track — ${sessionsPerWeek.toFixed(1)} sessions/week hits the sweet spot`;
    case "under-practicing":
      return `${sessionsPerWeek.toFixed(1)} sessions/week — aim for 3-5 for optimal retention`;
    case "over-practicing":
      return `${sessionsPerWeek.toFixed(1)} sessions/week — spacing out boosts long-term memory`;
    case "irregular":
      return `Right frequency but bursty — try spreading sessions more evenly`;
    case "new":
      return "Keep playing to unlock cadence insights";
  }
}

/**
 * Classify cadence rating from frequency and regularity data.
 */
export function classifyCadence(
  sessionsPerWeek: number,
  regularityScore: number,
  totalSessions: number,
): CadenceRating {
  if (totalSessions < 3) return "new";
  if (sessionsPerWeek < OPTIMAL_MIN_WEEKLY) return "under-practicing";
  if (sessionsPerWeek > OPTIMAL_MAX_WEEKLY) return "over-practicing";
  if (regularityScore < 40) return "irregular";
  return "optimal";
}

/**
 * Build a full cadence report from stored session snapshots.
 * Main entry point — composes all cadence primitives.
 */
export function analyzeCadence(now: number = Date.now()): CadenceReport {
  const sessions = getSessionSnapshots();
  const timestamps = sessions.map((s) => s.timestamp);
  const totalSessions = timestamps.length;

  if (totalSessions === 0) {
    return {
      rating: "new",
      sessionsPerWeek: 0,
      regularityScore: 0,
      nextStudyTime: now,
      hoursUntilNext: 0,
      daysSinceLastSession: 0,
      totalSessions: 0,
      message: cadenceMessage("new", 0),
    };
  }

  const gaps = computeGaps(timestamps);
  const regularityScore = scoreRegularity(gaps);
  const sessionsPerWeek = computeWeeklyRate(timestamps);
  const rating = classifyCadence(sessionsPerWeek, regularityScore, totalSessions);

  const lastTs = Math.max(...timestamps);
  const daysSinceLastSession = (now - lastTs) / MS_PER_DAY;
  const nextStudyTime = recommendNextTime(lastTs, sessionsPerWeek, now);
  const hoursUntilNext = Math.max(0, (nextStudyTime - now) / MS_PER_HOUR);

  return {
    rating,
    sessionsPerWeek,
    regularityScore,
    nextStudyTime,
    hoursUntilNext: Math.round(hoursUntilNext * 10) / 10,
    daysSinceLastSession: Math.round(daysSinceLastSession * 10) / 10,
    totalSessions,
    message: cadenceMessage(rating, sessionsPerWeek),
  };
}
