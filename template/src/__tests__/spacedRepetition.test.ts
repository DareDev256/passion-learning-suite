import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  inferGrade,
  gradeItem,
  getReviewQueue,
  computeMemoryStrength,
} from "@/lib/spacedRepetition";

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

function seedFSRSCards(cards: Array<{ itemId: string; due: number; stability: number; difficulty: number; reps: number; lapses: number; lastReview: number }>) {
  store["passionate_learning_fsrs_cards"] = JSON.stringify(cards);
}

beforeEach(() => {
  for (const k in store) delete store[k];
});

// ─── inferGrade ───
describe("inferGrade", () => {
  it("returns 'again' for incorrect answers", () => {
    expect(inferGrade(false)).toBe("again");
    expect(inferGrade(false, 1.0)).toBe("again");
  });

  it("returns 'hard' for correct but low confidence", () => {
    expect(inferGrade(true, 0.3)).toBe("hard");
    expect(inferGrade(true, 0.49)).toBe("hard");
  });

  it("returns 'good' for correct with normal confidence", () => {
    expect(inferGrade(true, 0.5)).toBe("good");
    expect(inferGrade(true, 0.7)).toBe("good");
    expect(inferGrade(true, 0.89)).toBe("good");
  });

  it("returns 'easy' for correct with high confidence", () => {
    expect(inferGrade(true, 0.9)).toBe("easy");
    expect(inferGrade(true, 1.0)).toBe("easy");
  });

  it("defaults to 'good' when confidence omitted", () => {
    expect(inferGrade(true)).toBe("good");
  });
});

// ─── gradeItem ───
describe("gradeItem", () => {
  it("creates a new card and schedules first review", () => {
    const result = gradeItem("item-001", "good");
    expect(result.itemId).toBe("item-001");
    expect(result.grade).toBe("good");
    expect(result.nextDue).toBeGreaterThan(Date.now() - 1000);
    expect(result.stability).toBeGreaterThan(0);
    expect(result.difficulty).toBeGreaterThan(0);
  });

  it("persists the card to storage", () => {
    gradeItem("item-002", "easy");
    const stored = JSON.parse(store["passionate_learning_fsrs_cards"] ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].itemId).toBe("item-002");
  });

  it("updates existing card on subsequent grades", () => {
    gradeItem("item-003", "good");
    const first = JSON.parse(store["passionate_learning_fsrs_cards"])[0];
    gradeItem("item-003", "easy");
    const second = JSON.parse(store["passionate_learning_fsrs_cards"])[0];
    expect(second.reps).toBeGreaterThan(first.reps);
  });

  it("schedules shorter interval for 'again' than 'easy'", () => {
    const again = gradeItem("fail-item", "again");
    // Reset for clean comparison
    for (const k in store) delete store[k];
    const easy = gradeItem("easy-item", "easy");
    expect(easy.nextDue).toBeGreaterThanOrEqual(again.nextDue);
  });

  it("returns valid difficulty in 0-10 range", () => {
    const result = gradeItem("diff-test", "good");
    expect(result.difficulty).toBeGreaterThanOrEqual(0);
    expect(result.difficulty).toBeLessThanOrEqual(10);
  });
});

// ─── getReviewQueue ───
describe("getReviewQueue", () => {
  it("returns empty queue when no cards exist", () => {
    const queue = getReviewQueue();
    expect(queue.due).toEqual([]);
    expect(queue.upcoming).toEqual([]);
    expect(queue.totalCards).toBe(0);
    expect(queue.nextReviewAt).toBeNull();
  });

  it("includes overdue items in due queue", () => {
    const pastDue = Date.now() - 86_400_000; // 1 day ago
    seedFSRSCards([
      { itemId: "overdue-1", due: pastDue, stability: 5, difficulty: 0.5, reps: 2, lapses: 0, lastReview: pastDue - 86_400_000 },
      { itemId: "overdue-2", due: pastDue - 3600000, stability: 3, difficulty: 0.6, reps: 1, lapses: 1, lastReview: pastDue - 172_800_000 },
    ]);
    const queue = getReviewQueue();
    expect(queue.due).toHaveLength(2);
    expect(queue.totalCards).toBe(2);
  });

  it("sorts due items most overdue first", () => {
    const now = Date.now();
    seedFSRSCards([
      { itemId: "recent", due: now - 1000, stability: 5, difficulty: 0.5, reps: 1, lapses: 0, lastReview: now - 86_400_000 },
      { itemId: "oldest", due: now - 86_400_000, stability: 3, difficulty: 0.5, reps: 1, lapses: 0, lastReview: now - 172_800_000 },
    ]);
    const queue = getReviewQueue();
    expect(queue.due[0]).toBe("oldest");
  });

  it("puts items due within 24h in upcoming", () => {
    const inTwelveHours = Date.now() + 43_200_000;
    seedFSRSCards([
      { itemId: "soon", due: inTwelveHours, stability: 10, difficulty: 0.4, reps: 3, lapses: 0, lastReview: Date.now() - 86_400_000 },
    ]);
    const queue = getReviewQueue();
    expect(queue.due).toHaveLength(0);
    expect(queue.upcoming).toEqual(["soon"]);
    expect(queue.nextReviewAt).toBe(inTwelveHours);
  });

  it("respects the limit parameter", () => {
    const past = Date.now() - 1000;
    seedFSRSCards(
      Array.from({ length: 20 }, (_, i) => ({
        itemId: `item-${i}`, due: past - i * 1000, stability: 5, difficulty: 0.5, reps: 1, lapses: 0, lastReview: past - 86_400_000,
      }))
    );
    const queue = getReviewQueue(3);
    expect(queue.due).toHaveLength(3);
    expect(queue.totalCards).toBe(20);
  });
});

// ─── computeMemoryStrength ───
describe("computeMemoryStrength", () => {
  it("returns 0 when no cards tracked", () => {
    expect(computeMemoryStrength()).toBe(0);
  });

  it("returns score proportional to average stability", () => {
    seedFSRSCards([
      { itemId: "a", due: Date.now(), stability: 365, difficulty: 0.5, reps: 10, lapses: 0, lastReview: Date.now() },
    ]);
    expect(computeMemoryStrength()).toBe(100);
  });

  it("caps at 100 for very high stability", () => {
    seedFSRSCards([
      { itemId: "a", due: Date.now(), stability: 1000, difficulty: 0.5, reps: 20, lapses: 0, lastReview: Date.now() },
    ]);
    expect(computeMemoryStrength()).toBe(100);
  });

  it("averages across all cards", () => {
    seedFSRSCards([
      { itemId: "a", due: Date.now(), stability: 365, difficulty: 0.5, reps: 10, lapses: 0, lastReview: Date.now() },
      { itemId: "b", due: Date.now(), stability: 0, difficulty: 0.5, reps: 1, lapses: 1, lastReview: Date.now() },
    ]);
    // Average stability = 182.5, score = round(182.5/365*100) = 50
    expect(computeMemoryStrength()).toBe(50);
  });
});
