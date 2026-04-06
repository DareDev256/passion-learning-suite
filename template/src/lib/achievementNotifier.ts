// ─── Passionate Learning — Achievement Notification Service ───
// Bridges achievement unlocks → display. Manages a FIFO queue so multiple
// simultaneous unlocks show one-at-a-time with sound. Pure push/consume API.
// Extracted from AchievementManager to separate check logic from presentation.

import type { Achievement } from "@/lib/achievements";
import { playAchievement } from "@/lib/soundEngine";

export interface QueuedNotification {
  achievement: Achievement;
  queuedAt: number;
}

type Subscriber = (notification: QueuedNotification | null) => void;

const queue: QueuedNotification[] = [];
const subscribers = new Set<Subscriber>();
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

const AUTO_DISMISS_MS = 4000;

function notify(): void {
  const current = queue[0] ?? null;
  for (const fn of subscribers) fn(current);
}

/**
 * Push one or more newly unlocked achievements into the notification queue.
 * Plays the achievement sound for the first entry if the queue was empty.
 */
export function enqueue(achievements: Achievement[]): void {
  if (achievements.length === 0) return;
  const now = Date.now();
  for (const a of achievements) {
    queue.push({ achievement: a, queuedAt: now });
  }
  // Only kick off display + sound if this is a fresh batch (nothing was showing)
  if (queue.length === achievements.length) {
    playAchievement();
    scheduleAutoDismiss();
  }
  notify();
}

/**
 * Dismiss the current notification. Advances to the next queued achievement
 * (with sound), or clears if the queue is empty.
 */
export function dismiss(): void {
  clearAutoDismiss();
  queue.shift();
  if (queue.length > 0) {
    playAchievement();
    scheduleAutoDismiss();
  }
  notify();
}

/** Peek at the current (front-of-queue) notification, or null if idle. */
export function peek(): QueuedNotification | null {
  return queue[0] ?? null;
}

/** Number of notifications waiting (including the one currently displayed). */
export function pending(): number {
  return queue.length;
}

/** Flush the entire queue and notify subscribers. */
export function clear(): void {
  clearAutoDismiss();
  queue.length = 0;
  notify();
}

/** Subscribe to queue changes. Returns an unsubscribe function. */
export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

// ─── Internal ───

function scheduleAutoDismiss(): void {
  clearAutoDismiss();
  autoDismissTimer = setTimeout(dismiss, AUTO_DISMISS_MS);
}

function clearAutoDismiss(): void {
  if (autoDismissTimer !== null) {
    clearTimeout(autoDismissTimer);
    autoDismissTimer = null;
  }
}
