"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { buildSessionHistory, SessionHistoryData } from "@/lib/sessionHistory";

const TREND_CONFIG = {
  up:   { label: "IMPROVING", icon: "▲", color: "text-emerald-400" },
  down: { label: "SLIPPING",  icon: "▼", color: "text-rose-400" },
  flat: { label: "STEADY",    icon: "─", color: "text-cyan-400" },
  new:  { label: "JUST STARTED", icon: "◌", color: "text-amber-400" },
} as const;

function sparklinePath(values: number[], w: number, h: number): string {
  if (values.length < 2) return "";
  const step = w / (values.length - 1);
  return values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - (v / 100) * h * 0.8 - h * 0.1).toFixed(1)}`)
    .join(" ");
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60_000);
  return mins < 1 ? "<1m" : `${mins}m`;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function SessionHistory() {
  const [data] = useState<SessionHistoryData | null>(() =>
    typeof window === "undefined" ? null : buildSessionHistory(8)
  );

  if (!data || data.totalSessions === 0) {
    return (
      <motion.div
        className="text-center py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="font-pixel text-[8px] text-game-accent/50">NO SESSIONS YET — PLAY TO BUILD YOUR TIMELINE</p>
      </motion.div>
    );
  }

  const trend = TREND_CONFIG[data.trendDirection];

  return (
    <motion.div
      className="w-full max-w-md mx-auto space-y-4"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header row */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <h3 className="font-pixel text-[10px] text-game-primary neon-glow tracking-wider">SESSION HISTORY</h3>
        <span className={`font-pixel text-[8px] ${trend.color}`}>
          {trend.icon} {trend.label}
        </span>
      </motion.div>

      {/* Stats bar */}
      <motion.div variants={fadeUp} className="pixel-border bg-game-dark/50 p-3 flex justify-between">
        <Stat label="SESSIONS" value={String(data.totalSessions)} />
        <Stat label="AVG ACC" value={`${data.averageAccuracy}%`} />
        <Stat label="BEST" value={`${data.bestAccuracy}%`} color="text-amber-400" />
      </motion.div>

      {/* Accuracy sparkline */}
      {data.accuracyTrend.length >= 2 && (
        <motion.div variants={fadeUp} className="pixel-border bg-game-dark/40 p-3">
          <p className="font-pixel text-[7px] text-game-accent/60 mb-2">ACCURACY TREND</p>
          <svg viewBox="0 0 200 40" className="w-full h-10" aria-label="Accuracy trend sparkline">
            <polyline
              points={sparklinePath(data.accuracyTrend, 200, 40)}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-game-primary"
              strokeLinejoin="round"
            />
            {/* Endpoint dot */}
            {(() => {
              const pts = sparklinePath(data.accuracyTrend, 200, 40);
              const last = pts.split(" ").pop();
              if (!last) return null;
              const [cx, cy] = last.split(",");
              return <circle cx={cx} cy={cy} r="2.5" className="fill-game-primary" />;
            })()}
          </svg>
        </motion.div>
      )}

      {/* Timeline entries */}
      <motion.div variants={fadeUp} className="space-y-1">
        <p className="font-pixel text-[7px] text-game-accent/60 mb-2">RECENT SESSIONS</p>
        {data.entries.map((entry, i) => {
          const accColor = entry.accuracy >= 80 ? "text-emerald-400"
            : entry.accuracy >= 60 ? "text-amber-400"
            : "text-rose-400";
          return (
            <motion.div
              key={entry.timestamp}
              className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0"
              variants={fadeUp}
            >
              {/* Day + time */}
              <div className="w-16 shrink-0">
                <p className="font-pixel text-[8px] text-white/80">{entry.dayLabel}</p>
                <p className="font-pixel text-[6px] text-white/40">{entry.timeLabel}</p>
              </div>

              {/* Accuracy bar */}
              <div className="flex-1 h-1.5 bg-game-black/60">
                <motion.div
                  className={`h-full ${entry.accuracy >= 80 ? "bg-emerald-500" : entry.accuracy >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${entry.accuracy}%` }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 + i * 0.03 }}
                />
              </div>

              {/* Stats */}
              <span className={`font-pixel text-[8px] w-8 text-right shrink-0 ${accColor}`}>
                {entry.accuracy}%
              </span>
              <span className="font-pixel text-[6px] text-white/40 w-10 text-right shrink-0">
                {entry.correctCount}/{entry.itemsSeen}
              </span>
              <span className="font-pixel text-[6px] text-white/30 w-6 text-right shrink-0">
                {formatDuration(entry.durationMs)}
              </span>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className="font-pixel text-[6px] text-game-accent/50">{label}</p>
      <p className={`font-pixel text-[10px] ${color ?? "text-white"}`}>{value}</p>
    </div>
  );
}
