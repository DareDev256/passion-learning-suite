"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { computeVelocity, VelocityReport, VelocityTrend } from "@/lib/learningVelocity";

const TREND_CONFIG: Record<VelocityTrend, { label: string; icon: string; color: string }> = {
  improving:    { label: "ACCELERATING", icon: "▲", color: "text-emerald-400" },
  declining:    { label: "DECELERATING", icon: "▼", color: "text-rose-400" },
  steady:       { label: "CRUISING",     icon: "●", color: "text-cyan-400" },
  insufficient: { label: "WARMING UP",   icon: "◌", color: "text-amber-400" },
};

/** Build an SVG polyline path from session accuracy values, scaled to viewBox. */
function sparklinePath(values: number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const step = width / (values.length - 1);
  const max = Math.max(...values, 1);
  return values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - (v / max) * height * 0.85 - height * 0.05).toFixed(1)}`)
    .join(" ");
}

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function LearningVelocity() {
  const [report, setReport] = useState<VelocityReport | null>(null);

  useEffect(() => {
    setReport(computeVelocity());
  }, []);

  if (!report || report.sessions.length === 0) return null;

  const cfg = TREND_CONFIG[report.trend];
  const accuracies = report.sessions.map((s) => s.accuracy);
  const W = 200;
  const H = 48;
  const points = sparklinePath(accuracies, W, H);
  const avgPct = Math.round(report.averageVelocity * 100);
  const curPct = Math.round(report.currentVelocity * 100);

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="pixel-border bg-game-dark/40 p-4 space-y-3"
      aria-label="Learning velocity"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-pixel text-[10px] text-game-primary neon-glow tracking-wider">
          VELOCITY
        </h3>
        <span className={`font-pixel text-[9px] ${cfg.color} flex items-center gap-1`}>
          <span aria-hidden="true">{cfg.icon}</span> {cfg.label}
        </span>
      </div>

      {/* Sparkline */}
      {points && (
        <div className="relative" role="img" aria-label={`Session accuracy trend over ${report.sessions.length} sessions`}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cfg.color.replace("text-", "text-")}
              style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
            />
            {/* Endpoint dot */}
            {accuracies.length >= 2 && (
              <circle
                cx={W}
                cy={H - (accuracies[accuracies.length - 1] / Math.max(...accuracies, 1)) * H * 0.85 - H * 0.05}
                r="3"
                fill="currentColor"
                className={cfg.color.replace("text-", "text-")}
                style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
              />
            )}
          </svg>
        </div>
      )}

      {/* Stats row */}
      <div className="flex justify-between font-pixel text-[8px]">
        <div className="text-center">
          <p className="text-white text-sm">{curPct}%</p>
          <p className="text-game-accent/70 mt-0.5">THIS SESSION</p>
        </div>
        <div className="text-center">
          <p className="text-white text-sm">{avgPct}%</p>
          <p className="text-game-accent/70 mt-0.5">AVG MASTERY</p>
        </div>
        <div className="text-center">
          <p className="text-white text-sm">{report.sessions.length}</p>
          <p className="text-game-accent/70 mt-0.5">SESSIONS</p>
        </div>
      </div>
    </motion.section>
  );
}
