import { describe, it, expect, beforeEach, vi } from "vitest";
import { analyzeDifficulty, selectItems, type Difficulty, type DifficultyProfile } from "@/lib/difficulty";
import { updateItemScore } from "@/lib/storage";
import { items, getItemsByLevel } from "@/data/curriculum";
import type { ContentItem, Enrichment } from "@/types/game";

// ─── localStorage mock ───
const store: Record<string, string> = {};
const ls = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
};
vi.stubGlobal("window", { localStorage: ls });
vi.stubGlobal("localStorage", ls);

beforeEach(() => { for (const k in store) delete store[k]; });

// ─── Enrichment data integrity ───
describe("enrichment field validation", () => {
  it("every item with enrichment has required whyItMatters and realWorldExample", () => {
    const enriched = items.filter((i) => i.enrichment);
    expect(enriched.length).toBeGreaterThan(0); // at least some items have enrichment
    for (const item of enriched) {
      const e = item.enrichment as Enrichment;
      expect(e.whyItMatters).toBeDefined();
      expect(typeof e.whyItMatters).toBe("string");
      expect(e.whyItMatters.length).toBeGreaterThan(0);
      expect(e.realWorldExample).toBeDefined();
      expect(typeof e.realWorldExample).toBe("string");
      expect(e.realWorldExample.length).toBeGreaterThan(0);
    }
  });

  it("proTip is optional but a non-empty string when present", () => {
    for (const item of items) {
      if (item.enrichment?.proTip !== undefined) {
        expect(typeof item.enrichment.proTip).toBe("string");
        expect(item.enrichment.proTip.length).toBeGreaterThan(0);
      }
    }
  });

  it("enrichment-less items still work in difficulty analysis", () => {
    const bare: ContentItem[] = [
      { id: "bare-1", prompt: "q", answer: "a", category: "test", difficulty: "easy" },
      { id: "bare-2", prompt: "q", answer: "a", category: "test", difficulty: "medium" },
    ];
    // Should not throw when enrichment is undefined
    const profile = analyzeDifficulty(bare);
    expect(profile.recommended).toBe("easy");
  });
});

// ─── selectItems oldest-seen ordering ───
describe("selectItems oldest-seen prioritization", () => {
  const mk = (id: string, d: Difficulty): ContentItem =>
    ({ id, prompt: id, answer: id, category: "t", difficulty: d });

  const pool: ContentItem[] = [
    mk("e1", "easy"), mk("e2", "easy"), mk("e3", "easy"),
    mk("e4", "easy"), mk("e5", "easy"),
  ];

  it("picks oldest-seen items before recently-seen items (same tier)", () => {
    const now = Date.now();
    // Score all items but with different lastSeen times
    const progress = {
      xp: 0, level: 1, currentCategory: "", completedLevels: [],
      streak: 0, streakFreezes: 0,
      itemScores: {
        e1: { correct: 1, incorrect: 1, lastSeen: now - 5000 }, // oldest
        e2: { correct: 1, incorrect: 1, lastSeen: now - 1000 }, // newest
        e3: { correct: 1, incorrect: 1, lastSeen: now - 4000 },
        e4: { correct: 1, incorrect: 1, lastSeen: now - 3000 },
        e5: { correct: 1, incorrect: 1, lastSeen: now - 2000 },
      },
    };
    store["passionate_learning_progress"] = JSON.stringify(progress);

    // Force easy recommendation via explicit profile
    const profile: DifficultyProfile = {
      recommended: "easy",
      performance: {
        easy: { accuracy: 50, attempts: 5, streak: 0 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
      confidence: "high",
    };

    const selected = selectItems(pool, 5, profile);
    const ids = selected.map((s) => s.id);
    // e1 (oldest, lastSeen=now-5000) should come before e2 (newest, lastSeen=now-1000)
    expect(ids.indexOf("e1")).toBeLessThan(ids.indexOf("e2"));
  });

  it("unseen items always rank before any seen item", () => {
    const now = Date.now();
    store["passionate_learning_progress"] = JSON.stringify({
      xp: 0, level: 1, currentCategory: "", completedLevels: [],
      streak: 0, streakFreezes: 0,
      itemScores: {
        e1: { correct: 1, incorrect: 0, lastSeen: now - 99999 }, // seen long ago
        e2: { correct: 1, incorrect: 0, lastSeen: now },          // seen just now
        // e3, e4, e5 are unseen
      },
    });

    const profile: DifficultyProfile = {
      recommended: "easy",
      performance: {
        easy: { accuracy: 70, attempts: 2, streak: 0 },
        medium: { accuracy: NaN, attempts: 0, streak: 0 },
        hard: { accuracy: NaN, attempts: 0, streak: 0 },
      },
      confidence: "low",
    };

    const selected = selectItems(pool, 5, profile);
    const ids = selected.map((s) => s.id);
    // Unseen items (e3, e4, e5) have rank 0, seen items have rank > 0
    // So unseen should come first in the sorted order
    const unseenPositions = ["e3", "e4", "e5"].map((id) => ids.indexOf(id));
    const seenPositions = ["e1", "e2"].map((id) => ids.indexOf(id));
    expect(Math.max(...unseenPositions)).toBeLessThan(Math.min(...seenPositions));
  });
});

// ─── Cross-module integration: score → difficulty → selection ───
describe("storage → difficulty engine integration", () => {
  const mk = (id: string, d: Difficulty): ContentItem =>
    ({ id, prompt: id, answer: id, category: "t", difficulty: d });

  const catalog: ContentItem[] = [
    mk("e1", "easy"), mk("e2", "easy"), mk("e3", "easy"),
    mk("e4", "easy"), mk("e5", "easy"), mk("e6", "easy"),
    mk("m1", "medium"), mk("m2", "medium"), mk("m3", "medium"),
    mk("h1", "hard"), mk("h2", "hard"),
  ];

  it("scoring all easy items correctly promotes selection to medium tier", () => {
    // Simulate a player acing 5 easy items via the real storage API
    for (const id of ["e1", "e2", "e3", "e4", "e5"]) {
      for (let i = 0; i < 5; i++) updateItemScore(id, true);
    }
    const profile = analyzeDifficulty(catalog);
    expect(profile.recommended).toBe("medium");
    expect(profile.performance.easy.accuracy).toBe(100);

    const selected = selectItems(catalog, 3, profile);
    expect(selected.every((s) => s.difficulty === "medium")).toBe(true);
  });

  it("mixed performance across tiers reflects in confidence level", () => {
    updateItemScore("e1", true);
    updateItemScore("m1", false);
    const profile = analyzeDifficulty(catalog);
    // 2 total attempts (1 correct + 1 incorrect counted as separate per-tier)
    expect(profile.confidence).toBe("low");
  });

  it("getItemsByLevel returns items that analyzeDifficulty can consume", () => {
    // Verify the curriculum helper output is compatible with the difficulty engine
    const levelItems = getItemsByLevel("getting-started", 1);
    // Should not throw, even with real curriculum data
    const profile = analyzeDifficulty(levelItems);
    expect(["easy", "medium", "hard"]).toContain(profile.recommended);
    expect(["new", "low", "high"]).toContain(profile.confidence);
  });
});
