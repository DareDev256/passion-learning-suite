import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  retrievability,
  daysUntilDecay,
  predictDecay,
  fullDecayForecast,
} from "@/lib/knowledgeDecay";
import {
  linearSlope,
  computeVelocity,
  recordSession,
  getSessionSnapshots,
  type SessionSnapshot,
} from "@/lib/learningVelocity";
import {
  enqueue,
  dismiss,
  peek,
  pending,
  clear,
  subscribe,
} from "@/lib/achievementNotifier";
import type { Achievement } from "@/lib/achievements";
import type { FSRSCard } from "@/lib/storage";

// ─── Shared fixtures ───

const NOW = 1_700_000_000_000;
const DAY = 86_400_000;

function card(overrides: Partial<FSRSCard> & { itemId: string }): FSRSCard {
  return { due: NOW, stability: 5, difficulty: 0.5, reps: 3, lapses: 0, lastReview: NOW - 2 * DAY, ...overrides };
}

const ITEMS = [
  { id: "a1", category: "basics" },
  { id: "a2", category: "basics" },
  { id: "b1", category: "advanced" },
];

function snap(o: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return { timestamp: Date.now(), itemsSeen: 10, correctCount: 7, masteredCount: 3, accuracy: 70, durationMs: 300_000, ...o };
}

const ach = (id: string): Achievement => ({ id, title: id, description: "", icon: "🏆", tier: "bronze" });

// ─── Mock sound engine (achievementNotifier dependency) ───
vi.mock("@/lib/soundEngine", () => ({ playAchievement: vi.fn() }));

// ─── Mock localStorage (learningVelocity dependency) ───
const store: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
  vi.useFakeTimers();
  clear();
});

// ═══════════════════════════════════════════════
// knowledgeDecay — untested critical-path edges
// ═══════════════════════════════════════════════

describe("knowledgeDecay — future lastReview", () => {
  it("treats future-reviewed card as fully retained (elapsed ≤ 0)", () => {
    const futureCard = card({ itemId: "a1", lastReview: NOW + 5 * DAY, stability: 2 });
    const forecast = predictDecay([futureCard], ITEMS, 1, NOW);
    // Elapsed is negative → retrievability = 1, so not at risk
    expect(forecast.totalAtRisk).toBe(0);
    expect(forecast.healthScore).toBe(100);
  });
});

describe("knowledgeDecay — custom retentionTarget", () => {
  it("stricter target (0.95) flags more items", () => {
    const cards = [card({ itemId: "a1", stability: 10, lastReview: NOW - 1 * DAY })];
    const loose = predictDecay(cards, ITEMS, 7, NOW, 0.8);
    const strict = predictDecay(cards, ITEMS, 7, NOW, 0.95);
    expect(strict.totalAtRisk).toBeGreaterThanOrEqual(loose.totalAtRisk);
  });

  it("lenient target still flags badly decayed cards", () => {
    // stability=1, elapsed=3d → R at day 10 = e^(-10/1) ≈ 0.00005 < 0.01
    const cards = [card({ itemId: "a1", stability: 1, lastReview: NOW - 3 * DAY })];
    const forecast = predictDecay(cards, ITEMS, 7, NOW, 0.01);
    expect(forecast.totalAtRisk).toBe(1);
  });
});

describe("knowledgeDecay — 100% decay scenario", () => {
  it("healthScore is 0 when every reviewed card decays", () => {
    const cards = [
      card({ itemId: "a1", stability: 0.1, lastReview: NOW - 30 * DAY }),
      card({ itemId: "b1", stability: 0.1, lastReview: NOW - 30 * DAY }),
    ];
    const forecast = predictDecay(cards, ITEMS, 1, NOW);
    expect(forecast.healthScore).toBe(0);
    expect(forecast.totalAtRisk).toBe(2);
  });
});

describe("retrievability — Infinity inputs", () => {
  it("treats Infinity elapsed as non-finite → returns 1 (safe default)", () => {
    // Guard: !Number.isFinite(daysSinceReview) → return 1
    expect(retrievability(Infinity, 5)).toBe(1);
  });

  it("treats Infinity stability as non-finite → returns 0 (invalid card)", () => {
    // Guard: !Number.isFinite(stability) → return 0
    expect(retrievability(5, Infinity)).toBe(0);
  });
});

describe("daysUntilDecay — negative stability", () => {
  it("returns 0 for NaN stability", () => {
    expect(daysUntilDecay(NaN, 0.9)).toBe(0);
  });

  it("returns 0 for Infinity stability", () => {
    // -Infinity * ln(0.9) = Infinity, but guard should catch
    expect(daysUntilDecay(Infinity, 0.9)).toBe(0);
  });
});

describe("fullDecayForecast — single extremely stable card", () => {
  it("reports 0 at-risk across all horizons for high-stability card", () => {
    const stable = card({ itemId: "a1", stability: 500, lastReview: NOW });
    const forecasts = fullDecayForecast([stable], ITEMS, NOW);
    for (const f of forecasts) {
      expect(f.totalAtRisk).toBe(0);
      expect(f.healthScore).toBe(100);
    }
  });
});

// ═══════════════════════════════════════════════
// learningVelocity — untested edge paths
// ═══════════════════════════════════════════════

describe("linearSlope — edge inputs", () => {
  it("returns 0 for empty array", () => {
    expect(linearSlope([])).toBe(0);
  });

  it("handles two identical values (flat)", () => {
    expect(linearSlope([5, 5])).toBeCloseTo(0);
  });

  it("handles two-point slope precisely", () => {
    // slope between [2, 8] should be 6
    expect(linearSlope([2, 8])).toBeCloseTo(6);
  });
});

describe("recordSession — rejection paths", () => {
  it("rejects session with negative itemsSeen", () => {
    recordSession(snap({ itemsSeen: -5 }));
    expect(getSessionSnapshots()).toHaveLength(0);
  });
});

describe("computeVelocity — zero mastery sessions", () => {
  it("reports 0 velocity when masteredCount is always 0", () => {
    for (let i = 0; i < 4; i++) recordSession(snap({ masteredCount: 0, itemsSeen: 10 }));
    const report = computeVelocity();
    expect(report.currentVelocity).toBe(0);
    expect(report.averageVelocity).toBe(0);
    expect(report.trend).toBe("steady");
  });

  it("computes velocity ratio correctly with varying itemsSeen", () => {
    // 2/5=0.4, 4/20=0.2, 6/10=0.6 → declining density despite rising mastered count
    recordSession(snap({ masteredCount: 2, itemsSeen: 5 }));
    recordSession(snap({ masteredCount: 4, itemsSeen: 20 }));
    recordSession(snap({ masteredCount: 6, itemsSeen: 10 }));
    const report = computeVelocity();
    expect(report.currentVelocity).toBeCloseTo(0.6);
    expect(report.averageVelocity).toBeCloseTo(0.4);
  });
});

// ═══════════════════════════════════════════════
// achievementNotifier — concurrency & dedup edges
// ═══════════════════════════════════════════════

describe("achievementNotifier — manual dismiss resets auto-dismiss", () => {
  it("manual dismiss restarts auto-dismiss timer for next item", () => {
    enqueue([ach("a"), ach("b"), ach("c")]);
    // At t=2s, manually dismiss "a"
    vi.advanceTimersByTime(2000);
    dismiss();
    expect(peek()?.achievement.id).toBe("b");
    // Auto-dismiss for "b" starts fresh — should fire at t=2s+4s=6s
    vi.advanceTimersByTime(3999);
    expect(peek()?.achievement.id).toBe("b"); // still showing
    vi.advanceTimersByTime(1);
    expect(peek()?.achievement.id).toBe("c"); // auto-dismissed
  });
});

describe("achievementNotifier — enqueue during auto-dismiss chain", () => {
  it("new enqueue mid-chain appends without disrupting current display", () => {
    enqueue([ach("x")]);
    vi.advanceTimersByTime(2000); // halfway through auto-dismiss
    enqueue([ach("y")]); // arrives while "x" showing
    expect(peek()?.achievement.id).toBe("x"); // still showing x
    expect(pending()).toBe(2);
    vi.advanceTimersByTime(2000); // original auto-dismiss fires for x
    expect(peek()?.achievement.id).toBe("y");
  });
});

describe("achievementNotifier — duplicate achievement IDs", () => {
  it("queues duplicate IDs independently (no dedup)", () => {
    const same = ach("dupe");
    enqueue([same, same, same]);
    expect(pending()).toBe(3);
    dismiss();
    expect(pending()).toBe(2);
  });
});

describe("achievementNotifier — subscriber receives all transitions", () => {
  it("subscriber sees every state change through full lifecycle", () => {
    const states: (string | null)[] = [];
    subscribe((n) => states.push(n?.achievement.id ?? null));
    enqueue([ach("p"), ach("q")]);
    dismiss();
    dismiss();
    // enqueue(p,q) → notify "p", dismiss → notify "q", dismiss → notify null
    expect(states).toEqual(["p", "q", null]);
  });
});
