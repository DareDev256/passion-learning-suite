import { describe, it, expect, beforeEach, vi } from "vitest";
import { analyzeDifficulty, selectItems, Difficulty } from "@/lib/difficulty";
import type { ContentItem } from "@/types/game";

// ─── localStorage mock ───
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; },
};
vi.stubGlobal("window", { localStorage: localStorageMock });
vi.stubGlobal("localStorage", localStorageMock);

// ─── Test fixtures ───
function makeItem(id: string, difficulty: Difficulty): ContentItem {
  return { id, prompt: id, answer: id, category: "test", difficulty };
}

const ITEMS: ContentItem[] = [
  makeItem("e1", "easy"), makeItem("e2", "easy"), makeItem("e3", "easy"),
  makeItem("e4", "easy"), makeItem("e5", "easy"), makeItem("e6", "easy"),
  makeItem("m1", "medium"), makeItem("m2", "medium"), makeItem("m3", "medium"),
  makeItem("m4", "medium"), makeItem("m5", "medium"),
  makeItem("h1", "hard"), makeItem("h2", "hard"), makeItem("h3", "hard"),
];

function seedScores(scores: Record<string, { correct: number; incorrect: number; lastSeen: number }>) {
  const progress = {
    xp: 0, level: 1, currentCategory: "", completedLevels: [],
    streak: 0, streakFreezes: 0, itemScores: scores,
  };
  store["passionate_learning_progress"] = JSON.stringify(progress);
}

beforeEach(() => {
  for (const k in store) delete store[k];
});

describe("analyzeDifficulty", () => {
  it("recommends easy for a brand-new player (no scores)", () => {
    const profile = analyzeDifficulty(ITEMS);
    expect(profile.recommended).toBe("easy");
    expect(profile.confidence).toBe("new");
  });

  it("recommends medium when easy accuracy >= 85%", () => {
    const now = Date.now();
    seedScores({
      e1: { correct: 5, incorrect: 0, lastSeen: now - 1000 },
      e2: { correct: 4, incorrect: 0, lastSeen: now - 2000 },
      e3: { correct: 3, incorrect: 0, lastSeen: now - 3000 },
      e4: { correct: 3, incorrect: 0, lastSeen: now - 4000 },
      e5: { correct: 3, incorrect: 0, lastSeen: now - 5000 },
    });
    const profile = analyzeDifficulty(ITEMS);
    expect(profile.recommended).toBe("medium");
  });

  it("stays easy when easy accuracy < 85%", () => {
    const now = Date.now();
    seedScores({
      e1: { correct: 2, incorrect: 3, lastSeen: now - 1000 },
      e2: { correct: 1, incorrect: 2, lastSeen: now - 2000 },
      e3: { correct: 3, incorrect: 2, lastSeen: now - 3000 },
    });
    const profile = analyzeDifficulty(ITEMS);
    expect(profile.recommended).toBe("easy");
  });

  it("recommends hard when medium accuracy >= 85%", () => {
    const now = Date.now();
    seedScores({
      m1: { correct: 5, incorrect: 0, lastSeen: now - 1000 },
      m2: { correct: 4, incorrect: 0, lastSeen: now - 2000 },
      m3: { correct: 4, incorrect: 1, lastSeen: now - 3000 },
      m4: { correct: 5, incorrect: 0, lastSeen: now - 4000 },
      m5: { correct: 3, incorrect: 0, lastSeen: now - 5000 },
    });
    const profile = analyzeDifficulty(ITEMS);
    expect(profile.recommended).toBe("hard");
  });

  it("demotes from medium to easy when accuracy < 50%", () => {
    const now = Date.now();
    seedScores({
      m1: { correct: 1, incorrect: 4, lastSeen: now - 1000 },
      m2: { correct: 0, incorrect: 3, lastSeen: now - 2000 },
      m3: { correct: 1, incorrect: 3, lastSeen: now - 3000 },
    });
    const profile = analyzeDifficulty(ITEMS);
    expect(profile.recommended).toBe("easy");
  });

  it("stays hard when hard accuracy >= 50%", () => {
    const now = Date.now();
    seedScores({
      h1: { correct: 3, incorrect: 2, lastSeen: now - 1000 },
      h2: { correct: 2, incorrect: 2, lastSeen: now - 2000 },
    });
    const profile = analyzeDifficulty(ITEMS);
    expect(profile.recommended).toBe("hard");
  });

  it("reports low confidence with fewer than 5 total attempts", () => {
    seedScores({
      e1: { correct: 2, incorrect: 0, lastSeen: Date.now() },
    });
    const profile = analyzeDifficulty(ITEMS);
    expect(profile.confidence).toBe("low");
  });

  it("reports high confidence with 5+ total attempts", () => {
    const now = Date.now();
    seedScores({
      e1: { correct: 1, incorrect: 0, lastSeen: now - 1000 },
      e2: { correct: 1, incorrect: 0, lastSeen: now - 2000 },
      e3: { correct: 1, incorrect: 0, lastSeen: now - 3000 },
      e4: { correct: 1, incorrect: 0, lastSeen: now - 4000 },
      e5: { correct: 1, incorrect: 0, lastSeen: now - 5000 },
    });
    const profile = analyzeDifficulty(ITEMS);
    expect(profile.confidence).toBe("high");
  });

  it("computes per-tier accuracy correctly", () => {
    seedScores({
      e1: { correct: 3, incorrect: 1, lastSeen: Date.now() },
      m1: { correct: 1, incorrect: 1, lastSeen: Date.now() },
    });
    const profile = analyzeDifficulty(ITEMS);
    expect(profile.performance.easy.accuracy).toBe(75);  // 3/4
    expect(profile.performance.medium.accuracy).toBe(50); // 1/2
    expect(isNaN(profile.performance.hard.accuracy)).toBe(true);
  });
});

describe("selectItems", () => {
  it("returns items at the recommended difficulty", () => {
    const selected = selectItems(ITEMS, 3);
    // New player → easy recommended
    expect(selected.every((item) => item.difficulty === "easy")).toBe(true);
    expect(selected.length).toBe(3);
  });

  it("falls back to adjacent tiers when recommended tier is exhausted", () => {
    // Request more easy items than exist → should include medium
    const selected = selectItems(ITEMS, 8);
    expect(selected.length).toBe(8);
    const diffs = new Set(selected.map((s) => s.difficulty));
    expect(diffs.has("easy")).toBe(true);
    expect(diffs.has("medium")).toBe(true);
  });

  it("prioritizes unseen items over seen items", () => {
    const now = Date.now();
    // Mix of correct and incorrect so easy accuracy stays below promote threshold
    seedScores({
      e1: { correct: 2, incorrect: 1, lastSeen: now },
      e2: { correct: 2, incorrect: 1, lastSeen: now },
    });
    const selected = selectItems(ITEMS, 3);
    // e3-e6 are unseen and should be picked before already-seen e1/e2
    const ids = selected.map((s) => s.id);
    expect(ids.includes("e1")).toBe(false);
    expect(ids.includes("e2")).toBe(false);
  });

  it("respects count limit", () => {
    const selected = selectItems(ITEMS, 2);
    expect(selected.length).toBe(2);
  });

  it("handles empty catalog gracefully", () => {
    const selected = selectItems([], 5);
    expect(selected).toEqual([]);
  });
});
