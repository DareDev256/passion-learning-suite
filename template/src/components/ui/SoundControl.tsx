"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { loadSoundPrefs, saveSoundPrefs, playTick, type SoundPrefs } from "@/lib/soundEngine";

export function SoundControl() {
  const [prefs, setPrefs] = useState<SoundPrefs>(loadSoundPrefs);

  const toggle = useCallback(() => {
    const next = { ...prefs, muted: !prefs.muted };
    saveSoundPrefs(next);
    setPrefs(next);
    if (!next.muted) playTick();
  }, [prefs]);

  const setVolume = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      const next = { ...prefs, volume: vol, muted: vol === 0 };
      saveSoundPrefs(next);
      setPrefs(next);
    },
    [prefs],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm"
      role="group"
      aria-label="Sound controls"
    >
      <button
        onClick={toggle}
        className="text-sm hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
        aria-label={prefs.muted ? "Unmute sounds" : "Mute sounds"}
        type="button"
      >
        {prefs.muted ? "🔇" : prefs.volume > 0.5 ? "🔊" : "🔉"}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={prefs.muted ? 0 : prefs.volume}
        onChange={setVolume}
        className="w-16 h-1 accent-cyan-400 cursor-pointer"
        aria-label="Volume"
      />
    </motion.div>
  );
}
