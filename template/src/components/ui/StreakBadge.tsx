"use client";

import { motion } from "framer-motion";

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak <= 0) return null;

  return (
    <motion.div
      className="fixed top-4 right-4 flex items-center gap-2 bg-game-dark/80 px-4 py-2 pixel-border z-50"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <span className="text-game-warning streak-fire text-lg">
        {streak >= 7 ? "!!" : streak >= 3 ? "!" : "~"}
      </span>
      <span className="font-pixel text-xs text-game-warning">
        {streak} DAY{streak !== 1 ? "S" : ""}
      </span>
    </motion.div>
  );
}
