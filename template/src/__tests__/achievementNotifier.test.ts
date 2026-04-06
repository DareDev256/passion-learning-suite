import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enqueue,
  dismiss,
  peek,
  pending,
  clear,
  subscribe,
} from "@/lib/achievementNotifier";
import type { Achievement } from "@/lib/achievements";

// Mock sound engine — we verify it's called, not that audio plays
vi.mock("@/lib/soundEngine", () => ({
  playAchievement: vi.fn(),
}));
import { playAchievement } from "@/lib/soundEngine";
const mockPlay = vi.mocked(playAchievement);

const bronze: Achievement = { id: "first_step", title: "FIRST STEP", description: "Complete your first level", icon: "🚀", tier: "bronze" };
const silver: Achievement = { id: "perfect", title: "FLAWLESS", description: "100% accuracy in a session", icon: "💎", tier: "silver" };
const gold: Achievement = { id: "recall_ace", title: "RECALL ACE", description: "90%+ retention at 7 days", icon: "🎯", tier: "gold" };

beforeEach(() => {
  vi.useFakeTimers();
  clear();
  mockPlay.mockClear();
});

describe("enqueue", () => {
  it("ignores empty arrays", () => {
    enqueue([]);
    expect(peek()).toBeNull();
    expect(pending()).toBe(0);
  });

  it("queues a single achievement and plays sound", () => {
    enqueue([bronze]);
    expect(peek()?.achievement).toBe(bronze);
    expect(pending()).toBe(1);
    expect(mockPlay).toHaveBeenCalledOnce();
  });

  it("queues multiple achievements, plays sound once", () => {
    enqueue([bronze, silver, gold]);
    expect(peek()?.achievement).toBe(bronze);
    expect(pending()).toBe(3);
    expect(mockPlay).toHaveBeenCalledOnce();
  });

  it("does not replay sound when adding to non-empty queue", () => {
    enqueue([bronze]);
    mockPlay.mockClear();
    enqueue([silver]);
    expect(pending()).toBe(2);
    expect(mockPlay).not.toHaveBeenCalled();
  });
});

describe("dismiss", () => {
  it("advances to next queued achievement with sound", () => {
    enqueue([bronze, silver]);
    mockPlay.mockClear();
    dismiss();
    expect(peek()?.achievement).toBe(silver);
    expect(pending()).toBe(1);
    expect(mockPlay).toHaveBeenCalledOnce();
  });

  it("clears when last item dismissed", () => {
    enqueue([bronze]);
    dismiss();
    expect(peek()).toBeNull();
    expect(pending()).toBe(0);
  });

  it("is safe to call on empty queue", () => {
    expect(() => dismiss()).not.toThrow();
    expect(peek()).toBeNull();
  });
});

describe("auto-dismiss", () => {
  it("auto-dismisses after 4 seconds", () => {
    enqueue([bronze, silver]);
    vi.advanceTimersByTime(4000);
    expect(peek()?.achievement).toBe(silver);
  });

  it("chains auto-dismiss through entire queue", () => {
    enqueue([bronze, silver, gold]);
    vi.advanceTimersByTime(4000); // dismiss bronze
    vi.advanceTimersByTime(4000); // dismiss silver
    vi.advanceTimersByTime(4000); // dismiss gold
    expect(peek()).toBeNull();
    expect(pending()).toBe(0);
  });
});

describe("subscribe", () => {
  it("notifies on enqueue", () => {
    const spy = vi.fn();
    subscribe(spy);
    enqueue([bronze]);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ achievement: bronze }));
  });

  it("notifies with null when queue empties", () => {
    const spy = vi.fn();
    subscribe(spy);
    enqueue([bronze]);
    dismiss();
    expect(spy).toHaveBeenLastCalledWith(null);
  });

  it("unsubscribe stops notifications", () => {
    const spy = vi.fn();
    const unsub = subscribe(spy);
    unsub();
    enqueue([bronze]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("clear", () => {
  it("flushes entire queue", () => {
    enqueue([bronze, silver, gold]);
    clear();
    expect(peek()).toBeNull();
    expect(pending()).toBe(0);
  });

  it("notifies subscribers with null", () => {
    const spy = vi.fn();
    subscribe(spy);
    enqueue([bronze]);
    spy.mockClear();
    clear();
    expect(spy).toHaveBeenCalledWith(null);
  });
});
