"use client";

import { useState, useCallback, useRef } from "react";

// ─── Combo System ───
// Consecutive correct answers build a combo multiplier.
// Multiplier tiers: 2x at 3, 3x at 5, 4x at 8, 5x at 12.
// Combo decays after 8 seconds of inactivity (configurable).
// Wrong answer resets immediately.

export interface ComboState {
  count: number;
  multiplier: number;
  tier: ComboTier;
  isActive: boolean;
  peak: number; // highest combo this session
}

export type ComboTier = "none" | "warm" | "hot" | "fire" | "ultra";

const TIER_THRESHOLDS: { min: number; tier: ComboTier; multiplier: number }[] = [
  { min: 12, tier: "ultra", multiplier: 5 },
  { min: 8, tier: "fire", multiplier: 4 },
  { min: 5, tier: "hot", multiplier: 3 },
  { min: 3, tier: "warm", multiplier: 2 },
];

function resolveTier(count: number): { tier: ComboTier; multiplier: number } {
  for (const t of TIER_THRESHOLDS) {
    if (count >= t.min) return { tier: t.tier, multiplier: t.multiplier };
  }
  return { tier: "none", multiplier: 1 };
}

interface UseComboOptions {
  /** Milliseconds before combo decays from inactivity. Default 8000. */
  decayMs?: number;
  /** Called when combo breaks (wrong answer or decay). */
  onBreak?: (finalCount: number) => void;
  /** Called when combo reaches a new tier. */
  onTierUp?: (tier: ComboTier, multiplier: number) => void;
}

const DEFAULT_STATE: ComboState = {
  count: 0,
  multiplier: 1,
  tier: "none",
  isActive: false,
  peak: 0,
};

/**
 * Manages in-session combo state. Feed it correct/incorrect signals
 * and it returns the current combo count, XP multiplier, and visual tier.
 *
 * @example
 * ```tsx
 * const { combo, hit, miss, reset } = useCombo({
 *   onTierUp: (tier) => playSound(`combo_${tier}`),
 *   onBreak: (count) => count >= 5 && showToast(`${count}x combo lost!`),
 * });
 * // On correct answer:
 * const xpMultiplier = hit(); // returns current multiplier
 * // On wrong answer:
 * miss();
 * ```
 */
export function useCombo(options: UseComboOptions = {}) {
  const { decayMs = 8000, onBreak, onTierUp } = options;
  const [combo, setCombo] = useState<ComboState>(DEFAULT_STATE);
  const decayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTier = useRef<ComboTier>("none");

  const clearDecay = useCallback(() => {
    if (decayTimer.current) {
      clearTimeout(decayTimer.current);
      decayTimer.current = null;
    }
  }, []);

  const startDecay = useCallback(
    (currentCount: number) => {
      clearDecay();
      decayTimer.current = setTimeout(() => {
        if (currentCount > 0) onBreak?.(currentCount);
        prevTier.current = "none";
        setCombo((prev) => ({ ...DEFAULT_STATE, peak: prev.peak }));
      }, decayMs);
    },
    [clearDecay, decayMs, onBreak]
  );

  /** Register a correct answer. Returns the current XP multiplier. */
  const hit = useCallback((): number => {
    let resultMultiplier = 1;
    setCombo((prev) => {
      const newCount = prev.count + 1;
      const { tier, multiplier } = resolveTier(newCount);
      resultMultiplier = multiplier;

      if (tier !== prevTier.current && tier !== "none") {
        prevTier.current = tier;
        // Defer callback to avoid setState-during-render
        setTimeout(() => onTierUp?.(tier, multiplier), 0);
      }

      return {
        count: newCount,
        multiplier,
        tier,
        isActive: true,
        peak: Math.max(prev.peak, newCount),
      };
    });
    // Restart decay timer — we read the count after update via a ref-like approach
    // but since setCombo is async, we schedule decay with the *next* count
    clearDecay();
    // We need the new count for decay, use a microtask to read after state settles
    setTimeout(() => {
      setCombo((current) => {
        startDecay(current.count);
        return current; // no-op update
      });
    }, 0);
    return resultMultiplier;
  }, [clearDecay, startDecay, onTierUp]);

  /** Register a wrong answer. Breaks the combo immediately. */
  const miss = useCallback(() => {
    clearDecay();
    setCombo((prev) => {
      if (prev.count > 0) {
        setTimeout(() => onBreak?.(prev.count), 0);
      }
      prevTier.current = "none";
      return { ...DEFAULT_STATE, peak: prev.peak };
    });
  }, [clearDecay, onBreak]);

  /** Hard reset — use between rounds or levels. */
  const reset = useCallback(() => {
    clearDecay();
    prevTier.current = "none";
    setCombo(DEFAULT_STATE);
  }, [clearDecay]);

  return { combo, hit, miss, reset };
}
