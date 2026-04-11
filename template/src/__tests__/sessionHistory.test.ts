import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toDayLabel, toTimeLabel, buildSessionHistory } from "@/lib/sessionHistory";

// ─── toDayLabel ───

describe("toDayLabel", () => {
  const noon = new Date("2026-04-11T12:00:00").getTime();

  it("returns 'Today' for same-day timestamps", () => {
    expect(toDayLabel(noon - 3_600_000, noon)).toBe("Today");
  });

  it("returns 'Yesterday' for previous day", () => {
    expect(toDayLabel(noon - 86_400_000, noon)).toBe("Yesterday");
  });

  it("returns day name for 2-6 days ago", () => {
    const threeDaysAgo = noon - 3 * 86_400_000;
    const label = toDayLabel(threeDaysAgo, noon);
    expect(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).toContain(label);
  });

  it("returns M/D format for 7+ days ago", () => {
    const tenDaysAgo = noon - 10 * 86_400_000;
    const label = toDayLabel(tenDaysAgo, noon);
    expect(label).toMatch(/^\d{1,2}\/\d{1,2}$/);
  });
});

// ─── toTimeLabel ───

describe("toTimeLabel", () => {
  it("formats morning time correctly", () => {
    const ts = new Date("2026-04-11T09:05:00").getTime();
    expect(toTimeLabel(ts)).toBe("9:05 AM");
  });

  it("formats afternoon time correctly", () => {
    const ts = new Date("2026-04-11T14:30:00").getTime();
    expect(toTimeLabel(ts)).toBe("2:30 PM");
  });

  it("formats midnight as 12:00 AM", () => {
    const ts = new Date("2026-04-11T00:00:00").getTime();
    expect(toTimeLabel(ts)).toBe("12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    const ts = new Date("2026-04-11T12:00:00").getTime();
    expect(toTimeLabel(ts)).toBe("12:00 PM");
  });
});

// ─── buildSessionHistory ───

describe("buildSessionHistory", () => {
  const mockSnapshots = [
    { timestamp: Date.now() - 4 * 86_400_000, itemsSeen: 10, correctCount: 7, masteredCount: 2, accuracy: 70, durationMs: 450_000 },
    { timestamp: Date.now() - 3 * 86_400_000, itemsSeen: 10, correctCount: 8, masteredCount: 3, accuracy: 80, durationMs: 420_000 },
    { timestamp: Date.now() - 2 * 86_400_000, itemsSeen: 10, correctCount: 9, masteredCount: 4, accuracy: 90, durationMs: 380_000 },
    { timestamp: Date.now() - 86_400_000, itemsSeen: 10, correctCount: 9, masteredCount: 3, accuracy: 90, durationMs: 400_000 },
    { timestamp: Date.now(), itemsSeen: 10, correctCount: 10, masteredCount: 5, accuracy: 100, durationMs: 350_000 },
  ];

  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
    });
    localStorage.setItem("passionate_learning_velocity_sessions", JSON.stringify(mockSnapshots));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns correct total session count", () => {
    const history = buildSessionHistory();
    expect(history.totalSessions).toBe(5);
  });

  it("entries are in reverse chronological order (newest first)", () => {
    const history = buildSessionHistory();
    for (let i = 1; i < history.entries.length; i++) {
      expect(history.entries[i - 1].timestamp).toBeGreaterThan(history.entries[i].timestamp);
    }
  });

  it("computes average accuracy correctly", () => {
    const history = buildSessionHistory();
    expect(history.averageAccuracy).toBe(86); // (70+80+90+90+100)/5 = 86
  });

  it("finds the best accuracy", () => {
    const history = buildSessionHistory();
    expect(history.bestAccuracy).toBe(100);
  });

  it("detects improving trend from rising accuracies", () => {
    const history = buildSessionHistory();
    expect(history.trendDirection).toBe("up");
  });

  it("limits entries to requested count", () => {
    const history = buildSessionHistory(3);
    expect(history.entries).toHaveLength(3);
    expect(history.totalSessions).toBe(5); // total still reflects all
  });

  it("returns empty state for no snapshots", () => {
    localStorage.setItem("passionate_learning_velocity_sessions", "[]");
    const history = buildSessionHistory();
    expect(history.totalSessions).toBe(0);
    expect(history.trendDirection).toBe("new");
    expect(history.entries).toHaveLength(0);
  });

  it("accuracyTrend contains all session accuracies oldest-to-newest", () => {
    const history = buildSessionHistory();
    expect(history.accuracyTrend).toEqual([70, 80, 90, 90, 100]);
  });

  it("detects declining trend from dropping accuracies", () => {
    const declining = [
      { timestamp: Date.now() - 4 * 86_400_000, itemsSeen: 10, correctCount: 10, masteredCount: 5, accuracy: 100, durationMs: 300_000 },
      { timestamp: Date.now() - 3 * 86_400_000, itemsSeen: 10, correctCount: 8, masteredCount: 3, accuracy: 80, durationMs: 400_000 },
      { timestamp: Date.now() - 2 * 86_400_000, itemsSeen: 10, correctCount: 6, masteredCount: 1, accuracy: 60, durationMs: 500_000 },
      { timestamp: Date.now() - 86_400_000, itemsSeen: 10, correctCount: 5, masteredCount: 0, accuracy: 50, durationMs: 600_000 },
    ];
    localStorage.setItem("passionate_learning_velocity_sessions", JSON.stringify(declining));
    const history = buildSessionHistory();
    expect(history.trendDirection).toBe("down");
  });

  it("detects flat trend from stable accuracies", () => {
    const flat = [
      { timestamp: Date.now() - 3 * 86_400_000, itemsSeen: 10, correctCount: 7, masteredCount: 2, accuracy: 70, durationMs: 400_000 },
      { timestamp: Date.now() - 2 * 86_400_000, itemsSeen: 10, correctCount: 7, masteredCount: 2, accuracy: 71, durationMs: 400_000 },
      { timestamp: Date.now() - 86_400_000, itemsSeen: 10, correctCount: 7, masteredCount: 2, accuracy: 70, durationMs: 400_000 },
    ];
    localStorage.setItem("passionate_learning_velocity_sessions", JSON.stringify(flat));
    const history = buildSessionHistory();
    expect(history.trendDirection).toBe("flat");
  });

  it("returns 'new' trend for fewer than 3 sessions", () => {
    const twoSessions = mockSnapshots.slice(0, 2);
    localStorage.setItem("passionate_learning_velocity_sessions", JSON.stringify(twoSessions));
    const history = buildSessionHistory();
    expect(history.trendDirection).toBe("new");
  });

  it("each entry has dayLabel and timeLabel populated", () => {
    const history = buildSessionHistory();
    for (const entry of history.entries) {
      expect(entry.dayLabel).toBeTruthy();
      expect(entry.timeLabel).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    }
  });
});
