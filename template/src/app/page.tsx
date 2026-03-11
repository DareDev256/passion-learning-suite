"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { XPBar } from "@/components/ui/XPBar";
import { useProgress } from "@/hooks/useProgress";

// OVERRIDE these per game
const GAME_TITLE = "GAME NAME";
const GAME_SUBTITLE = "A Passionate Learning Game";
const GAME_TAGLINE = "LEARN AI THROUGH PLAY";

export default function Home() {
  const { progress, isLoading } = useProgress();

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-xs text-game-primary animate-pulse-neon">
          LOADING...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 relative">
      {/* Decorative corners */}
      <div className="fixed top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-game-primary/30" />
      <div className="fixed top-4 right-16 w-8 h-8 border-t-2 border-r-2 border-game-primary/30" />
      <div className="fixed bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-game-primary/30" />
      <div className="fixed bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-game-primary/30" />

      {progress && <StreakBadge streak={progress.streak} />}

      <Logo title={GAME_TITLE} subtitle={GAME_SUBTITLE} />

      {progress && <XPBar xp={progress.xp} level={progress.level} />}

      <motion.div
        className="flex flex-col gap-4 items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button href="/play" variant="primary">
          START GAME
        </Button>
        <Button href="/categories" variant="secondary">
          CATEGORIES
        </Button>
      </motion.div>

      <motion.p
        className="font-pixel text-[8px] text-game-accent/60 mt-12 animate-blink"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {GAME_TAGLINE}
      </motion.p>

      <motion.p
        className="font-pixel text-[8px] text-game-primary/40 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        PASSIONATE LEARNING by DAREDEV256
      </motion.p>
    </main>
  );
}
