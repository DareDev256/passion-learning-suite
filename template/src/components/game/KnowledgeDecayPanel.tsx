"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { getFSRSCards, type FSRSCard } from "@/lib/storage";
import {
  predictDecay,
  DECAY_HORIZONS,
  type DecayHorizon,
  type DecayForecast,
  type CategoryRisk,
} from "@/lib/knowledgeDecay";
import { ContentItem } from "@/types/game";

interface KnowledgeDecayPanelProps {
  items: Pick<ContentItem, "id" | "category">[];
}

const URGENCY_STYLE: Record<CategoryRisk["urgency"], { color: string; bg: string; label: string }> = {
  critical: { color: "text-game-error",   bg: "bg-game-error/15",   label: "CRITICAL" },
  warning:  { color: "text-game-warning", bg: "bg-game-warning/15", label: "AT RISK" },
  stable:   { color: "text-game-success", bg: "bg-game-success/15", label: "STABLE" },
};

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.3 } } };
const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

function healthColor(s: number) { return s >= 75 ? "var(--game-success)" : s >= 45 ? "var(--game-warning)" : "var(--game-error)"; }
function healthLabel(s: number) { return s >= 85 ? "EXCELLENT" : s >= 70 ? "STRONG" : s >= 50 ? "FADING" : s >= 25 ? "DECAYING" : "CRITICAL"; }

/** Visualizes FSRS retention forecasts: health ring, category risks, at-risk items. */
export function KnowledgeDecayPanel({ items }: KnowledgeDecayPanelProps) {
  const [cards] = useState<FSRSCard[]>(() =>
    typeof window !== "undefined" ? getFSRSCards() : [],
  );
  const [horizon, setHorizon] = useState<DecayHorizon>(7);

  const forecast: DecayForecast = useMemo(
    () => predictDecay(cards, items, horizon),
    [cards, items, horizon],
  );

  const reviewedCount = cards.filter((c) => c.reps > 0).length;
  if (reviewedCount === 0) {
    return (
      <motion.div
        className="text-center py-8 space-y-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="font-pixel text-[9px] text-game-accent/70">NO DECAY DATA YET</p>
        <p className="font-pixel text-[7px] text-game-accent/40">COMPLETE SOME REVIEWS TO SEE YOUR KNOWLEDGE HEALTH</p>
      </motion.div>
    );
  }

  const offset = RING_C - (forecast.healthScore / 100) * RING_C;
  const color = healthColor(forecast.healthScore);

  return (
    <motion.section
      className="w-full max-w-md mx-auto space-y-4"
      variants={stagger}
      initial="hidden"
      animate="show"
      aria-label={`Knowledge health: ${forecast.healthScore}%, ${forecast.totalAtRisk} items at risk within ${horizon} days`}
    >
      {/* Health ring + score */}
      <motion.div variants={fadeUp} className="flex items-center justify-center gap-6">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
            <circle
              cx="64" cy="64" r={RING_R}
              fill="none" stroke="var(--game-primary)" strokeOpacity={0.08} strokeWidth={8}
            />
            <motion.circle
              cx="64" cy="64" r={RING_R}
              fill="none" stroke={color} strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={RING_C}
              initial={{ strokeDashoffset: RING_C }}
              animate={{ strokeDashoffset: offset }}
              transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.2 }}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-pixel text-lg" style={{ color, filter: `drop-shadow(0 0 8px ${color})` }}>
              {forecast.healthScore}
            </span>
            <span className="font-pixel text-[6px] text-game-accent/60 mt-1">
              {healthLabel(forecast.healthScore)}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-right">
          <Stat value={reviewedCount} label="TRACKED" />
          <Stat value={forecast.totalAtRisk} label="AT RISK" alert={forecast.totalAtRisk > 0} />
          <Stat value={`${horizon}d`} label="HORIZON" />
        </div>
      </motion.div>

      {/* Horizon selector */}
      <motion.div variants={fadeUp} className="flex justify-center gap-1">
        {DECAY_HORIZONS.map((h) => (
          <button
            key={h}
            onClick={() => setHorizon(h)}
            className={`font-pixel text-[7px] px-2.5 py-1.5 transition-colors ${
              h === horizon
                ? "bg-game-primary/20 text-game-primary border border-game-primary/50"
                : "text-game-accent/40 hover:text-game-accent/70 border border-transparent"
            }`}
            aria-pressed={h === horizon}
            aria-label={`${h} day forecast`}
          >
            {h}D
          </button>
        ))}
      </motion.div>

      {/* Category risks */}
      {forecast.categoryRisks.length > 0 && (
        <motion.div variants={fadeUp} className="pixel-border bg-game-dark/40 p-3 space-y-2">
          <p className="font-pixel text-[8px] text-game-accent/60">CATEGORY RISK</p>
          {forecast.categoryRisks.slice(0, 5).map((cat) => {
            const style = URGENCY_STYLE[cat.urgency];
            return (
              <div key={cat.categoryId} className="flex items-center justify-between gap-2">
                <span className="font-pixel text-[7px] text-white/70 truncate flex-1">
                  {cat.categoryId}
                </span>
                <span className={`font-pixel text-[6px] px-1.5 py-0.5 ${style.bg} ${style.color}`}>
                  {cat.atRiskCount} {style.label}
                </span>
                <span className="font-pixel text-[7px] text-white/40 w-10 text-right">
                  {cat.avgRetention}%
                </span>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* At-risk items */}
      {forecast.atRiskItems.length > 0 && (
        <motion.div variants={fadeUp} className="pixel-border bg-game-dark/30 p-3 space-y-1 max-h-44 overflow-y-auto">
          <p className="font-pixel text-[8px] text-game-accent/60 mb-2">FADING MEMORIES</p>
          {forecast.atRiskItems.slice(0, 8).map((item) => (
            <motion.div
              key={item.itemId}
              className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0"
              variants={fadeUp}
            >
              <RetentionDot retention={item.currentRetention} />
              <span className="font-pixel text-[7px] text-white/70 truncate flex-1">
                {item.itemId}
              </span>
              <span className="font-pixel text-[6px] text-game-warning/80 shrink-0">
                {item.daysUntilThreshold > 0 ? `${item.daysUntilThreshold}d left` : "OVERDUE"}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.section>
  );
}

function Stat({ value, label, alert }: { value: number | string; label: string; alert?: boolean }) {
  return (
    <div>
      <p className={`font-pixel text-sm ${alert ? "text-game-error" : "text-white"}`}>
        {value}
      </p>
      <p className="font-pixel text-[6px] text-game-accent/50 mt-0.5">{label}</p>
    </div>
  );
}

function RetentionDot({ retention }: { retention: number }) {
  const fill = retention >= 80 ? "var(--game-success)"
    : retention >= 50 ? "var(--game-warning)"
    : "var(--game-error)";
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="3" fill={fill} style={{ filter: `drop-shadow(0 0 2px ${fill})` }} />
    </svg>
  );
}
