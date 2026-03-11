"use client";

import { motion } from "framer-motion";
import { GameResults } from "@/types/game";
import { Button } from "@/components/ui/Button";

interface VictoryScreenProps {
  results: GameResults;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
  speedLabel?: string;   // "WPM", "Time", etc.
}

export function VictoryScreen({
  results,
  onPlayAgain,
  onBackToMenu,
  speedLabel = "Speed",
}: VictoryScreenProps) {
  const grade =
    results.accuracy >= 95 ? "S" :
    results.accuracy >= 90 ? "A" :
    results.accuracy >= 80 ? "B" :
    results.accuracy >= 70 ? "C" :
    results.accuracy >= 60 ? "D" : "F";

  const gradeColor =
    grade === "S" ? "text-game-warning" :
    grade === "A" ? "text-game-primary" :
    grade === "B" ? "text-game-accent" :
    "text-game-error";

  return (
    <motion.div
      className="text-center space-y-6"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <motion.div
        className={`font-pixel text-6xl ${gradeColor} neon-glow`}
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
      >
        {grade}
      </motion.div>

      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-between max-w-xs mx-auto font-pixel text-xs"
        >
          <span className="text-game-accent">ACCURACY</span>
          <span className="text-white">{results.accuracy}%</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-between max-w-xs mx-auto font-pixel text-xs"
        >
          <span className="text-game-accent">{speedLabel.toUpperCase()}</span>
          <span className="text-white">{results.speed}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-between max-w-xs mx-auto font-pixel text-xs"
        >
          <span className="text-game-accent">CORRECT</span>
          <span className="text-white">{results.correctAnswers}/{results.totalQuestions}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="flex justify-between max-w-xs mx-auto font-pixel text-xs"
        >
          <span className="text-game-warning">+{results.xp} XP</span>
        </motion.div>
      </div>

      <motion.div
        className="flex gap-4 justify-center pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <Button onClick={onPlayAgain} variant="primary">
          PLAY AGAIN
        </Button>
        <Button onClick={onBackToMenu} variant="secondary">
          MENU
        </Button>
      </motion.div>
    </motion.div>
  );
}
