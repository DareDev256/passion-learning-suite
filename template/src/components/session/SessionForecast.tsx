"use client";

import { motion } from "framer-motion";
import { SessionPlan, SessionItemReason } from "@/lib/sessionPlanner";

interface SessionForecastProps {
  plan: SessionPlan;
  description: string;
  onStart: () => void;
}

const REASON_META: Record<SessionItemReason, { label: string; color: string; bg: string; icon: string; hint: string }> = {
  review:          { label: "REVIEW",    color: "text-cyan-400",    bg: "bg-cyan-400",    icon: "⟳", hint: "Due for spaced repetition" },
  "recall-bonus":  { label: "BONUS XP",  color: "text-amber-400",   bg: "bg-amber-400",   icon: "★", hint: "7+ days since last seen — 2-3× XP" },
  "weak-category": { label: "WEAK AREA", color: "text-rose-400",    bg: "bg-rose-400",    icon: "◆", hint: "Category accuracy below 70%" },
  new:             { label: "NEW",       color: "text-emerald-400",  bg: "bg-emerald-400",  icon: "▸", hint: "Fresh content at your level" },
};

const REASONS: SessionItemReason[] = ["recall-bonus", "review", "weak-category", "new"];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

/**
 * Pre-session forecast screen. Shows the player what the auto-select
 * brain has planned — composition breakdown, item preview with reason
 * tags, estimated time, and bonus XP opportunities. Designed to build
 * anticipation and metacognitive awareness before gameplay begins.
 */
export function SessionForecast({ plan, description, onStart }: SessionForecastProps) {
  const total = plan.items.length;
  if (total === 0) {
    return (
      <motion.div
        className="text-center py-12 space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="font-pixel text-xs text-game-accent">ALL CAUGHT UP</p>
        <p className="font-pixel text-[8px] text-game-accent/60">NO ITEMS DUE — CHECK BACK TOMORROW</p>
      </motion.div>
    );
  }

  const counts: Record<SessionItemReason, number> = {
    review: plan.reviewCount - plan.recallBonusCount,
    "recall-bonus": plan.recallBonusCount,
    "weak-category": plan.weakCategoryCount,
    new: plan.newCount,
  };

  // Build composition bar segments
  const segments = REASONS
    .filter((r) => counts[r] > 0)
    .map((r) => ({ reason: r, count: counts[r], pct: Math.round((counts[r] / total) * 100) }));

  return (
    <motion.div
      className="w-full max-w-md mx-auto space-y-5"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="text-center space-y-1">
        <h2 className="font-pixel text-sm text-game-primary neon-glow tracking-widest">
          SESSION FORECAST
        </h2>
        <p className="font-pixel text-[8px] text-game-accent/70">{description}</p>
      </motion.div>

      {/* Composition bar */}
      <motion.div variants={fadeUp} className="pixel-border bg-game-dark/50 p-4 space-y-3">
        <div className="flex h-3 w-full overflow-hidden" role="img" aria-label={`Session: ${description}`}>
          {segments.map(({ reason, pct }) => (
            <motion.div
              key={reason}
              className={`${REASON_META[reason].bg} h-full`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {segments.map(({ reason, count }) => (
            <div key={reason} className="flex items-center gap-2">
              <span className={`${REASON_META[reason].bg} w-2 h-2 shrink-0`} />
              <span className={`font-pixel text-[7px] ${REASON_META[reason].color}`}>
                {REASON_META[reason].icon} {count} {REASON_META[reason].label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Item preview list */}
      <motion.div variants={fadeUp} className="pixel-border bg-game-dark/40 p-3 space-y-1 max-h-48 overflow-y-auto">
        <p className="font-pixel text-[8px] text-game-accent/60 mb-2">ITEM QUEUE</p>
        {plan.items.map((si, i) => {
          const meta = REASON_META[si.reason];
          return (
            <motion.div
              key={si.item.id}
              className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0"
              variants={fadeUp}
            >
              <span className="font-pixel text-[7px] text-white/30 w-4 text-right shrink-0">
                {i + 1}
              </span>
              <span className={`font-pixel text-[6px] px-1 py-0.5 ${meta.color} bg-white/5 shrink-0`}>
                {meta.icon}
              </span>
              <span className="font-pixel text-[7px] text-white/80 truncate">
                {si.item.prompt.length > 50 ? si.item.prompt.slice(0, 50) + "…" : si.item.prompt}
              </span>
              {si.reason === "recall-bonus" && (
                <span className="font-pixel text-[6px] text-amber-400/90 neon-glow shrink-0">
                  2-3×
                </span>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Motivational callout */}
      {plan.recallBonusCount > 0 && (
        <motion.div
          variants={fadeUp}
          className="text-center font-pixel text-[8px] text-amber-400/80"
        >
          ★ {plan.recallBonusCount} ITEM{plan.recallBonusCount !== 1 ? "S" : ""} READY FOR BONUS XP — NAIL THE RECALL ★
        </motion.div>
      )}

      {/* Time estimate + CTA */}
      <motion.div variants={fadeUp} className="flex flex-col items-center gap-3">
        <p className="font-pixel text-[8px] text-game-accent/60">
          ~{plan.estimatedMinutes} MIN SESSION
        </p>
        <button
          onClick={onStart}
          className="font-pixel text-xs px-8 py-3 bg-game-primary/20 text-game-primary border-2 border-game-primary hover:bg-game-primary/40 transition-colors tracking-wider neon-glow"
        >
          BEGIN SESSION
        </button>
      </motion.div>
    </motion.div>
  );
}
