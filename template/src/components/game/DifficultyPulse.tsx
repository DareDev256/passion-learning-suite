"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { analyzeDifficulty, type Difficulty } from "@/lib/difficulty";
import {
  buildDifficultyPulse,
  tierFillPercent,
  tierColor,
  tierTextColor,
  type TierDisplay,
  type DifficultyPulseData,
} from "@/lib/difficultyPulse";
import { ContentItem } from "@/types/game";

interface DifficultyPulseProps {
  items: ContentItem[];
}

const TIER_ICONS: Record<Difficulty, string> = {
  easy: "◇",
  medium: "◆",
  hard: "★",
};

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

/**
 * Adaptive difficulty visualizer — makes the invisible difficulty engine visible.
 * Shows per-tier accuracy, the currently recommended tier, and promotion/demotion
 * thresholds so the player understands HOW the game adapts to them.
 */
export function DifficultyPulse({ items }: DifficultyPulseProps) {
  // SSR-safe: lazy initializer runs only on client, avoids useEffect + setState cascade
  const [data] = useState<DifficultyPulseData | null>(() => {
    if (typeof window === "undefined" || items.length === 0) return null;
    return buildDifficultyPulse(analyzeDifficulty(items));
  });

  if (!data) return null;

  return (
    <motion.section
      variants={fadeUp}
      className="pixel-border bg-game-dark/40 p-4 space-y-3"
      role="region"
      aria-label={`Adaptive difficulty status. ${data.ariaDescription}`}
    >
      {/* Header */}
      <div className="flex justify-between items-baseline">
        <h3 className="font-pixel text-[10px] text-game-secondary neon-glow tracking-wider">
          DIFFICULTY PULSE
        </h3>
        <span
          className={`font-pixel text-[7px] tracking-wide ${
            data.confidence === "high" ? "text-game-primary"
            : data.confidence === "low" ? "text-game-warning"
            : "text-game-accent/50"
          }`}
        >
          {data.confidenceLabel}
        </span>
      </div>

      {/* Tier bars */}
      <div className="space-y-2">
        {data.tiers.map((tier) => (
          <TierBar key={tier.tier} tier={tier} />
        ))}
      </div>

      {/* Threshold legend */}
      <div className="flex justify-between font-pixel text-[6px] text-game-accent/40 pt-1">
        <span>0%</span>
        <span className="text-game-error/50">▼50% DEMOTE</span>
        <span className="text-game-primary/50">▲85% PROMOTE</span>
        <span>100%</span>
      </div>
    </motion.section>
  );
}

function TierBar({ tier }: { tier: TierDisplay }) {
  const fill = tierFillPercent(tier.accuracy);
  const barColor = tierColor(tier.status);
  const textColor = tierTextColor(tier.status);

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className={`font-pixel text-[8px] ${textColor} flex items-center gap-1.5`}>
          <span aria-hidden="true">{TIER_ICONS[tier.tier]}</span>
          {tier.label}
          {tier.isRecommended && (
            <motion.span
              className="text-game-secondary text-[6px]"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              aria-label="Currently recommended difficulty"
            >
              ● ACTIVE
            </motion.span>
          )}
        </span>
        <span className={`font-pixel text-[7px] ${textColor}`}>
          {tier.hasData ? `${tier.accuracy}%` : "—"}
        </span>
      </div>

      {/* Accuracy bar with threshold markers */}
      <div
        className="relative h-2 bg-game-black/60 w-full"
        role="progressbar"
        aria-valuenow={tier.hasData ? tier.accuracy : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${tier.label} tier accuracy`}
      >
        <motion.div
          className={`h-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${fill}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {/* Demote threshold marker */}
        <div
          className="absolute top-0 h-full w-px bg-game-error/40"
          style={{ left: "50%" }}
          aria-hidden="true"
        />
        {/* Promote threshold marker */}
        <div
          className="absolute top-0 h-full w-px bg-game-primary/40"
          style={{ left: "85%" }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
