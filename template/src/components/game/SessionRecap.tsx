"use client";

import { motion } from "framer-motion";
import { SessionPlan, SessionItemReason } from "@/lib/sessionPlanner";
import { computeMemoryStrength } from "@/lib/spacedRepetition";
import { getRecapMessage, memoryTier } from "@/lib/sessionRecapMessages";
import { useState, useEffect } from "react";

interface SessionRecapProps {
  plan: SessionPlan;
  onNewSession: () => void;
  onViewInsights?: () => void;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const REASON_LABELS: Record<SessionItemReason, { verb: string; color: string; icon: string }> = {
  review:          { verb: "Reinforced",   color: "text-cyan-400",    icon: "⟳" },
  "recall-bonus":  { verb: "Bonus recall", color: "text-amber-400",   icon: "☆" },
  "weak-category": { verb: "Drilled",      color: "text-rose-400",    icon: "◆" },
  new:             { verb: "Discovered",   color: "text-emerald-400",  icon: "▸" },
};

export function SessionRecap({ plan, onNewSession, onViewInsights }: SessionRecapProps) {
  const [memStrength, setMemStrength] = useState<number | null>(null);

  useEffect(() => {
    setMemStrength(computeMemoryStrength());
  }, []);

  const message = getRecapMessage(plan);
  const tier = memoryTier(memStrength ?? 0);
  const total = plan.items.length;

  // Build breakdown rows from plan counts
  const rows: { reason: SessionItemReason; count: number }[] = [];
  if (plan.reviewCount > 0) rows.push({ reason: "review", count: plan.reviewCount - plan.recallBonusCount });
  if (plan.recallBonusCount > 0) rows.push({ reason: "recall-bonus", count: plan.recallBonusCount });
  if (plan.weakCategoryCount > 0) rows.push({ reason: "weak-category", count: plan.weakCategoryCount });
  if (plan.newCount > 0) rows.push({ reason: "new", count: plan.newCount });
  // Filter out zero-count rows from subtraction
  const visibleRows = rows.filter((r) => r.count > 0);

  return (
    <motion.div
      className="w-full max-w-md mx-auto space-y-4"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ─── Header ─── */}
      <motion.div variants={fadeUp} className="text-center space-y-1">
        <motion.p
          className="font-pixel text-lg text-game-primary neon-glow"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
        >
          SESSION COMPLETE
        </motion.p>
        <p className="font-pixel text-[8px] text-game-accent/70">
          {total} item{total !== 1 ? "s" : ""} · ~{plan.estimatedMinutes} min
        </p>
      </motion.div>

      {/* ─── Breakdown ─── */}
      <motion.section variants={fadeUp} className="pixel-border bg-game-dark/40 p-4 space-y-2">
        <h3 className="font-pixel text-[9px] text-game-accent tracking-wider mb-3">BREAKDOWN</h3>
        {visibleRows.map(({ reason, count }) => {
          const cfg = REASON_LABELS[reason];
          return (
            <div key={reason} className="flex items-center justify-between">
              <span className={`font-pixel text-[9px] ${cfg.color}`}>
                {cfg.icon} {cfg.verb}
              </span>
              <span className="font-pixel text-[10px] text-white">{count}</span>
            </div>
          );
        })}
      </motion.section>

      {/* ─── Memory Strength ─── */}
      {memStrength !== null && (
        <motion.section variants={fadeUp} className="pixel-border bg-game-dark/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[9px] text-game-accent tracking-wider">MEMORY STRENGTH</h3>
            <span className={`font-pixel text-[9px] ${tier.color}`}>{tier.label}</span>
          </div>
          <div className="h-2 bg-game-black/60 w-full" role="progressbar" aria-valuenow={memStrength} aria-valuemin={0} aria-valuemax={100}>
            <motion.div
              className={`h-full ${tier.barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${memStrength}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            />
          </div>
          <p className="font-pixel text-[7px] text-game-accent/50 text-right">{memStrength}/100</p>
        </motion.section>
      )}

      {/* ─── Motivational message ─── */}
      <motion.p
        variants={fadeUp}
        className="font-pixel text-[8px] text-center text-game-accent/80 leading-relaxed px-2"
      >
        {message}
      </motion.p>

      {/* ─── Actions ─── */}
      <motion.div variants={fadeUp} className="flex gap-3 justify-center pt-2">
        <button
          onClick={onNewSession}
          className="font-pixel text-[9px] px-4 py-2 bg-game-primary/20 text-game-primary border border-game-primary/40 hover:bg-game-primary/30 transition-colors"
        >
          NEW SESSION
        </button>
        {onViewInsights && (
          <button
            onClick={onViewInsights}
            className="font-pixel text-[9px] px-4 py-2 bg-game-accent/10 text-game-accent border border-game-accent/30 hover:bg-game-accent/20 transition-colors"
          >
            INSIGHTS
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
