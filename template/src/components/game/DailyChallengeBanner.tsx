"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  generateDailyChallenge,
  isDailyChallengeComplete,
  getDailyChallengeResult,
  timeUntilExpiry,
  type DailyChallenge,
  type DailyChallengeResult,
} from "@/lib/dailyChallenge";
import { ContentItem } from "@/types/game";

interface DailyChallengeBannerProps {
  items: ContentItem[];
  onStartChallenge?: (challenge: DailyChallenge) => void;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

function MultiplierBadge({ value }: { value: number }) {
  return (
    <motion.span
      className="font-pixel text-[10px] text-yellow-300 px-2 py-1 bg-yellow-300/10 border border-yellow-300/30"
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      aria-label={`${value} times bonus multiplier`}
    >
      {value}x
    </motion.span>
  );
}

function CountdownTimer({ expiresAt }: { expiresAt: number }) {
  const [remaining, setRemaining] = useState(() => timeUntilExpiry(expiresAt));

  useEffect(() => {
    const id = setInterval(() => setRemaining(timeUntilExpiry(expiresAt)), 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const isExpired = remaining === "Expired";

  return (
    <span
      className={`font-pixel text-[8px] ${isExpired ? "text-game-error" : "text-game-accent/60"}`}
      aria-label={isExpired ? "Challenge expired" : `${remaining} remaining`}
    >
      {isExpired ? "EXPIRED" : remaining}
    </span>
  );
}

function CompletedState({ result, multiplier }: { result: DailyChallengeResult; multiplier: number }) {
  const isPerfect = result.accuracy === 100;
  return (
    <motion.div variants={fadeUp} className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[9px] text-game-success">COMPLETED</span>
        <span className="font-pixel text-[9px] text-yellow-300">+{result.bonusXP} XP</span>
      </div>
      <div className="flex gap-4 justify-center font-pixel text-[8px]">
        <span className={result.accuracy >= 80 ? "text-game-success" : "text-game-warning"}>
          {result.accuracy}% ACC
        </span>
        <span className="text-game-accent/60">{result.timeTaken}s</span>
        <span className="text-game-accent/60">{multiplier}x BONUS</span>
      </div>
      {isPerfect && (
        <motion.p
          className="font-pixel text-[8px] text-yellow-300 text-center"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 12 }}
        >
          PERFECT SCORE
        </motion.p>
      )}
    </motion.div>
  );
}

/**
 * Daily challenge banner — surfaces the date-seeded daily challenge engine
 * as a player-facing engagement hook. Shows today's focus category,
 * streak-scaled bonus multiplier, countdown to midnight, and completion results.
 */
export function DailyChallengeBanner({ items, onStartChallenge }: DailyChallengeBannerProps) {
  const [challenge] = useState<DailyChallenge | null>(() =>
    typeof window !== "undefined" && items.length > 0 ? generateDailyChallenge(items) : null,
  );
  const [completed] = useState(() =>
    typeof window !== "undefined" ? isDailyChallengeComplete() : false,
  );
  const [result] = useState<DailyChallengeResult | null>(() =>
    typeof window !== "undefined" ? getDailyChallengeResult() : null,
  );

  if (!challenge || challenge.items.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="pixel-border bg-game-dark/50 p-4 w-full max-w-md mx-auto space-y-3"
      variants={stagger}
      initial="hidden"
      animate="show"
      role="region"
      aria-label="Daily challenge"
    >
      {/* Header row: title + countdown */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span
            className="font-pixel text-[7px] text-game-warning"
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          >
            *
          </motion.span>
          <h3 className="font-pixel text-[10px] text-game-warning neon-glow tracking-wider">
            DAILY CHALLENGE
          </h3>
        </div>
        <CountdownTimer expiresAt={challenge.expiresAt} />
      </motion.div>

      {/* Focus category + multiplier */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="font-pixel text-[7px] text-game-accent/50">FOCUS</p>
          <p className="font-pixel text-[9px] text-white uppercase">
            {challenge.category.replace(/[_.-]/g, " ") || "MIXED"}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <p className="font-pixel text-[7px] text-game-accent/50">BONUS</p>
          <MultiplierBadge value={challenge.bonusMultiplier} />
        </div>
      </motion.div>

      {/* Item count */}
      <motion.div variants={fadeUp} className="flex justify-center">
        <span className="font-pixel text-[8px] text-game-accent/60">
          {challenge.items.length} ITEM{challenge.items.length !== 1 ? "S" : ""}
        </span>
      </motion.div>

      {/* Completed vs. start CTA */}
      {completed && result ? (
        <CompletedState result={result} multiplier={challenge.bonusMultiplier} />
      ) : (
        <motion.div variants={fadeUp} className="flex justify-center pt-1">
          <button
            onClick={() => onStartChallenge?.(challenge)}
            className="font-pixel text-[9px] px-5 py-2 bg-game-warning/20 text-game-warning border border-game-warning/40 hover:bg-game-warning/30 transition-colors"
            aria-label={`Start today's daily challenge: ${challenge.items.length} items, ${challenge.bonusMultiplier} times bonus`}
          >
            START CHALLENGE
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
