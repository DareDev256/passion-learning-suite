// ─── Passionate Learning — Difficulty Pulse Display Engine ───
// Pure functions that transform the adaptive difficulty engine's DifficultyProfile
// into player-facing display data. Makes the invisible adaptation visible —
// metacognitive feedback about HOW the game adapts to your performance.

import { type DifficultyProfile, type Difficulty } from "@/lib/difficulty";

const PROMOTE_THRESHOLD = 85;
const DEMOTE_THRESHOLD = 50;

export interface TierDisplay {
  tier: Difficulty;
  label: string;
  accuracy: number;       // 0-100, NaN if no data
  attempts: number;
  hasData: boolean;
  isRecommended: boolean;
  status: "promoted" | "on-track" | "struggling" | "untested";
  promotionReady: boolean; // accuracy >= promote threshold
  demotionRisk: boolean;   // accuracy < demote threshold
}

export interface DifficultyPulseData {
  tiers: [TierDisplay, TierDisplay, TierDisplay]; // easy, medium, hard — always 3
  recommended: Difficulty;
  confidence: "new" | "low" | "high";
  confidenceLabel: string;
  totalAttempts: number;
  ariaDescription: string;
}

const TIER_LABELS: Record<Difficulty, string> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
};

const CONFIDENCE_LABELS: Record<DifficultyProfile["confidence"], string> = {
  new: "CALIBRATING",
  low: "LEARNING YOU",
  high: "LOCKED IN",
};

/**
 * Transform a DifficultyProfile into display-ready data for the DifficultyPulse component.
 * Pure function — no side effects, no localStorage, deterministic output.
 */
export function buildDifficultyPulse(profile: DifficultyProfile): DifficultyPulseData {
  const tiers = (["easy", "medium", "hard"] as const).map((tier): TierDisplay => {
    const perf = profile.performance[tier];
    const hasData = !isNaN(perf.accuracy) && perf.attempts > 0;
    const accuracy = hasData ? perf.accuracy : 0;
    const isRecommended = profile.recommended === tier;

    return {
      tier,
      label: TIER_LABELS[tier],
      accuracy: hasData ? perf.accuracy : NaN,
      attempts: perf.attempts,
      hasData,
      isRecommended,
      status: !hasData ? "untested"
        : accuracy >= PROMOTE_THRESHOLD ? "promoted"
        : accuracy >= DEMOTE_THRESHOLD ? "on-track"
        : "struggling",
      promotionReady: hasData && accuracy >= PROMOTE_THRESHOLD,
      demotionRisk: hasData && accuracy < DEMOTE_THRESHOLD,
    };
  }) as [TierDisplay, TierDisplay, TierDisplay];

  const totalAttempts = tiers.reduce((sum, t) => sum + t.attempts, 0);
  const recommended = profile.recommended;

  const recLabel = TIER_LABELS[recommended];
  const ariaDescription = totalAttempts === 0
    ? "No difficulty data yet. Play some levels to calibrate."
    : `Recommended difficulty: ${recLabel}. ${tiers.filter(t => t.hasData).map(t => `${t.label}: ${t.accuracy}% accuracy`).join(", ")}.`;

  return {
    tiers,
    recommended,
    confidence: profile.confidence,
    confidenceLabel: CONFIDENCE_LABELS[profile.confidence],
    totalAttempts,
    ariaDescription,
  };
}

/**
 * Compute the visual fill percentage for a tier bar, clamped to [0, 100].
 * NaN (untested) returns 0.
 */
export function tierFillPercent(accuracy: number): number {
  if (isNaN(accuracy)) return 0;
  return Math.max(0, Math.min(100, accuracy));
}

/**
 * Determine the color token for a tier's accuracy bar.
 * Uses the game's semantic color system — not arbitrary hex values.
 */
export function tierColor(status: TierDisplay["status"]): string {
  switch (status) {
    case "promoted": return "bg-game-primary";
    case "on-track": return "bg-game-warning";
    case "struggling": return "bg-game-error";
    case "untested": return "bg-game-accent/20";
  }
}

/**
 * Determine the text color for a tier's label based on its status.
 */
export function tierTextColor(status: TierDisplay["status"]): string {
  switch (status) {
    case "promoted": return "text-game-primary";
    case "on-track": return "text-game-warning";
    case "struggling": return "text-game-error";
    case "untested": return "text-game-accent/40";
  }
}
