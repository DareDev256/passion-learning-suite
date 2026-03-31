"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { LearningEvent } from "@/lib/storage";
import {
  computeRetentionCurve,
  retentionToSVG,
  pointsToPath,
  RETENTION_DAYS,
  RetentionCurveData,
} from "@/lib/retentionCurve";

const W = 320;
const H = 200;
const PAD = 36;

function loadAllEvents(): LearningEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const keys = Object.keys(localStorage).filter((k) => k.endsWith("_analytics"));
    const events: LearningEvent[] = [];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) events.push(...parsed);
    }
    return events;
  } catch {
    return [];
  }
}

function RetentionLabel({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-pixel text-[11px] text-game-primary" style={{ filter: "drop-shadow(0 0 4px var(--game-primary))" }}>
        {value}
      </div>
      <div className="font-pixel text-[6px] text-game-accent/60 uppercase mt-0.5">{label}</div>
    </div>
  );
}

export function RetentionCurve() {
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => { setEvents(loadAllEvents()); }, []);

  const curve: RetentionCurveData = useMemo(() => computeRetentionCurve(events), [events]);

  // SVG coords for theoretical curve
  const theoreticalCoords = curve.points.map((p) =>
    retentionToSVG(p.day, p.theoretical, W, H, PAD),
  );
  const theoreticalPath = pointsToPath(theoreticalCoords);

  // SVG coords for actual data points (only where data exists)
  const actualCoords = curve.points
    .filter((p) => p.actual !== null)
    .map((p) => retentionToSVG(p.day, p.actual!, W, H, PAD));
  const actualPath = actualCoords.length >= 2 ? pointsToPath(actualCoords) : "";

  // Y-axis grid lines
  const yTicks = [0, 25, 50, 75, 100];

  const hasData = curve.totalReviews > 0;

  return (
    <motion.div
      className="w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      role="img"
      aria-label={`Retention curve: ${curve.overallRetention}% overall retention across ${curve.totalReviews} reviews`}
    >
      {/* Stats pills */}
      <div className="flex justify-center gap-4 mb-3">
        <RetentionLabel value={`${curve.overallRetention}%`} label="retention" />
        <RetentionLabel value={curve.totalReviews} label="reviews" />
        <RetentionLabel
          value={hasData ? (curve.points.find((p) => p.day === 7)?.actual ?? "—") + "%" : "—"}
          label="7-day"
        />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <filter id="curve-glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="actual-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--game-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--game-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid */}
        {yTicks.map((pct) => {
          const { y } = retentionToSVG(0, pct, W, H, PAD);
          return (
            <g key={pct}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--game-primary)" strokeOpacity={0.08} strokeWidth={1} />
              <text x={PAD - 4} y={y + 3} textAnchor="end" className="font-pixel" fill="var(--game-accent)" fillOpacity={0.4} fontSize={6}>
                {pct}%
              </text>
            </g>
          );
        })}

        {/* X-axis day labels */}
        {RETENTION_DAYS.map((day) => {
          const { x } = retentionToSVG(day, 0, W, H, PAD);
          return (
            <text key={day} x={x} y={H - PAD + 14} textAnchor="middle" className="font-pixel" fill="var(--game-accent)" fillOpacity={0.4} fontSize={6}>
              {day === 0 ? "NOW" : `${day}d`}
            </text>
          );
        })}

        {/* Theoretical curve — dashed, dim */}
        <motion.path
          d={theoreticalPath}
          fill="none"
          stroke="var(--game-warning)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeOpacity={0.4}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Actual retention curve — solid, glowing */}
        {actualPath && (
          <>
            {/* Fill area under actual curve */}
            <motion.path
              d={actualPath + `L${actualCoords[actualCoords.length - 1].x.toFixed(1)},${(H - PAD).toFixed(1)} L${actualCoords[0].x.toFixed(1)},${(H - PAD).toFixed(1)} Z`}
              fill="url(#actual-fill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            />
            <motion.path
              d={actualPath}
              fill="none"
              stroke="var(--game-primary)"
              strokeWidth={2}
              filter="url(#curve-glow)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
            />
          </>
        )}

        {/* Data point dots with hover */}
        {curve.points.map((p, i) => {
          if (p.actual === null) return null;
          const coord = retentionToSVG(p.day, p.actual, W, H, PAD);
          const beating = p.actual >= p.theoretical;
          return (
            <g key={p.day}>
              <motion.circle
                cx={coord.x}
                cy={coord.y}
                r={hoveredIdx === i ? 5 : 3.5}
                fill={beating ? "var(--game-success)" : "var(--game-error)"}
                filter="url(#curve-glow)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 300 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: "pointer" }}
              />
              {hoveredIdx === i && (
                <g>
                  <rect
                    x={coord.x - 28} y={coord.y - 26} width={56} height={18} rx={3}
                    fill="var(--game-bg, #0a0a0a)" stroke="var(--game-primary)" strokeOpacity={0.5} strokeWidth={0.5}
                  />
                  <text x={coord.x} y={coord.y - 14} textAnchor="middle" className="font-pixel" fill="var(--game-primary)" fontSize={7}>
                    {p.actual}% ({p.reviewCount})
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-px" style={{ background: "var(--game-warning)", opacity: 0.5 }} />
          <span className="font-pixel text-[6px] text-game-accent/50">THEORETICAL</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded" style={{ background: "var(--game-primary)" }} />
          <span className="font-pixel text-[6px] text-game-accent/50">YOUR MEMORY</span>
        </span>
      </div>

      {!hasData && (
        <p className="font-pixel text-[7px] text-game-accent/40 text-center mt-2">
          PLAY MORE TO SEE YOUR RETENTION CURVE
        </p>
      )}
    </motion.div>
  );
}
