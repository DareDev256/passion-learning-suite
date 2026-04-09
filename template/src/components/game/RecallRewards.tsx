"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { getProgress } from "@/lib/storage";
import { computeRecallRewards, type RecallRewardsSummary, type UpcomingReward } from "@/lib/recallRewards";

// ─── Recall Rewards Tracker ───
// Surfaces the delayed-reward XP system: shows which items are approaching
// their 7-day (2×) and 30-day (3×) bonus windows, plus items claimable now.
// Drives return visits: "come back in 2 days for 2× XP on 3 items."

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

const TIER_STYLE = {
  "2x": { color: "text-game-warning", bg: "bg-game-warning/15", border: "border-game-warning/30", label: "2× XP" },
  "3x": { color: "text-yellow-300", bg: "bg-yellow-300/15", border: "border-yellow-300/30", label: "3× XP" },
} as const;

function RewardRow({ reward }: { reward: UpcomingReward }) {
  const style = TIER_STYLE[reward.tier];
  const isClaimable = reward.daysUntil === 0;
  return (
    <motion.div
      variants={fadeUp}
      className={`flex items-center justify-between px-3 py-2 border ${style.border} ${style.bg}`}
    >
      <span className="font-pixel text-[8px] text-white/80 truncate max-w-[55%]">
        {reward.itemId.replace(/[_.-]/g, " ")}
      </span>
      <div className="flex items-center gap-2">
        {isClaimable ? (
          <motion.span
            className={`font-pixel text-[8px] ${style.color}`}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            CLAIM NOW
          </motion.span>
        ) : (
          <span className="font-pixel text-[8px] text-game-accent/60">
            {reward.daysUntil}d
          </span>
        )}
        <span className={`font-pixel text-[7px] px-1.5 py-0.5 ${style.color} ${style.bg} border ${style.border}`}>
          {style.label}
        </span>
      </div>
    </motion.div>
  );
}

export function RecallRewards() {
  const summary: RecallRewardsSummary = useMemo(() => {
    const progress = getProgress();
    return computeRecallRewards(progress.itemScores);
  }, []);

  const hasClaimable = summary.claimable.length > 0;
  const hasUpcoming = summary.upcoming.length > 0;

  if (!hasClaimable && !hasUpcoming) {
    return (
      <motion.div
        className="pixel-border bg-game-dark/40 p-4 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="font-pixel text-[10px] text-game-accent/70 tracking-wider">RECALL REWARDS</p>
        <p className="font-pixel text-[8px] text-game-accent/40 mt-2">
          KEEP STUDYING — BONUSES UNLOCK AFTER 7 DAYS
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="pixel-border bg-game-dark/40 p-4 space-y-3"
      variants={stagger}
      initial="hidden"
      animate="show"
      role="region"
      aria-label="Recall reward opportunities"
    >
      {/* Header with claimable XP */}
      <motion.div variants={fadeUp} className="flex justify-between items-baseline">
        <h3 className="font-pixel text-[10px] text-game-warning neon-glow tracking-wider">RECALL REWARDS</h3>
        {summary.claimableXP > 0 && (
          <motion.span
            className="font-pixel text-[9px] text-yellow-300"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            aria-label={`${summary.claimableXP} bonus XP available`}
          >
            +{summary.claimableXP} XP
          </motion.span>
        )}
      </motion.div>

      {/* Claimable now */}
      {hasClaimable && (
        <div className="space-y-1.5" role="list" aria-label="Claimable rewards">
          {summary.claimable.slice(0, 5).map((r) => (
            <RewardRow key={`${r.itemId}-${r.tier}`} reward={r} />
          ))}
          {summary.claimable.length > 5 && (
            <p className="font-pixel text-[7px] text-game-accent/40 text-center">
              +{summary.claimable.length - 5} MORE
            </p>
          )}
        </div>
      )}

      {/* Upcoming separator */}
      {hasClaimable && hasUpcoming && (
        <div className="border-t border-game-accent/10" aria-hidden="true" />
      )}

      {/* Upcoming rewards */}
      {hasUpcoming && (
        <div className="space-y-1.5" role="list" aria-label="Upcoming rewards">
          <p className="font-pixel text-[7px] text-game-accent/50 tracking-wider">COMING SOON</p>
          {summary.upcoming.slice(0, 3).map((r) => (
            <RewardRow key={`${r.itemId}-${r.tier}`} reward={r} />
          ))}
          {summary.upcoming.length > 3 && (
            <p className="font-pixel text-[7px] text-game-accent/40 text-center">
              +{summary.upcoming.length - 3} MORE
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
