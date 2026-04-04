// ─── Passionate Learning — Activity Heatmap ───
// Aggregates learning events into a daily activity grid for GitHub-style visualization.
// Pure functions — reads from localStorage analytics, returns structured day data.

import { LearningEvent } from "@/lib/storage";

export interface DayActivity {
  date: string;       // ISO date string (YYYY-MM-DD)
  count: number;      // total events that day
  intensity: 0 | 1 | 2 | 3 | 4; // 0=none, 4=most active
}

export interface HeatmapData {
  days: DayActivity[];
  totalActiveDays: number;
  currentStreak: number;
  bestStreak: number;
  totalEvents: number;
  weekCount: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Convert a Unix timestamp to a YYYY-MM-DD date string in local time.
 * @param ts - Unix timestamp in milliseconds
 * @returns ISO-style date string, e.g. "2026-04-04"
 */
export function toDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Map a raw event count to a 0–4 intensity level for heatmap coloring.
 * Uses stepped thresholds: 0→0, 1–2→1, 3–5→2, 6–12→3, 13+→4.
 * @param count - Number of events in a single day
 * @returns Intensity level from 0 (inactive) to 4 (most active)
 */
export function countToIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 12) return 3;
  return 4;
}

/**
 * Compute current and best streaks from a set of active date keys.
 * Current streak counts backwards from `today`. Best streak scans all dates.
 * @param dateKeys - Set of YYYY-MM-DD strings representing active days
 * @param today - Today's date as YYYY-MM-DD (anchor for current streak)
 * @returns `{ current, best }` streak lengths in days
 */
export function computeStreaks(dateKeys: Set<string>, today: string): { current: number; best: number } {
  if (dateKeys.size === 0) return { current: 0, best: 0 };

  // Walk backwards from today for current streak
  let current = 0;
  let cursor = new Date(today + "T00:00:00");
  while (dateKeys.has(toDateKey(cursor.getTime()))) {
    current++;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }

  // Walk all sorted dates for best streak
  const sorted = Array.from(dateKeys).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00").getTime();
    const curr = new Date(sorted[i] + "T00:00:00").getTime();
    if (curr - prev === MS_PER_DAY) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }

  return { current, best: Math.max(best, current) };
}

/**
 * Build a heatmap grid from learning events. Generates `weeks` weeks of daily
 * cells ending today, with activity counts and intensity levels.
 *
 * @param events - Raw learning events from localStorage analytics
 * @param weeks - Number of weeks to display (default 12)
 */
export function buildHeatmap(events: LearningEvent[], weeks = 12): HeatmapData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today.getTime());
  const totalDays = weeks * 7;
  const startTs = today.getTime() - (totalDays - 1) * MS_PER_DAY;

  // Aggregate events by day
  const dayCounts = new Map<string, number>();
  for (const ev of events) {
    if (ev.timestamp < startTs) continue;
    const key = toDateKey(ev.timestamp);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  // Build grid from start to today
  const days: DayActivity[] = [];
  for (let i = 0; i < totalDays; i++) {
    const ts = startTs + i * MS_PER_DAY;
    const key = toDateKey(ts);
    const count = dayCounts.get(key) ?? 0;
    days.push({ date: key, count, intensity: countToIntensity(count) });
  }

  const activeDays = new Set(days.filter((d) => d.count > 0).map((d) => d.date));
  const streaks = computeStreaks(activeDays, todayKey);

  return {
    days,
    totalActiveDays: activeDays.size,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
    totalEvents: events.filter((e) => e.timestamp >= startTs).length,
    weekCount: weeks,
  };
}
