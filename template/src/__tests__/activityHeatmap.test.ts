import { describe, it, expect } from "vitest";
import {
  toDateKey,
  countToIntensity,
  computeStreaks,
  buildHeatmap,
} from "@/lib/activityHeatmap";
import { LearningEvent } from "@/lib/storage";

const DAY = 86_400_000;

function makeEvent(daysAgo: number, type: LearningEvent["type"] = "first_correct"): LearningEvent {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return { type, itemId: `item-${daysAgo}`, timestamp: now.getTime() - daysAgo * DAY };
}

describe("toDateKey", () => {
  it("formats timestamp as YYYY-MM-DD", () => {
    const ts = new Date(2026, 2, 15, 14, 30).getTime(); // March 15, 2026
    expect(toDateKey(ts)).toBe("2026-03-15");
  });

  it("pads single-digit month and day", () => {
    const ts = new Date(2026, 0, 5, 8, 0).getTime(); // Jan 5
    expect(toDateKey(ts)).toBe("2026-01-05");
  });
});

describe("countToIntensity", () => {
  it("returns 0 for no events", () => expect(countToIntensity(0)).toBe(0));
  it("returns 1 for 1-2 events", () => {
    expect(countToIntensity(1)).toBe(1);
    expect(countToIntensity(2)).toBe(1);
  });
  it("returns 2 for 3-5 events", () => {
    expect(countToIntensity(3)).toBe(2);
    expect(countToIntensity(5)).toBe(2);
  });
  it("returns 3 for 6-12 events", () => {
    expect(countToIntensity(6)).toBe(3);
    expect(countToIntensity(12)).toBe(3);
  });
  it("returns 4 for 13+ events", () => {
    expect(countToIntensity(13)).toBe(4);
    expect(countToIntensity(100)).toBe(4);
  });
});

describe("computeStreaks", () => {
  it("returns zeros for empty set", () => {
    expect(computeStreaks(new Set(), "2026-03-30")).toEqual({ current: 0, best: 0 });
  });

  it("computes current streak from today", () => {
    const today = "2026-03-30";
    const dates = new Set(["2026-03-28", "2026-03-29", "2026-03-30"]);
    const result = computeStreaks(dates, today);
    expect(result.current).toBe(3);
    expect(result.best).toBe(3);
  });

  it("current streak is 0 if today has no activity", () => {
    const dates = new Set(["2026-03-28", "2026-03-29"]);
    expect(computeStreaks(dates, "2026-03-30").current).toBe(0);
  });

  it("best streak can exceed current streak", () => {
    // Old streak of 5, current of 2
    const dates = new Set(["2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-14", "2026-03-29", "2026-03-30"]);
    const result = computeStreaks(dates, "2026-03-30");
    expect(result.current).toBe(2);
    expect(result.best).toBe(5);
  });

  it("single active day gives streak of 1", () => {
    const result = computeStreaks(new Set(["2026-03-30"]), "2026-03-30");
    expect(result.current).toBe(1);
    expect(result.best).toBe(1);
  });
});

describe("buildHeatmap", () => {
  it("returns correct day count for given weeks", () => {
    const result = buildHeatmap([], 12);
    expect(result.days.length).toBe(84);
    expect(result.weekCount).toBe(12);
  });

  it("returns all-zero intensity with no events", () => {
    const result = buildHeatmap([], 4);
    expect(result.totalActiveDays).toBe(0);
    expect(result.totalEvents).toBe(0);
    expect(result.days.every((d) => d.intensity === 0)).toBe(true);
  });

  it("aggregates events into correct days", () => {
    const events = [makeEvent(0), makeEvent(0), makeEvent(0), makeEvent(1)];
    const result = buildHeatmap(events, 2);
    const todayCell = result.days[result.days.length - 1];
    const yesterdayCell = result.days[result.days.length - 2];
    expect(todayCell.count).toBe(3);
    expect(yesterdayCell.count).toBe(1);
    expect(result.totalActiveDays).toBe(2);
    expect(result.totalEvents).toBe(4);
  });

  it("excludes events outside the window", () => {
    const events = [makeEvent(100)]; // 100 days ago, outside 12-week window
    const result = buildHeatmap(events, 12);
    expect(result.totalEvents).toBe(0);
    expect(result.totalActiveDays).toBe(0);
  });

  it("intensity levels reflect event counts", () => {
    // Create 15 events today for max intensity
    const events = Array.from({ length: 15 }, () => makeEvent(0));
    const result = buildHeatmap(events, 1);
    const todayCell = result.days[result.days.length - 1];
    expect(todayCell.intensity).toBe(4);
  });

  it("computes streaks from event data", () => {
    const events = [makeEvent(0), makeEvent(1), makeEvent(2)];
    const result = buildHeatmap(events, 2);
    expect(result.currentStreak).toBe(3);
    expect(result.bestStreak).toBe(3);
  });
});
