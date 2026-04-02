"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Achievement, getTrophyCase } from "@/lib/achievements";
import { useState, useEffect } from "react";

// ─── Toast: flies in when an achievement unlocks ───

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

const TIER_COLORS: Record<Achievement["tier"], string> = {
  bronze: "border-amber-600 text-amber-500",
  silver: "border-slate-300 text-slate-200",
  gold: "border-yellow-400 text-yellow-300",
};

const TIER_GLOW: Record<Achievement["tier"], string> = {
  bronze: "shadow-[0_0_12px_rgba(217,119,6,0.4)]",
  silver: "shadow-[0_0_12px_rgba(203,213,225,0.4)]",
  gold: "shadow-[0_0_20px_rgba(250,204,21,0.5)]",
};

export function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  useEffect(() => {
    if (!achievement) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [achievement, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          role="alert"
          aria-label={`Achievement unlocked: ${achievement.title}`}
          className={`fixed top-6 left-1/2 z-50 -translate-x-1/2 border-2 bg-game-black/95 backdrop-blur-sm px-5 py-3 flex items-center gap-3 ${TIER_COLORS[achievement.tier]} ${TIER_GLOW[achievement.tier]}`}
          initial={{ y: -80, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={onDismiss}
        >
          <span className="text-2xl" role="img" aria-hidden="true">{achievement.icon}</span>
          <div>
            <p className="font-pixel text-[8px] text-game-accent/70 tracking-widest">ACHIEVEMENT UNLOCKED</p>
            <p className="font-pixel text-[10px] mt-1">{achievement.title}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Trophy Case: shows all achievements with lock/unlock state ───

export function TrophyCase() {
  const [trophies, setTrophies] = useState<ReturnType<typeof getTrophyCase>>([]);

  useEffect(() => {
    setTrophies(getTrophyCase());
  }, []);

  const unlocked = trophies.filter((t) => t.unlocked).length;

  return (
    <motion.div
      className="w-full max-w-md mx-auto space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex justify-between items-baseline">
        <h3 className="font-pixel text-[10px] text-game-primary neon-glow tracking-wider">TROPHY CASE</h3>
        <span className="font-pixel text-[8px] text-game-accent/70">
          {unlocked}/{trophies.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {trophies.map((trophy) => (
          <motion.div
            key={trophy.id}
            className={`pixel-border p-3 text-center transition-colors ${
              trophy.unlocked
                ? `bg-game-dark/60 ${TIER_COLORS[trophy.tier]}`
                : "bg-game-black/40 border-white/10 opacity-40 grayscale"
            }`}
            whileHover={trophy.unlocked ? { scale: 1.05 } : {}}
            title={trophy.unlocked ? trophy.description : "???"}
          >
            <span className="text-xl block" role="img" aria-hidden="true">
              {trophy.unlocked ? trophy.icon : "🔒"}
            </span>
            <p className="font-pixel text-[6px] mt-2 leading-relaxed truncate">
              {trophy.unlocked ? trophy.title : "???"}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
