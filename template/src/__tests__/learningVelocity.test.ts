import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  linearSlope,
  computeVelocity,
  recordSession,
  getSessionSnapshots,
  SessionSnapshot,
} from "@/lib/learningVelocity";

// ─── Mock localStorage ───
const store: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
});

function snap(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    timestamp: Date.now(),
    itemsSeen: 10,
    correctCount: 7,
    masteredCount: 3,
    accuracy: 70,
    durationMs: 300_000,
    ...overrides,
  };
}

// ─── linearSlope ───
describe("linearSlope", () => {
  it("returns 0 for single value", () => {
    expect(linearSlope([5])).toBe(0);
  });

  it("detects positive trend", () => {
    expect(linearSlope([1, 2, 3, 4, 5])).toBeCloseTo(1, 5);
  });

  it("detects negative trend", () => {
    expect(linearSlope([5, 4, 3, 2, 1])).toBeCloseTo(-1, 5);
  });

  it("returns 0 for flat data", () => {
    expect(linearSlope([3, 3, 3, 3])).toBeCloseTo(0, 5);
  });

  it("handles noisy improving data", () => {
    // overall upward despite noise
    expect(linearSlope([0.1, 0.3, 0.2, 0.5, 0.4, 0.7])).toBeGreaterThan(0);
  });
});

// ─── recordSession + getSessionSnapshots ───
describe("session storage", () => {
  it("records and retrieves snapshots", () => {
    recordSession(snap({ accuracy: 80 }));
    recordSession(snap({ accuracy: 90 }));
    const sessions = getSessionSnapshots();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].accuracy).toBe(80);
    expect(sessions[1].accuracy).toBe(90);
  });

  it("skips empty sessions (itemsSeen = 0)", () => {
    recordSession(snap({ itemsSeen: 0 }));
    expect(getSessionSnapshots()).toHaveLength(0);
  });

  it("caps at 30 sessions", () => {
    for (let i = 0; i < 35; i++) {
      recordSession(snap({ accuracy: i }));
    }
    const sessions = getSessionSnapshots();
    expect(sessions).toHaveLength(30);
    expect(sessions[0].accuracy).toBe(5); // first 5 trimmed
  });

  it("returns empty on malformed JSON", () => {
    store["passionate_learning_velocity_sessions"] = "NOT_JSON";
    expect(getSessionSnapshots()).toEqual([]);
  });

  it("filters out malformed entries", () => {
    store["passionate_learning_velocity_sessions"] = JSON.stringify([
      { timestamp: 1, itemsSeen: 5, accuracy: 80 }, // valid
      { broken: true }, // invalid
      null, // invalid
    ]);
    expect(getSessionSnapshots()).toHaveLength(1);
  });
});

// ─── computeVelocity ───
describe("computeVelocity", () => {
  it("returns insufficient with 0 sessions", () => {
    const report = computeVelocity();
    expect(report.trend).toBe("insufficient");
    expect(report.sessions).toHaveLength(0);
  });

  it("returns insufficient with < 3 sessions", () => {
    recordSession(snap());
    recordSession(snap());
    const report = computeVelocity();
    expect(report.trend).toBe("insufficient");
    expect(report.currentVelocity).toBeCloseTo(0.3); // 3/10
  });

  it("detects improving trend", () => {
    // masteredCount increasing: 1, 2, 3, 4, 5
    for (let i = 1; i <= 5; i++) {
      recordSession(snap({ masteredCount: i, itemsSeen: 10 }));
    }
    const report = computeVelocity();
    expect(report.trend).toBe("improving");
    expect(report.slope).toBeGreaterThan(0);
  });

  it("detects declining trend", () => {
    for (let i = 5; i >= 1; i--) {
      recordSession(snap({ masteredCount: i, itemsSeen: 10 }));
    }
    const report = computeVelocity();
    expect(report.trend).toBe("declining");
    expect(report.slope).toBeLessThan(0);
  });

  it("detects steady trend", () => {
    for (let i = 0; i < 5; i++) {
      recordSession(snap({ masteredCount: 5, itemsSeen: 10 }));
    }
    const report = computeVelocity();
    expect(report.trend).toBe("steady");
    expect(report.slope).toBeCloseTo(0);
  });

  it("computes average velocity correctly", () => {
    recordSession(snap({ masteredCount: 2, itemsSeen: 10 })); // 0.2
    recordSession(snap({ masteredCount: 4, itemsSeen: 10 })); // 0.4
    recordSession(snap({ masteredCount: 6, itemsSeen: 10 })); // 0.6
    const report = computeVelocity();
    expect(report.averageVelocity).toBeCloseTo(0.4);
    expect(report.currentVelocity).toBeCloseTo(0.6);
  });
});
