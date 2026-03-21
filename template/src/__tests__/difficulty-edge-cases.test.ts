import { describe, it, expect, beforeEach, vi } from "vitest";
import { analyzeDifficulty, selectItems, type Difficulty, type DifficultyProfile } from "@/lib/difficulty";
import type { ContentItem } from "@/types/game";

const store: Record<string, string> = {};
const ls = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};
vi.stubGlobal("window", { localStorage: ls });
vi.stubGlobal("localStorage", ls);

const mk = (id: string, d: Difficulty): ContentItem =>
  ({ id, prompt: id, answer: id, category: "test", difficulty: d });

const ITEMS: ContentItem[] = [
  mk("e1","easy"), mk("e2","easy"), mk("e3","easy"),
  mk("e4","easy"), mk("e5","easy"), mk("e6","easy"),
  mk("m1","medium"), mk("m2","medium"), mk("m3","medium"),
  mk("m4","medium"), mk("m5","medium"),
  mk("h1","hard"), mk("h2","hard"), mk("h3","hard"),
];

type Score = { correct: number; incorrect: number; lastSeen: number };
function seed(scores: Record<string, Score>) {
  store["passionate_learning_progress"] = JSON.stringify({
    xp: 0, level: 1, currentCategory: "", completedLevels: [],
    streak: 0, streakFreezes: 0, itemScores: scores,
  });
}

beforeEach(() => { for (const k in store) delete store[k]; });

describe("rolling window", () => {
  it("uses only the 5 most recent scores, promoting despite old failures", () => {
    const n = Date.now();
    const ext = [...ITEMS, mk("e7", "easy")];
    seed({
      e1: { correct: 0, incorrect: 5, lastSeen: n - 70000 }, // old, bad — outside window
      e2: { correct: 0, incorrect: 5, lastSeen: n - 60000 }, // old, bad — outside window
      e3: { correct: 5, incorrect: 0, lastSeen: n - 5000 },
      e4: { correct: 5, incorrect: 0, lastSeen: n - 4000 },
      e5: { correct: 5, incorrect: 0, lastSeen: n - 3000 },
      e6: { correct: 5, incorrect: 0, lastSeen: n - 2000 },
      e7: { correct: 5, incorrect: 0, lastSeen: n - 1000 },
    });
    const p = analyzeDifficulty(ext);
    expect(p.recommended).toBe("medium");
    expect(p.performance.easy.accuracy).toBe(100);
  });
});

describe("per-tier streak", () => {
  it("counts consecutive correct from most recent, breaks on errors", () => {
    const n = Date.now();
    seed({
      e1: { correct: 3, incorrect: 0, lastSeen: n - 1000 },
      e2: { correct: 2, incorrect: 0, lastSeen: n - 2000 },
      e3: { correct: 1, incorrect: 1, lastSeen: n - 3000 }, // breaks streak
    });
    expect(analyzeDifficulty(ITEMS).performance.easy.streak).toBe(2);
  });

  it("streak is 0 when most recent item has errors", () => {
    seed({ e1: { correct: 1, incorrect: 2, lastSeen: Date.now() } });
    expect(analyzeDifficulty(ITEMS).performance.easy.streak).toBe(0);
  });
});

describe("recommendation boundaries", () => {
  it("hard < 50% + no medium → checks easy, promotes if easy ≥ 85%", () => {
    const n = Date.now();
    seed({
      h1: { correct: 1, incorrect: 5, lastSeen: n - 1000 },
      e1: { correct: 5, incorrect: 0, lastSeen: n - 2000 },
      e2: { correct: 5, incorrect: 0, lastSeen: n - 3000 },
    });
    expect(analyzeDifficulty(ITEMS).recommended).toBe("medium");
  });

  it("only hard data with poor accuracy → defaults to easy", () => {
    seed({ h1: { correct: 0, incorrect: 3, lastSeen: Date.now() } });
    expect(analyzeDifficulty([mk("h1","hard")]).recommended).toBe("easy");
  });

  it("medium at exactly 50% → stays medium (boundary)", () => {
    seed({ m1: { correct: 1, incorrect: 1, lastSeen: Date.now() } });
    expect(analyzeDifficulty(ITEMS).recommended).toBe("medium");
  });

  it("hard at exactly 50% → stays hard (boundary)", () => {
    seed({ h1: { correct: 2, incorrect: 2, lastSeen: Date.now() } });
    expect(analyzeDifficulty(ITEMS).recommended).toBe("hard");
  });

  it("medium at exactly 85% → promotes to hard", () => {
    const n = Date.now();
    seed({
      m1: { correct: 4, incorrect: 0, lastSeen: n-1000 },
      m2: { correct: 4, incorrect: 1, lastSeen: n-2000 },
      m3: { correct: 5, incorrect: 0, lastSeen: n-3000 },
      m4: { correct: 2, incorrect: 1, lastSeen: n-4000 },
      m5: { correct: 2, incorrect: 1, lastSeen: n-5000 },
    });
    expect(analyzeDifficulty(ITEMS).recommended).toBe("hard"); // 17/20 = 85%
  });
});

describe("selectItems tier fallback ordering", () => {
  const mkProfile = (rec: Difficulty): DifficultyProfile => ({
    recommended: rec,
    performance: {
      easy: { accuracy: 80, attempts: 5, streak: 0 },
      medium: { accuracy: 60, attempts: 5, streak: 0 },
      hard: { accuracy: 60, attempts: 5, streak: 0 },
    },
    confidence: "high",
  });

  it("medium → hard → easy (growth mindset: harder first)", () => {
    const sel = selectItems(ITEMS, 7, mkProfile("medium"));
    const firstNonMed = sel.findIndex((s) => s.difficulty !== "medium");
    expect(sel[firstNonMed].difficulty).toBe("hard");
  });

  it("hard → medium (easy unreachable — not adjacent to hard)", () => {
    const sel = selectItems(ITEMS, 100, mkProfile("hard"));
    expect(sel.length).toBe(8); // 3 hard + 5 medium
    expect(sel.some((s) => s.difficulty === "easy")).toBe(false);
  });

  it("easy → medium (hard unreachable — not adjacent to easy)", () => {
    const sel = selectItems(ITEMS, 100);
    expect(sel.length).toBe(11); // 6 easy + 5 medium
    expect(sel.some((s) => s.difficulty === "hard")).toBe(false);
  });

  it("medium reaches all 14 items (both easy and hard are adjacent)", () => {
    expect(selectItems(ITEMS, 100, mkProfile("medium")).length).toBe(14);
  });
});

describe("selectItems edge cases", () => {
  it("no duplicates across tiers", () => {
    const sel = selectItems(ITEMS, 11);
    expect(new Set(sel.map((s) => s.id)).size).toBe(11);
  });

  it("defaults to count=5", () => {
    expect(selectItems(ITEMS).length).toBe(5);
  });

  it("respects explicit profile, bypasses analyzeDifficulty", () => {
    const hardProfile: DifficultyProfile = {
      recommended: "hard",
      performance: { easy: { accuracy: NaN, attempts: 0, streak: 0 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 } },
      confidence: "new",
    };
    const sel = selectItems(ITEMS, 3, hardProfile);
    expect(sel.every((s) => s.difficulty === "hard")).toBe(true);
  });
});

describe("orphaned scores", () => {
  it("ignores scores for items not in the content catalog", () => {
    seed({
      "deleted-item": { correct: 100, incorrect: 0, lastSeen: Date.now() },
      e1: { correct: 1, incorrect: 0, lastSeen: Date.now() - 1000 },
    });
    const p = analyzeDifficulty(ITEMS);
    expect(p.performance.easy.attempts).toBe(1);
    expect(p.confidence).toBe("low");
  });
});
