"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ComboState, ComboTier } from "@/hooks/useCombo";

// ─── Combo Meter ───
// Visual feedback for the combo system. Shows count, multiplier badge,
// and escalating intensity per tier. Pixel-art aesthetic.

const TIER_CONFIG: Record<ComboTier, { color: string; label: string; glow: string }> = {
  none: { color: "text-white/40", label: "", glow: "" },
  warm: { color: "text-game-warning", label: "NICE", glow: "drop-shadow-[0_0_6px_var(--game-warning)]" },
  hot: { color: "text-game-accent", label: "HOT", glow: "drop-shadow-[0_0_10px_var(--game-accent)]" },
  fire: { color: "text-game-secondary", label: "ON FIRE", glow: "drop-shadow-[0_0_14px_var(--game-secondary)]" },
  ultra: { color: "text-game-error", label: "ULTRA", glow: "drop-shadow-[0_0_20px_var(--game-error)]" },
};

interface ComboMeterProps {
  combo: ComboState;
  /** Position override. Default: fixed top-center. */
  className?: string;
}

export function ComboMeter({ combo, className }: ComboMeterProps) {
  const config = TIER_CONFIG[combo.tier];

  return (
    <AnimatePresence mode="wait">
      {combo.isActive && combo.count >= 2 && (
        <motion.div
          key="combo-meter"
          className={className ?? "fixed top-16 left-1/2 -translate-x-1/2 z-40"}
          initial={{ opacity: 0, scale: 0.5, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          role="status"
          aria-live="polite"
          aria-label={`Combo ${combo.count}, ${combo.multiplier}x multiplier`}
        >
          <div className="flex flex-col items-center gap-1">
            {/* Combo count — big, punchy */}
            <motion.div
              key={combo.count}
              className={`font-pixel text-2xl ${config.color} ${config.glow}`}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 15 }}
            >
              {combo.count}
              <span className="text-xs ml-1 opacity-70">COMBO</span>
            </motion.div>

            {/* Multiplier badge */}
            {combo.multiplier > 1 && (
              <motion.div
                key={`mult-${combo.multiplier}`}
                className={`font-pixel text-xs px-2 py-0.5 ${config.color} pixel-border`}
                initial={{ scale: 1.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                {combo.multiplier}× XP
              </motion.div>
            )}

            {/* Tier label — flashes in on tier change */}
            {config.label && (
              <motion.span
                key={`tier-${combo.tier}`}
                className={`font-pixel text-[8px] ${config.color} tracking-widest`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: [0, 1, 1, 0.7], y: 0 }}
                transition={{ duration: 0.6, times: [0, 0.2, 0.8, 1] }}
              >
                {config.label}
              </motion.span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
