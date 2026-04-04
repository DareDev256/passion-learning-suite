// ─── Passionate Learning — Achievement System ───
// Duolingo-inspired variable reward schedule. Achievements unlock for behaviors
// we want to reinforce: reviewing, streaking, exploring weak areas, retention.
// Pure functions over localStorage. SSR-safe.

import { UserProgress } from "@/types/game";
import { getLearningAnalytics } from "@/lib/storage";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold";
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

const STORAGE_KEY = "pl_achievements";

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_step", title: "FIRST STEP", description: "Complete your first level", icon: "🚀", tier: "bronze" },
  { id: "streak_3", title: "ON FIRE", description: "Reach a 3-day streak", icon: "🔥", tier: "bronze" },
  { id: "streak_7", title: "UNSTOPPABLE", description: "Reach a 7-day streak", icon: "⚡", tier: "silver" },
  { id: "streak_30", title: "LEGENDARY", description: "Reach a 30-day streak", icon: "👑", tier: "gold" },
  { id: "perfect", title: "FLAWLESS", description: "100% accuracy in a session", icon: "💎", tier: "silver" },
  { id: "ten_mastered", title: "BRAIN UPGRADE", description: "Master 10 items", icon: "🧠", tier: "silver" },
  { id: "recall_ace", title: "RECALL ACE", description: "90%+ retention at 7 days", icon: "🎯", tier: "gold" },
  { id: "night_owl", title: "NIGHT OWL", description: "Study after midnight", icon: "🦉", tier: "bronze" },
  { id: "early_bird", title: "EARLY BIRD", description: "Study before 7 AM", icon: "🌅", tier: "bronze" },
  { id: "centurion", title: "CENTURION", description: "Earn 1,000 XP", icon: "⭐", tier: "silver" },
  { id: "xp_titan", title: "XP TITAN", description: "Earn 10,000 XP", icon: "🏆", tier: "gold" },
];

const TIER_ORDER: Record<Achievement["tier"], number> = { bronze: 0, silver: 1, gold: 2 };

/**
 * Load all unlocked achievements from localStorage.
 * Filters out malformed entries (missing id or non-finite timestamp).
 * SSR-safe: returns empty array on the server.
 */
export function getUnlocked(): UnlockedAchievement[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a: unknown): a is UnlockedAchievement =>
        a != null && typeof a === "object" &&
        typeof (a as UnlockedAchievement).id === "string" &&
        Number.isFinite((a as UnlockedAchievement).unlockedAt),
    );
  } catch {
    return [];
  }
}

function saveUnlocked(achievements: UnlockedAchievement[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
}

function unlock(id: string): UnlockedAchievement | null {
  const current = getUnlocked();
  if (current.some((a) => a.id === id)) return null;
  if (!ACHIEVEMENTS.some((a) => a.id === id)) return null;
  const entry: UnlockedAchievement = { id, unlockedAt: Date.now() };
  saveUnlocked([...current, entry]);
  return entry;
}

/**
 * Check all achievement conditions against current state.
 * Returns newly unlocked achievements (empty array if none).
 * Call after answer submission, level completion, or session end.
 */
export function checkAchievements(
  progress: UserProgress,
  sessionAccuracy?: number,
): Achievement[] {
  const newly: Achievement[] = [];
  const tryUnlock = (id: string) => {
    const result = unlock(id);
    if (result) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) newly.push(def);
    }
  };

  // Milestone checks
  if (progress.completedLevels.length >= 1) tryUnlock("first_step");
  if (progress.streak >= 3) tryUnlock("streak_3");
  if (progress.streak >= 7) tryUnlock("streak_7");
  if (progress.streak >= 30) tryUnlock("streak_30");
  if (progress.xp >= 1000) tryUnlock("centurion");
  if (progress.xp >= 10000) tryUnlock("xp_titan");
  if (sessionAccuracy === 100) tryUnlock("perfect");

  // Time-of-day checks
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) tryUnlock("night_owl");
  if (hour >= 5 && hour < 7) tryUnlock("early_bird");

  // Analytics-based checks
  const analytics = getLearningAnalytics();
  if (analytics.itemsMastered >= 10) tryUnlock("ten_mastered");
  if (analytics.retentionRate7Day >= 90 && analytics.totalItemsSeen >= 5) tryUnlock("recall_ace");

  return newly;
}

/** Get all achievements sorted by tier, with unlock status. */
export function getTrophyCase(): (Achievement & { unlocked: boolean; unlockedAt?: number })[] {
  const unlocked = getUnlocked();
  const map = new Map(unlocked.map((u) => [u.id, u.unlockedAt]));
  return ACHIEVEMENTS
    .map((a) => ({ ...a, unlocked: map.has(a.id), unlockedAt: map.get(a.id) }))
    .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
}
