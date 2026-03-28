// ─── Passionate Learning — Session Recap Messages ───
// Pure functions for post-session feedback. Extracted from SessionRecap
// so they're independently testable without jsdom.

import { SessionPlan, SessionItemReason } from "@/lib/sessionPlanner";

/**
 * Select a motivational recap message based on session composition.
 * Priority: recall-bonus count (≥2) overrides dominant reason check.
 * Falls back to the `dominantReason` field from the session plan.
 *
 * @param plan - Completed session plan from `planSession()`
 * @returns Human-readable motivational string. Returns an empty-session
 *          fallback if `plan.items` is empty.
 *
 * @example
 * ```ts
 * const plan = planSession(items);
 * const message = getRecapMessage(plan);
 * // → "Solid review session — each repetition deepens the neural pathway."
 * ```
 */
export function getRecapMessage(plan: SessionPlan): string {
  const { dominantReason, items, recallBonusCount } = plan;
  const total = items.length;
  if (total === 0) return "Session empty — start playing to build your memory.";

  if (recallBonusCount >= 2) {
    return "Long-term memories activated — those bonus XP items prove your brain is holding on.";
  }
  switch (dominantReason) {
    case "review":
      return "Solid review session — each repetition deepens the neural pathway.";
    case "recall-bonus":
      return "Your long-term recall is firing — keep spacing out your practice.";
    case "weak-category":
      return "You faced your weakest areas head-on. That's where real growth happens.";
    case "new":
      return "Fresh knowledge acquired. Come back tomorrow to lock it in.";
  }
}

/**
 * Map a 0–100 memory strength score to a display tier with color tokens.
 * Thresholds: Strong ≥ 75, Building ≥ 40, Fragile > 0, New = 0.
 *
 * @param strength - Memory strength from `computeMemoryStrength()` (0–100)
 * @returns Object with `label` (tier name), `color` (text Tailwind class),
 *          and `barColor` (background Tailwind class) for the strength meter.
 *
 * @example
 * ```ts
 * const tier = memoryTier(82);
 * // → { label: "STRONG", color: "text-game-success", barColor: "bg-game-success" }
 * ```
 */
export function memoryTier(strength: number): { label: string; color: string; barColor: string } {
  if (strength >= 75) return { label: "STRONG",   color: "text-game-success", barColor: "bg-game-success" };
  if (strength >= 40) return { label: "BUILDING", color: "text-game-warning", barColor: "bg-game-warning" };
  if (strength > 0)   return { label: "FRAGILE",  color: "text-game-error",   barColor: "bg-game-error" };
  return { label: "NEW", color: "text-game-accent/60", barColor: "bg-game-accent/40" };
}
