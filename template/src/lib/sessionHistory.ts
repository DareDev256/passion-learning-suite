// ─── Passionate Learning — Session History ───
// Aggregates session snapshots into a displayable history timeline.
// Answers: "What have I been doing, and am I getting better?"
// Pure functions over learningVelocity snapshots. No new storage — reuses existing data.

import { getSessionSnapshots, linearSlope } from "@/lib/learningVelocity";

/** Session composition breakdown — how the auto-select brain mixed the session. */
export interface SessionComposition {
  reviews: number;
  recallBonus: number;
  weakArea: number;
  newItems: number;
}

/** A single entry in the session history timeline. */
export interface HistoryEntry {
  timestamp: number;
  accuracy: number;
  itemsSeen: number;
  correctCount: number;
  durationMs: number;
  /** Relative day label: "Today", "Yesterday", "Mon", "Tue", etc. */
  dayLabel: string;
  /** Time of day: "2:30 PM" */
  timeLabel: string;
}

/** Aggregated session history for UI rendering. */
export interface SessionHistoryData {
  entries: HistoryEntry[];
  /** Accuracy values for sparkline rendering (oldest → newest). */
  accuracyTrend: number[];
  /** Average accuracy across all sessions. */
  averageAccuracy: number;
  /** Best single-session accuracy. */
  bestAccuracy: number;
  /** Total sessions played. */
  totalSessions: number;
  /** Accuracy trend direction based on recent sessions. */
  trendDirection: "up" | "down" | "flat" | "new";
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Format a timestamp to a relative day label. */
export function toDayLabel(ts: number, now: number = Date.now()): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(ts);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return DAY_NAMES[new Date(ts).getDay()];
  return `${new Date(ts).getMonth() + 1}/${new Date(ts).getDate()}`;
}

/** Format a timestamp to a short time string. */
export function toTimeLabel(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Build a session history from stored snapshots.
 * @param limit - Max entries to return (default 10, most recent first)
 */
export function buildSessionHistory(limit = 10): SessionHistoryData {
  const snapshots = getSessionSnapshots();
  const empty: SessionHistoryData = {
    entries: [], accuracyTrend: [], averageAccuracy: 0,
    bestAccuracy: 0, totalSessions: 0, trendDirection: "new",
  };
  if (snapshots.length === 0) return empty;

  const now = Date.now();
  const recent = snapshots.slice(-limit);
  const entries: HistoryEntry[] = recent.map((s) => ({
    timestamp: s.timestamp,
    accuracy: s.accuracy,
    itemsSeen: s.itemsSeen,
    correctCount: s.correctCount,
    durationMs: s.durationMs,
    dayLabel: toDayLabel(s.timestamp, now),
    timeLabel: toTimeLabel(s.timestamp),
  })).reverse(); // newest first for display

  const accuracies = snapshots.map((s) => s.accuracy);
  const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const best = Math.max(...accuracies);

  let trendDirection: SessionHistoryData["trendDirection"] = "new";
  if (accuracies.length >= 3) {
    const recentAccuracies = accuracies.slice(-6);
    const slope = linearSlope(recentAccuracies);
    if (slope > 1.5) trendDirection = "up";
    else if (slope < -1.5) trendDirection = "down";
    else trendDirection = "flat";
  }

  return {
    entries,
    accuracyTrend: accuracies,
    averageAccuracy: Math.round(avg),
    bestAccuracy: Math.round(best),
    totalSessions: snapshots.length,
    trendDirection,
  };
}
