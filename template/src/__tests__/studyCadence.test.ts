import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeGaps,
  scoreRegularity,
  computeWeeklyRate,
  recommendNextTime,
  cadenceMessage,
  classifyCadence,
  OPTIMAL_MIN_WEEKLY,
  OPTIMAL_MAX_WEEKLY,
} from "@/lib/studyCadence";

const DAY = 86_400_000;
const HOUR = 3_600_000;

// ─── computeGaps ───

describe("computeGaps", () => {
  it("returns empty for 0 or 1 timestamps", () => {
    expect(computeGaps([])).toEqual([]);
    expect(computeGaps([1000])).toEqual([]);
  });

  it("computes correct gaps in days", () => {
    const base = Date.now();
    const gaps = computeGaps([base, base + DAY, base + 3 * DAY]);
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toBeCloseTo(1, 5);
    expect(gaps[1]).toBeCloseTo(2, 5);
  });

  it("handles unsorted input", () => {
    const base = Date.now();
    const gaps = computeGaps([base + 2 * DAY, base, base + DAY]);
    expect(gaps[0]).toBeCloseTo(1, 5);
    expect(gaps[1]).toBeCloseTo(1, 5);
  });

  it("handles sub-day gaps", () => {
    const base = Date.now();
    const gaps = computeGaps([base, base + 6 * HOUR]);
    expect(gaps[0]).toBeCloseTo(0.25, 5);
  });
});

// ─── scoreRegularity ───

describe("scoreRegularity", () => {
  it("returns 0 for empty gaps", () => {
    expect(scoreRegularity([])).toBe(0);
  });

  it("returns 80 for a single short gap", () => {
    expect(scoreRegularity([1.5])).toBe(80);
  });

  it("returns 40 for a single long gap", () => {
    expect(scoreRegularity([4])).toBe(40);
  });

  it("returns 100 for perfectly even gaps", () => {
    expect(scoreRegularity([2, 2, 2, 2])).toBe(100);
  });

  it("scores high for near-even gaps", () => {
    const score = scoreRegularity([1.4, 1.5, 1.3, 1.6]);
    expect(score).toBeGreaterThan(80);
  });

  it("scores low for very bursty gaps", () => {
    // 3 sessions in 1 hour, then 6-day gap
    const score = scoreRegularity([0.04, 0.04, 6]);
    expect(score).toBeLessThan(30);
  });

  it("returns 100 for all-zero gaps (degenerate)", () => {
    expect(scoreRegularity([0, 0, 0])).toBe(100);
  });
});

// ─── computeWeeklyRate ───

describe("computeWeeklyRate", () => {
  it("returns 0 for no sessions", () => {
    expect(computeWeeklyRate([])).toBe(0);
  });

  it("returns 1 for a single session", () => {
    expect(computeWeeklyRate([Date.now()])).toBe(1);
  });

  it("computes correct rate for daily sessions over a week", () => {
    const base = Date.now();
    const ts = Array.from({ length: 7 }, (_, i) => base + i * DAY);
    const rate = computeWeeklyRate(ts);
    // 7 sessions over 6 days ≈ 8.17/week
    expect(rate).toBeGreaterThan(7);
    expect(rate).toBeLessThan(9);
  });

  it("computes correct rate for every-other-day sessions", () => {
    const base = Date.now();
    const ts = Array.from({ length: 5 }, (_, i) => base + i * 2 * DAY);
    const rate = computeWeeklyRate(ts);
    // 5 sessions over 8 days ≈ 4.375/week
    expect(rate).toBeGreaterThan(3.5);
    expect(rate).toBeLessThan(5);
  });

  it("handles all sessions in one day", () => {
    const base = Date.now();
    const ts = [base, base + HOUR, base + 2 * HOUR];
    expect(computeWeeklyRate(ts)).toBe(3);
  });
});

// ─── recommendNextTime ───

describe("recommendNextTime", () => {
  it("recommends now if gap exceeds 3 days", () => {
    const now = Date.now();
    const lastSession = now - 4 * DAY;
    expect(recommendNextTime(lastSession, 3, now)).toBe(now);
  });

  it("never recommends a time in the past", () => {
    const now = Date.now();
    const lastSession = now - 2 * DAY;
    const rec = recommendNextTime(lastSession, 5, now);
    expect(rec).toBeGreaterThanOrEqual(now);
  });

  it("shortens gap for under-practicing players", () => {
    const now = Date.now();
    const lastSession = now - 0.5 * DAY; // studied 12 hours ago
    const rec = recommendNextTime(lastSession, 1.5, now); // under-practicing
    const gapDays = (rec - lastSession) / DAY;
    expect(gapDays).toBeCloseTo(1.4, 1); // ideal gap
  });

  it("lengthens gap for over-practicing players", () => {
    const now = Date.now();
    const lastSession = now - 0.5 * DAY;
    const rec = recommendNextTime(lastSession, 8, now); // over-practicing
    const gapDays = (rec - lastSession) / DAY;
    expect(gapDays).toBeGreaterThan(2); // ease off
  });
});

// ─── cadenceMessage ───

describe("cadenceMessage", () => {
  it("returns optimal message", () => {
    expect(cadenceMessage("optimal", 4)).toContain("sweet spot");
  });

  it("returns under-practicing guidance", () => {
    expect(cadenceMessage("under-practicing", 1.5)).toContain("3-5");
  });

  it("returns over-practicing guidance", () => {
    expect(cadenceMessage("over-practicing", 7)).toContain("spacing out");
  });

  it("returns irregular guidance", () => {
    expect(cadenceMessage("irregular", 4)).toContain("bursty");
  });

  it("returns new player message", () => {
    expect(cadenceMessage("new", 0)).toContain("unlock");
  });
});

// ─── classifyCadence ───

describe("classifyCadence", () => {
  it("returns 'new' for < 3 sessions", () => {
    expect(classifyCadence(4, 80, 2)).toBe("new");
  });

  it("returns 'under-practicing' for low frequency", () => {
    expect(classifyCadence(2, 80, 10)).toBe("under-practicing");
  });

  it("returns 'over-practicing' for high frequency", () => {
    expect(classifyCadence(7, 80, 10)).toBe("over-practicing");
  });

  it("returns 'irregular' for good frequency but low regularity", () => {
    expect(classifyCadence(4, 30, 10)).toBe("irregular");
  });

  it("returns 'optimal' for good frequency and regularity", () => {
    expect(classifyCadence(4, 80, 10)).toBe("optimal");
  });

  it("boundary: exactly 3/week with good regularity is optimal", () => {
    expect(classifyCadence(OPTIMAL_MIN_WEEKLY, 50, 5)).toBe("optimal");
  });

  it("boundary: exactly 5/week with good regularity is optimal", () => {
    expect(classifyCadence(OPTIMAL_MAX_WEEKLY, 50, 5)).toBe("optimal");
  });
});

// ─── analyzeCadence (integration) ───

describe("analyzeCadence", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 'new' rating with zero sessions", () => {
    vi.doMock("@/lib/learningVelocity", () => ({
      getSessionSnapshots: () => [],
    }));
    return import("@/lib/studyCadence").then(({ analyzeCadence: ac }) => {
      const report = ac();
      expect(report.rating).toBe("new");
      expect(report.totalSessions).toBe(0);
      expect(report.sessionsPerWeek).toBe(0);
      expect(report.message).toContain("unlock");
    });
  });

  it("analyzes well-spaced sessions as optimal", () => {
    const now = Date.now();
    const sessions = Array.from({ length: 8 }, (_, i) => ({
      timestamp: now - (14 - i * 2) * DAY, // every 2 days over 2 weeks
      itemsSeen: 10,
      correctCount: 8,
      masteredCount: 2,
      accuracy: 80,
      durationMs: 300_000,
    }));
    vi.doMock("@/lib/learningVelocity", () => ({
      getSessionSnapshots: () => sessions,
    }));
    return import("@/lib/studyCadence").then(({ analyzeCadence: ac }) => {
      const report = ac(now);
      expect(report.totalSessions).toBe(8);
      expect(report.sessionsPerWeek).toBeGreaterThan(2.5);
      expect(report.sessionsPerWeek).toBeLessThan(5.5);
      expect(report.regularityScore).toBeGreaterThan(70);
    });
  });

  it("detects bursty sessions as irregular", () => {
    const now = Date.now();
    // 5 sessions crammed into 2 hours, then nothing for a week, then 5 more
    const sessions = [
      ...Array.from({ length: 5 }, (_, i) => ({
        timestamp: now - 10 * DAY + i * HOUR * 0.4,
        itemsSeen: 10, correctCount: 7, masteredCount: 1, accuracy: 70, durationMs: 300_000,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        timestamp: now - 1 * DAY + i * HOUR * 0.4,
        itemsSeen: 10, correctCount: 7, masteredCount: 1, accuracy: 70, durationMs: 300_000,
      })),
    ];
    vi.doMock("@/lib/learningVelocity", () => ({
      getSessionSnapshots: () => sessions,
    }));
    return import("@/lib/studyCadence").then(({ analyzeCadence: ac }) => {
      const report = ac(now);
      expect(report.totalSessions).toBe(10);
      expect(report.regularityScore).toBeLessThan(40);
    });
  });

  it("computes hoursUntilNext as non-negative", () => {
    const now = Date.now();
    const sessions = Array.from({ length: 4 }, (_, i) => ({
      timestamp: now - (8 - i * 2) * DAY,
      itemsSeen: 10, correctCount: 8, masteredCount: 2, accuracy: 80, durationMs: 300_000,
    }));
    vi.doMock("@/lib/learningVelocity", () => ({
      getSessionSnapshots: () => sessions,
    }));
    return import("@/lib/studyCadence").then(({ analyzeCadence: ac }) => {
      const report = ac(now);
      expect(report.hoursUntilNext).toBeGreaterThanOrEqual(0);
    });
  });

  it("daysSinceLastSession is accurate", () => {
    const now = Date.now();
    const sessions = [{
      timestamp: now - 2.5 * DAY,
      itemsSeen: 10, correctCount: 8, masteredCount: 2, accuracy: 80, durationMs: 300_000,
    }];
    vi.doMock("@/lib/learningVelocity", () => ({
      getSessionSnapshots: () => sessions,
    }));
    return import("@/lib/studyCadence").then(({ analyzeCadence: ac }) => {
      const report = ac(now);
      expect(report.daysSinceLastSession).toBeCloseTo(2.5, 1);
    });
  });
});
