"use client";

import { motion } from "framer-motion";
import { CategoryStrength } from "@/lib/insights";
import {
  computeRadarPoints,
  pointsToPolygon,
  computeAxisEndpoints,
  polarToCartesian,
} from "@/lib/categoryRadar";

interface CategoryRadarProps {
  strengths: CategoryStrength[];
  /** SVG viewBox size — radar fills this square. Default 280 */
  size?: number;
}

const RINGS = [25, 50, 75, 100];

export function CategoryRadar({ strengths, size = 280 }: CategoryRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36; // leave room for labels

  const points = computeRadarPoints(strengths, radius, cx, cy);
  const axes = computeAxisEndpoints(strengths.length, radius, cx, cy);
  const labelEndpoints = computeAxisEndpoints(
    strengths.length,
    radius + 22,
    cx,
    cy,
  );

  if (points.length < 3) {
    return (
      <div className="text-center py-6">
        <p className="font-pixel text-[8px] text-game-accent/60">
          NEED 3+ CATEGORIES FOR RADAR
        </p>
      </div>
    );
  }

  const polygon = pointsToPolygon(points);
  // Average accuracy for center label
  const avgAccuracy = Math.round(
    strengths.reduce((sum, s) => sum + s.accuracy, 0) / strengths.length,
  );

  return (
    <motion.div
      className="w-full max-w-xs mx-auto"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      role="img"
      aria-label={`Category mastery radar: ${strengths.map((s) => `${s.categoryId.replace(/[_-]/g, " ")} ${s.accuracy}%`).join(", ")}`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="radar-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Concentric rings */}
        {RINGS.map((pct) => {
          const r = (pct / 100) * radius;
          const ringPts = computeAxisEndpoints(strengths.length, r, cx, cy);
          const ringPolygon = ringPts
            .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(" ");
          return (
            <polygon
              key={pct}
              points={ringPolygon}
              fill="none"
              stroke="var(--game-primary)"
              strokeOpacity={pct === 100 ? 0.3 : 0.12}
              strokeWidth={pct === 100 ? 1.5 : 1}
            />
          );
        })}

        {/* Axis lines from center */}
        {axes.map((end, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="var(--game-primary)"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        ))}

        {/* Mastery polygon — animated fill */}
        <motion.polygon
          points={polygon}
          fill="var(--game-primary)"
          fillOpacity={0.15}
          stroke="var(--game-primary)"
          strokeWidth={2}
          filter="url(#radar-glow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        />

        {/* Data point dots */}
        {points.map((pt, i) => (
          <motion.circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={3}
            fill="var(--game-primary)"
            filter="url(#radar-glow)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 300 }}
          />
        ))}

        {/* Category labels */}
        {labelEndpoints.map((end, i) => {
          const cat = strengths[i];
          const label = cat.categoryId.replace(/[_-]/g, " ").toUpperCase();
          // Truncate long labels
          const display = label.length > 10 ? label.slice(0, 9) + "…" : label;
          const anchor =
            Math.abs(end.x - cx) < 2 ? "middle" : end.x > cx ? "start" : "end";

          return (
            <text
              key={i}
              x={end.x}
              y={end.y}
              textAnchor={anchor}
              dominantBaseline="central"
              className="font-pixel"
              fill={cat.accuracy >= 70 ? "var(--game-success)" : cat.accuracy >= 40 ? "var(--game-warning)" : "var(--game-error)"}
              fontSize={7}
              opacity={0.9}
            >
              {display}
            </text>
          );
        })}

        {/* Center accuracy label */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="font-pixel"
          fill="var(--game-primary)"
          fontSize={14}
          filter="url(#radar-glow)"
        >
          {avgAccuracy}%
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          className="font-pixel"
          fill="var(--game-accent)"
          fontSize={6}
          opacity={0.7}
        >
          AVG
        </text>
      </svg>
    </motion.div>
  );
}
