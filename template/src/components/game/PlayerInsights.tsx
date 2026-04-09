"use client";

import { motion } from "framer-motion";
import { UserProgress, ContentItem } from "@/types/game";
import { getLearningAnalytics } from "@/lib/storage";
import {
  computeCategoryStrengths,
  findWeakestItems,
  computeMasteryRate,
  CategoryStrength,
  WeakItem,
} from "@/lib/insights";
import { formatTime } from "@/lib/formatters";
import { LearningVelocity } from "@/components/game/LearningVelocity";
import { RecallRewards } from "@/components/game/RecallRewards";
import { DailyChallengeBanner } from "@/components/game/DailyChallengeBanner";
import { useState, useEffect } from "react";

interface PlayerInsightsProps {
  progress: UserProgress;
  items?: ContentItem[];
  onStartDailyChallenge?: (challenge: import("@/lib/dailyChallenge").DailyChallenge) => void;
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function BarFill({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 bg-game-black/60 w-full" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className={`h-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

export function PlayerInsights({ progress, items = [], onStartDailyChallenge }: PlayerInsightsProps) {
  const [analytics, setAnalytics] = useState<ReturnType<typeof getLearningAnalytics> | null>(null);

  useEffect(() => {
    setAnalytics(getLearningAnalytics());
  }, []);

  if (!analytics) return null;

  const strengths: CategoryStrength[] = items.length > 0
    ? computeCategoryStrengths(items, progress.itemScores)
    : [];
  const weakItems: WeakItem[] = findWeakestItems(progress.itemScores, 3);
  const masteryRate = computeMasteryRate(analytics.totalItemsSeen, analytics.itemsMastered);
  const hasData = analytics.totalItemsSeen > 0;

  if (!hasData) {
    return (
      <motion.div className="text-center py-8 space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="font-pixel text-xs text-game-accent">NO DATA YET</p>
        <p className="font-pixel text-[8px] text-game-accent/60">PLAY SOME LEVELS TO SEE YOUR INSIGHTS</p>
      </motion.div>
    );
  }

  return (
    <motion.div className="w-full max-w-md mx-auto space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* ─── Daily Challenge ─── */}
      {items.length > 0 && (
        <DailyChallengeBanner items={items as ContentItem[]} onStartChallenge={onStartDailyChallenge} />
      )}

      {/* ─── Overview Stats ─── */}
      <motion.section variants={fadeUp} className="pixel-border bg-game-dark/40 p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-game-primary neon-glow tracking-wider">LEARNING PULSE</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCell label="SEEN" value={analytics.totalItemsSeen} />
          <StatCell label="MASTERED" value={analytics.itemsMastered} color="text-game-success" />
          <StatCell label="MASTERY" value={`${masteryRate}%`} color={masteryRate >= 60 ? "text-game-success" : "text-game-warning"} />
          <StatCell label="AVG TIME" value={analytics.averageTimeToMastery > 0 ? formatTime(analytics.averageTimeToMastery / 1000) : "—"} />
        </div>
        <div className="space-y-1 pt-1">
          <div className="flex justify-between font-pixel text-[8px]">
            <span className="text-game-accent">7-DAY RECALL</span>
            <span className={analytics.retentionRate7Day >= 70 ? "text-game-success" : "text-game-warning"}>{analytics.retentionRate7Day}%</span>
          </div>
          <BarFill value={analytics.retentionRate7Day} color={analytics.retentionRate7Day >= 70 ? "bg-game-success" : "bg-game-warning"} />
          <div className="flex justify-between font-pixel text-[8px] pt-1">
            <span className="text-game-accent">30-DAY RECALL</span>
            <span className={analytics.retentionRate30Day >= 50 ? "text-game-success" : "text-game-error"}>{analytics.retentionRate30Day}%</span>
          </div>
          <BarFill value={analytics.retentionRate30Day} color={analytics.retentionRate30Day >= 50 ? "bg-game-success" : "bg-game-error"} />
        </div>
      </motion.section>

      {/* ─── Learning Velocity ─── */}
      <LearningVelocity />

      {/* ─── Recall Rewards ─── */}
      <RecallRewards />

      {/* ─── Category Strengths ─── */}
      {strengths.length > 0 && (
        <motion.section variants={fadeUp} className="pixel-border bg-game-dark/40 p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-game-accent neon-glow tracking-wider">CATEGORY STRENGTH</h3>
          {strengths.map((cat) => (
            <div key={cat.categoryId} className="space-y-1">
              <div className="flex justify-between font-pixel text-[8px]">
                <span className="text-white uppercase truncate max-w-[60%]">{cat.categoryId.replace(/[_-]/g, " ")}</span>
                <span className={cat.accuracy >= 80 ? "text-game-success" : cat.accuracy >= 60 ? "text-game-warning" : "text-game-error"}>
                  {cat.accuracy}%
                </span>
              </div>
              <BarFill value={cat.accuracy} color={cat.accuracy >= 80 ? "bg-game-primary" : cat.accuracy >= 60 ? "bg-game-warning" : "bg-game-error"} />
            </div>
          ))}
        </motion.section>
      )}

      {/* ─── Weakest Items ─── */}
      {weakItems.length > 0 && (
        <motion.section variants={fadeUp} className="pixel-border bg-game-dark/40 p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-game-error neon-glow tracking-wider">NEEDS WORK</h3>
          {weakItems.map((item) => (
            <div key={item.itemId} className="flex justify-between items-center font-pixel text-[8px]">
              <span className="text-white truncate max-w-[50%]">{item.itemId.replace(/[_-]/g, " ")}</span>
              <div className="flex gap-3">
                <span className="text-game-success">{item.correct}✓</span>
                <span className="text-game-error">{item.incorrect}✗</span>
                <span className="text-game-accent/60">{item.daysSinceReview}d</span>
              </div>
            </div>
          ))}
        </motion.section>
      )}
    </motion.div>
  );
}

function StatCell({ label, value, color = "text-white" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <p className={`font-pixel text-sm ${color}`}>{value}</p>
      <p className="font-pixel text-[7px] text-game-accent/70 mt-1">{label}</p>
    </div>
  );
}
