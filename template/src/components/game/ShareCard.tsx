"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameResults } from "@/types/game";
import { computeGrade } from "@/lib/formatters";
import { shareResults, type ShareData } from "@/lib/share";

interface ShareCardProps {
  results: GameResults;
  gameName: string;
  streak?: number;
  level?: number;
  gameUrl?: string;
}

const GRADE_CONFIG: Record<string, { color: string; label: string }> = {
  S: { color: "text-game-warning", label: "LEGENDARY" },
  A: { color: "text-game-primary", label: "EXCELLENT" },
  B: { color: "text-game-accent", label: "GREAT" },
  C: { color: "text-game-secondary", label: "GOOD" },
  D: { color: "text-game-error", label: "KEEP GOING" },
  F: { color: "text-game-error", label: "TRY AGAIN" },
};

/**
 * Retro-styled shareable score card for social media.
 * Renders after level completion with share/copy functionality.
 * Uses Web Share API on mobile, clipboard fallback on desktop.
 */
export function ShareCard({ results, gameName, streak, level, gameUrl }: ShareCardProps) {
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared" | "failed">("idle");
  const grade = computeGrade(results.accuracy);
  const config = GRADE_CONFIG[grade] ?? GRADE_CONFIG.F;

  const handleShare = useCallback(async () => {
    const data: ShareData = { results, gameName, streak, level, gameUrl };
    const result = await shareResults(data);
    setShareState(result);
    if (result === "copied") {
      setTimeout(() => setShareState("idle"), 2000);
    }
  }, [results, gameName, streak, level, gameUrl]);

  return (
    <motion.div
      className="relative w-full max-w-xs mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, type: "spring", bounce: 0.3 }}
    >
      {/* Card */}
      <div
        className="pixel-border bg-game-black/80 p-4 space-y-3"
        role="region"
        aria-label="Shareable score card"
      >
        {/* Header */}
        <div className="text-center">
          <div className="font-pixel text-[8px] text-game-accent/60 tracking-widest uppercase">
            {gameName}
          </div>
          <div className={`font-pixel text-3xl ${config.color} neon-glow mt-1`}>
            {grade}
          </div>
          <div className={`font-pixel text-[7px] ${config.color} mt-1`}>
            {config.label}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <StatBlock label="ACC" value={`${results.accuracy}%`} />
          <StatBlock label="SCORE" value={`${results.correctAnswers}/${results.totalQuestions}`} />
          {streak && streak > 1 && (
            <StatBlock label="STREAK" value={`${streak}d 🔥`} />
          )}
          {level && (
            <StatBlock label="LEVEL" value={`${level}`} />
          )}
        </div>

        {/* Decorative separator */}
        <div className="border-t border-game-primary/30" aria-hidden="true" />

        {/* Share button */}
        <button
          onClick={handleShare}
          className="btn-retro w-full py-2 px-3 font-pixel text-[8px] bg-game-primary/10 border border-game-primary/40 text-game-primary hover:bg-game-primary/20 transition-colors"
          aria-label={`Share your ${grade} rank score`}
        >
          <AnimatePresence mode="wait">
            {shareState === "copied" ? (
              <motion.span
                key="copied"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-game-success"
              >
                ✓ COPIED TO CLIPBOARD
              </motion.span>
            ) : shareState === "shared" ? (
              <motion.span
                key="shared"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-game-success"
              >
                ✓ SHARED
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                ⬆ SHARE SCORE
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-game-dark/60 p-2 border border-game-primary/10">
      <div className="font-pixel text-[6px] text-game-accent/50">{label}</div>
      <div className="font-pixel text-[10px] text-white mt-0.5">{value}</div>
    </div>
  );
}
