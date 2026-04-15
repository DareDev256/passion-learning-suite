import { describe, it, expect } from "vitest";
import {
  allocateSlots,
  classifyReviewReason,
  sortByWeakPriority,
  countByReason,
  findDominantReason,
  estimateDuration,
  MS_PER_DAY,
  RECALL_BONUS_THRESHOLD_DAYS,
  WEAK_CATEGORY_THRESHOLD,
} from "@/lib/autoSelectCore";
import type { ContentItem, ItemScore } from "@/types/game";
import type { SessionItem, SessionItemReason } from "@/lib/sessionPlanner";

// ── Helpers ──

const item = (id: string, cat = "grammar"): ContentItem => ({
  id,
  prompt: `Q: ${id}`,
  answer: `A: ${id}`,
  category: cat,
  difficulty: "medium",
});

const score = (lastSeen: number): ItemScore =>
  ({ lastSeen, attempts: 1, correct: 1 }) as ItemScore;

const sessionItem = (id: string, reason: SessionItemReason): SessionItem =>
  ({ item: item(id), reason }) as SessionItem;

// ─── Constants ───────────────────────────────────────

describe("autoSelectCore constants", () => {
  it("MS_PER_DAY equals 86 400 000", () => {
    expect(MS_PER_DAY).toBe(86_400_000);
  });

  it("RECALL_BONUS_THRESHOLD_DAYS equals 7", () => {
    expect(RECALL_BONUS_THRESHOLD_DAYS).toBe(7);
  });

  it("WEAK_CATEGORY_THRESHOLD equals 70", () => {
    expect(WEAK_CATEGORY_THRESHOLD).toBe(70);
  });
});

// ─── allocateSlots ───────────────────────────────────

describe("allocateSlots", () => {
  it("carves review slots first, weak from remainder", () => {
    // 10 items, 40% review, 30% weak boost
    const s = allocateSlots(10, 0.4, 0.3);
    expect(s.reviewSlots).toBe(4);
    expect(s.newSlots).toBe(6); // 10 - 4
    expect(s.weakSlots).toBe(1); // floor(6 * 0.3) = 1
  });

  it("returns all zeros for sessionSize 0", () => {
    const s = allocateSlots(0, 0.5, 0.5);
    expect(s).toEqual({ reviewSlots: 0, newSlots: 0, weakSlots: 0 });
  });

  it("floors fractional review slots — no partial items", () => {
    // 7 * 0.3 = 2.1 → floor = 2
    const s = allocateSlots(7, 0.3, 0);
    expect(s.reviewSlots).toBe(2);
    expect(s.newSlots).toBe(5);
  });

  it("reviewRatio 1.0 gives all slots to review, zero to new", () => {
    const s = allocateSlots(5, 1.0, 0.5);
    expect(s.reviewSlots).toBe(5);
    expect(s.newSlots).toBe(0);
    expect(s.weakSlots).toBe(0); // floor(0 * 0.5) = 0
  });

  it("reviewRatio 0 gives all slots to new content", () => {
    const s = allocateSlots(8, 0, 0.25);
    expect(s.reviewSlots).toBe(0);
    expect(s.newSlots).toBe(8);
    expect(s.weakSlots).toBe(2); // floor(8 * 0.25) = 2
  });

  it("weakCategoryBoost 1.0 converts all new slots to weak", () => {
    const s = allocateSlots(10, 0.5, 1.0);
    expect(s.weakSlots).toBe(s.newSlots); // all remaining go to weak
  });
});

// ─── classifyReviewReason ────────────────────────────

describe("classifyReviewReason", () => {
  const now = 1_700_000_000_000; // fixed timestamp

  it("returns recall-bonus when FSRS review was 7+ days ago", () => {
    const sevenDaysAgo = now - 7 * MS_PER_DAY;
    expect(classifyReviewReason(sevenDaysAgo, 0, now)).toBe("recall-bonus");
  });

  it("returns review when FSRS review was under 7 days ago", () => {
    const sixDaysAgo = now - 6.99 * MS_PER_DAY;
    expect(classifyReviewReason(sixDaysAgo, 0, now)).toBe("review");
  });

  it("exact 7-day boundary returns recall-bonus (>= threshold)", () => {
    const exactSeven = now - 7 * MS_PER_DAY;
    expect(classifyReviewReason(exactSeven, 0, now)).toBe("recall-bonus");
  });

  it("FSRS timestamp takes precedence over scoreLastSeen", () => {
    const fsrs = now - 3 * MS_PER_DAY; // 3 days (review)
    const score = now - 10 * MS_PER_DAY; // 10 days (would be recall-bonus)
    // FSRS wins → review
    expect(classifyReviewReason(fsrs, score, now)).toBe("review");
  });

  it("falls through to scoreLastSeen when FSRS is 0", () => {
    const scoreTen = now - 10 * MS_PER_DAY;
    expect(classifyReviewReason(0, scoreTen, now)).toBe("recall-bonus");
  });

  it("both timestamps 0 → daysSince 0 → review", () => {
    expect(classifyReviewReason(0, 0, now)).toBe("review");
  });

  it("very old review (365 days) returns recall-bonus", () => {
    const yearAgo = now - 365 * MS_PER_DAY;
    expect(classifyReviewReason(yearAgo, 0, now)).toBe("recall-bonus");
  });
});

// ─── sortByWeakPriority ──────────────────────────────

describe("sortByWeakPriority", () => {
  it("unseen items sort before seen items", () => {
    const items = [item("seen"), item("unseen")];
    const scores: Record<string, ItemScore> = {
      seen: score(1000),
    };
    const sorted = sortByWeakPriority(items, scores);
    expect(sorted[0].id).toBe("unseen");
    expect(sorted[1].id).toBe("seen");
  });

  it("among seen items, oldest-seen comes first", () => {
    const items = [item("recent"), item("old"), item("middle")];
    const scores: Record<string, ItemScore> = {
      recent: score(3000),
      old: score(1000),
      middle: score(2000),
    };
    const sorted = sortByWeakPriority(items, scores);
    expect(sorted.map((i) => i.id)).toEqual(["old", "middle", "recent"]);
  });

  it("two unseen items preserve original order (stable sort)", () => {
    const items = [item("a"), item("b"), item("c")];
    const scores: Record<string, ItemScore> = {}; // all unseen
    const sorted = sortByWeakPriority(items, scores);
    expect(sorted.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("empty items array returns empty array", () => {
    expect(sortByWeakPriority([], {})).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const items = [item("b"), item("a")];
    const original = [...items];
    sortByWeakPriority(items, { a: score(100) });
    expect(items.map((i) => i.id)).toEqual(original.map((i) => i.id));
  });
});

// ─── countByReason ───────────────────────────────────

describe("countByReason", () => {
  it("tallies mixed reasons correctly", () => {
    const items = [
      sessionItem("a", "review"),
      sessionItem("b", "new"),
      sessionItem("c", "review"),
      sessionItem("d", "weak-category"),
      sessionItem("e", "recall-bonus"),
    ];
    expect(countByReason(items)).toEqual({
      review: 2,
      new: 1,
      "weak-category": 1,
      "recall-bonus": 1,
    });
  });

  it("empty array returns all zeros", () => {
    expect(countByReason([])).toEqual({
      review: 0,
      new: 0,
      "weak-category": 0,
      "recall-bonus": 0,
    });
  });

  it("single-reason session counts correctly", () => {
    const items = [
      sessionItem("a", "new"),
      sessionItem("b", "new"),
      sessionItem("c", "new"),
    ];
    const counts = countByReason(items);
    expect(counts.new).toBe(3);
    expect(counts.review).toBe(0);
  });
});

// ─── findDominantReason ──────────────────────────────

describe("findDominantReason", () => {
  it("returns the reason with the highest count", () => {
    expect(
      findDominantReason({ review: 5, new: 2, "weak-category": 1, "recall-bonus": 0 }),
    ).toBe("review");
  });

  it("new content dominance detected correctly", () => {
    expect(
      findDominantReason({ review: 0, new: 8, "weak-category": 0, "recall-bonus": 0 }),
    ).toBe("new");
  });

  it("tied counts return a deterministic winner", () => {
    const result = findDominantReason({
      review: 3,
      new: 3,
      "weak-category": 3,
      "recall-bonus": 3,
    });
    // All tied — sort is stable, so first in object-entry order wins
    expect(["review", "new", "weak-category", "recall-bonus"]).toContain(result);
    // Verify determinism: same input always produces same output
    const result2 = findDominantReason({
      review: 3,
      new: 3,
      "weak-category": 3,
      "recall-bonus": 3,
    });
    expect(result).toBe(result2);
  });

  it("all-zero counts still returns a valid reason", () => {
    const result = findDominantReason({
      review: 0,
      new: 0,
      "weak-category": 0,
      "recall-bonus": 0,
    });
    expect(["review", "new", "weak-category", "recall-bonus"]).toContain(result);
  });

  it("single non-zero reason wins", () => {
    expect(
      findDominantReason({ review: 0, new: 0, "weak-category": 1, "recall-bonus": 0 }),
    ).toBe("weak-category");
  });
});

// ─── estimateDuration ────────────────────────────────

describe("estimateDuration", () => {
  it("rounds up fractional minutes", () => {
    // 3 * 1.5 = 4.5 → ceil → 5
    expect(estimateDuration(3, 1.5)).toBe(5);
  });

  it("exact whole number stays unchanged", () => {
    expect(estimateDuration(4, 2)).toBe(8);
  });

  it("zero items returns 0 minutes", () => {
    expect(estimateDuration(0, 2.5)).toBe(0);
  });

  it("zero minutesPerItem returns 0", () => {
    expect(estimateDuration(10, 0)).toBe(0);
  });

  it("single item with sub-minute time rounds up to 1", () => {
    // 1 * 0.3 = 0.3 → ceil → 1
    expect(estimateDuration(1, 0.3)).toBe(1);
  });

  it("large session calculates correctly", () => {
    // 50 * 1.2 = 60
    expect(estimateDuration(50, 1.2)).toBe(60);
  });
});
