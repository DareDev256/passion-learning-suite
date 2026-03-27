"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SessionPlan, SessionItemReason } from "@/lib/sessionPlanner";

interface SessionBannerProps {
  plan: SessionPlan;
  description: string;
  progress: { current: number; total: number };
  currentReason: SessionItemReason | null;
  isComplete: boolean;
}

const REASON_CONFIG: Record<SessionItemReason, { label: string; color: string; icon: string }> = {
  review:          { label: "REVIEW",     color: "text-cyan-400",   icon: "\u27F3" },
  "recall-bonus":  { label: "BONUS XP",   color: "text-amber-400",  icon: "\u2606" },
  "weak-category": { label: "WEAK AREA",  color: "text-rose-400",   icon: "\u25C6" },
  new:             { label: "NEW",         color: "text-emerald-400", icon: "\u25B8" },
};

/**
 * Compact session status banner. Shows the session composition,
 * current item reason tag, and a pixel-style progress bar.
 * Designed to sit at the top of the game screen during play.
 */
export function SessionBanner({
  plan,
  description,
  progress,
  currentReason,
  isComplete,
}: SessionBannerProps) {
  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <motion.div
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="pixel-border bg-game-dark/60 px-3 py-2 space-y-2">
        {/* Top row: description + item counter */}
        <div className="flex items-center justify-between gap-2">
          <p className="font-pixel text-[7px] text-game-accent/80 truncate">
            {description}
          </p>
          <span className="font-pixel text-[8px] text-white/70 shrink-0">
            {progress.current}/{progress.total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-game-black/60 w-full">
          <motion.div
            className="h-full bg-game-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Reason tag + bonus callout */}
        <AnimatePresence mode="wait">
          {!isComplete && currentReason && (
            <motion.div
              key={currentReason}
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              transition={{ duration: 0.2 }}
            >
              <span className={`font-pixel text-[8px] ${REASON_CONFIG[currentReason].color}`}>
                {REASON_CONFIG[currentReason].icon} {REASON_CONFIG[currentReason].label}
              </span>
              {currentReason === "recall-bonus" && (
                <span className="font-pixel text-[7px] text-amber-400/80 neon-glow">
                  2-3x XP!
                </span>
              )}
            </motion.div>
          )}
          {isComplete && (
            <motion.p
              key="done"
              className="font-pixel text-[8px] text-game-success text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              SESSION COMPLETE
            </motion.p>
          )}
        </AnimatePresence>

        {/* Composition pills */}
        <div className="flex gap-1.5 flex-wrap">
          {plan.reviewCount > 0 && <Pill count={plan.reviewCount} label="review" color="bg-cyan-900/50 text-cyan-400" />}
          {plan.recallBonusCount > 0 && <Pill count={plan.recallBonusCount} label="bonus" color="bg-amber-900/50 text-amber-400" />}
          {plan.weakCategoryCount > 0 && <Pill count={plan.weakCategoryCount} label="weak" color="bg-rose-900/50 text-rose-400" />}
          {plan.newCount > 0 && <Pill count={plan.newCount} label="new" color="bg-emerald-900/50 text-emerald-400" />}
        </div>
      </div>
    </motion.div>
  );
}

function Pill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <span className={`font-pixel text-[6px] px-1.5 py-0.5 rounded-sm ${color}`}>
      {count} {label}
    </span>
  );
}
