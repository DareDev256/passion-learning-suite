"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { LearningEvent } from "@/lib/storage";
import { buildHeatmap, HeatmapData, DayActivity } from "@/lib/activityHeatmap";

const INTENSITY_COLORS = [
  "bg-white/5",        // 0 — empty
  "bg-emerald-900/70", // 1 — light
  "bg-emerald-700/80", // 2 — medium
  "bg-emerald-500",    // 3 — strong
  "bg-emerald-400",    // 4 — max
] as const;

const DAY_LABELS = ["", "M", "", "W", "", "F", ""] as const;

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface ActivityHeatmapProps {
  weeks?: number;
}

function loadEvents(): LearningEvent[] {
  if (typeof window === "undefined") return [];
  try {
    // Read from the same key as storage.ts analytics
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ActivityHeatmap({ weeks = 12 }: ActivityHeatmapProps) {
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null);

  useEffect(() => {
    setEvents(loadEvents());
  }, []);

  const heatmap: HeatmapData = useMemo(() => buildHeatmap(events, weeks), [events, weeks]);

  // Organize days into columns (weeks) for the grid
  const columns: DayActivity[][] = [];
  for (let i = 0; i < heatmap.days.length; i += 7) {
    columns.push(heatmap.days.slice(i, i + 7));
  }

  return (
    <motion.div
      className="w-full max-w-md mx-auto"
      variants={fadeUp}
      initial="hidden"
      animate="show"
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="pixel-border bg-game-dark/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-pixel text-[10px] text-game-primary neon-glow tracking-wider">
            ACTIVITY
          </h3>
          {hoveredDay && hoveredDay.count > 0 && (
            <span className="font-pixel text-[7px] text-game-accent">
              {hoveredDay.count} event{hoveredDay.count !== 1 ? "s" : ""} · {formatDate(hoveredDay.date)}
            </span>
          )}
        </div>

        {/* Heatmap grid */}
        <div className="flex gap-[2px]" role="img" aria-label={`Activity heatmap: ${heatmap.totalActiveDays} active days, ${heatmap.currentStreak} day streak`}>
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] mr-1">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="w-3 h-[10px] flex items-center">
                <span className="font-pixel text-[5px] text-game-accent/50">{label}</span>
              </div>
            ))}
          </div>

          {/* Week columns */}
          {columns.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day) => (
                <motion.div
                  key={day.date}
                  className={`w-[10px] h-[10px] ${INTENSITY_COLORS[day.intensity]} cursor-default transition-colors`}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  whileHover={{ scale: 1.4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  title={`${formatDate(day.date)}: ${day.count} event${day.count !== 1 ? "s" : ""}`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex justify-between items-center pt-1">
          <div className="flex gap-3">
            <StatPill label="ACTIVE" value={`${heatmap.totalActiveDays}d`} />
            <StatPill label="STREAK" value={`${heatmap.currentStreak}d`} color={heatmap.currentStreak > 0 ? "text-emerald-400" : undefined} />
            <StatPill label="BEST" value={`${heatmap.bestStreak}d`} color="text-amber-400" />
          </div>
          {/* Intensity legend */}
          <div className="flex items-center gap-[2px]">
            <span className="font-pixel text-[5px] text-game-accent/40 mr-1">LESS</span>
            {INTENSITY_COLORS.map((color, i) => (
              <div key={i} className={`w-[8px] h-[8px] ${color}`} />
            ))}
            <span className="font-pixel text-[5px] text-game-accent/40 ml-1">MORE</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatPill({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`font-pixel text-[9px] ${color}`}>{value}</p>
      <p className="font-pixel text-[5px] text-game-accent/50">{label}</p>
    </div>
  );
}
