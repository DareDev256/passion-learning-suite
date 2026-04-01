// ─── Passionate Learning — Daily Challenge Engine ───
// Generates a deterministic daily challenge from the content pool.
// Same date = same seed = same challenge for all players.
// Drives daily engagement via bonus XP and streak synergy.

import { ContentItem } from "@/types/game";
import { getProgress } from "@/lib/storage";

export interface DailyChallenge {
  date: string;               // YYYY-MM-DD
  items: ContentItem[];       // 5 curated items for today
  bonusMultiplier: number;    // 1.5× base, +0.5× per 5 streak days (max 3×)
  category: string;           // focus category for today
  expiresAt: number;          // midnight UTC timestamp
  seed: number;               // deterministic seed for reproducibility
}

export interface DailyChallengeResult {
  date: string;
  completed: boolean;
  accuracy: number;           // 0-100
  bonusXP: number;
  timeTaken: number;          // seconds
}

// ─── Deterministic Hashing ───
// djb2 variant — fast, good distribution, zero dependencies

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Seeded PRNG (mulberry32) — returns 0-1 float, advances state. */
function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Get today's date as YYYY-MM-DD in local timezone. */
export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get midnight tonight (local) as a UTC timestamp. */
function getMidnightTimestamp(): number {
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  return tomorrow.getTime();
}

/**
 * Build today's daily challenge from the content catalog.
 * Uses date-seeded PRNG so every player gets the same items.
 * Category rotates daily across available categories.
 *
 * @param items - Full content catalog
 * @param challengeSize - Items per challenge (default 5)
 */
export function generateDailyChallenge(
  items: ContentItem[],
  challengeSize = 5,
): DailyChallenge {
  const dateKey = getTodayKey();
  const seed = hashString(`passionate-daily-${dateKey}`);
  const rng = seededRandom(seed);

  // Rotate focus category based on day
  const categories = [...new Set(items.map((i) => i.category))].sort();
  const dayIndex = Math.floor(seed / 100) % Math.max(categories.length, 1);
  const focusCategory = categories[dayIndex] ?? "";

  // Prioritize focus category, then fill from others
  const focusItems = items.filter((i) => i.category === focusCategory);
  const otherItems = items.filter((i) => i.category !== focusCategory);

  // Shuffle using seeded PRNG (Fisher-Yates)
  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shuffledFocus = shuffle(focusItems);
  const shuffledOther = shuffle(otherItems);

  // Pick: 3 from focus category, 2 from others (or fill from whatever's available)
  const focusPick = Math.min(3, shuffledFocus.length, challengeSize);
  const selected = [
    ...shuffledFocus.slice(0, focusPick),
    ...shuffledOther.slice(0, challengeSize - focusPick),
  ].slice(0, challengeSize);

  // Bonus multiplier scales with streak
  const progress = getProgress();
  const streakBonus = Math.floor(progress.streak / 5) * 0.5;
  const bonusMultiplier = Math.min(3, 1.5 + streakBonus);

  return {
    date: dateKey,
    items: selected,
    bonusMultiplier,
    category: focusCategory,
    expiresAt: getMidnightTimestamp(),
    seed,
  };
}

/**
 * Calculate bonus XP earned from a daily challenge result.
 * Base: 10 XP per correct answer × bonusMultiplier.
 * Perfect accuracy grants an extra 25 XP flat bonus.
 */
export function calculateDailyBonusXP(
  correctCount: number,
  totalCount: number,
  bonusMultiplier: number,
): number {
  const baseXP = correctCount * 10;
  const multiplied = Math.round(baseXP * bonusMultiplier);
  const perfectBonus = correctCount === totalCount && totalCount > 0 ? 25 : 0;
  return multiplied + perfectBonus;
}

// ─── localStorage persistence for daily challenge state ───

const DAILY_KEY = "passionate_daily_result";

/** Check if today's daily challenge has been completed. */
export function isDailyChallengeComplete(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(DAILY_KEY);
    if (!stored) return false;
    const result: DailyChallengeResult = JSON.parse(stored);
    return result.date === getTodayKey() && result.completed;
  } catch {
    return false;
  }
}

/** Save today's daily challenge result. */
export function saveDailyChallengeResult(result: DailyChallengeResult): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_KEY, JSON.stringify(result));
}

/** Load today's result if it exists, null otherwise. */
export function getDailyChallengeResult(): DailyChallengeResult | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(DAILY_KEY);
    if (!stored) return null;
    const result: DailyChallengeResult = JSON.parse(stored);
    if (result.date !== getTodayKey()) return null;
    return result;
  } catch {
    return null;
  }
}

/**
 * Time remaining until today's challenge expires, formatted as "Xh Ym".
 * Returns "Expired" if past midnight.
 */
export function timeUntilExpiry(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
