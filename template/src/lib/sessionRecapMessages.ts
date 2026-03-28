// ─── Passionate Learning — Session Recap Messages ───
// Pure functions for post-session feedback. Extracted from SessionRecap
// so they're independently testable without jsdom.

import { SessionPlan, SessionItemReason } from "@/lib/sessionPlanner";

/** Pick a motivational message based on what dominated the session. */
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

/** Map memory strength 0-100 to a tier label. */
export function memoryTier(strength: number): { label: string; color: string; barColor: string } {
  if (strength >= 75) return { label: "STRONG",   color: "text-game-success", barColor: "bg-game-success" };
  if (strength >= 40) return { label: "BUILDING", color: "text-game-warning", barColor: "bg-game-warning" };
  if (strength > 0)   return { label: "FRAGILE",  color: "text-game-error",   barColor: "bg-game-error" };
  return { label: "NEW", color: "text-game-accent/60", barColor: "bg-game-accent/40" };
}
