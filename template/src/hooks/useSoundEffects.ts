"use client";

import { useCallback, useRef, useState } from "react";

// ─── Sound Design for Learning Games ───
// Research-backed: ascending chime on correct, soft tone on incorrect,
// celebration on milestones. All Web Audio API — zero external files.

interface SoundSettings {
  enabled: boolean;
  sfxVolume: number;    // 0-1
  musicVolume: number;  // 0-1
}

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  sfxVolume: 0.5,
  musicVolume: 0.3,
};

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [settings, setSettings] = useState<SoundSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem("pl_sound_settings");
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = "sine", volume?: number) => {
      if (!settings.enabled) return;
      try {
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime((volume ?? settings.sfxVolume) * 0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Silently fail if AudioContext unavailable
      }
    },
    [settings, getContext]
  );

  // Ascending chime — correct answer
  const playCorrect = useCallback(() => {
    playTone(523, 0.1, "sine");  // C5
    setTimeout(() => playTone(659, 0.1, "sine"), 80);  // E5
    setTimeout(() => playTone(784, 0.15, "sine"), 160); // G5
  }, [playTone]);

  // Soft low tone — incorrect answer (NOT a buzzer)
  const playIncorrect = useCallback(() => {
    playTone(220, 0.3, "triangle"); // A3, gentle triangle wave
  }, [playTone]);

  // Celebration chord — level complete
  const playCelebration = useCallback(() => {
    playTone(523, 0.2, "sine");  // C5
    setTimeout(() => playTone(659, 0.2, "sine"), 100);  // E5
    setTimeout(() => playTone(784, 0.2, "sine"), 200);  // G5
    setTimeout(() => playTone(1047, 0.4, "sine"), 300); // C6
  }, [playTone]);

  // Click — UI interaction
  const playClick = useCallback(() => {
    playTone(800, 0.05, "square", 0.15);
  }, [playTone]);

  // Streak milestone
  const playStreakMilestone = useCallback(() => {
    [523, 587, 659, 784, 880, 1047].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.15, "sine"), i * 80);
    });
  }, [playTone]);

  // Time warning
  const playTimeWarning = useCallback(() => {
    playTone(440, 0.08, "square", 0.2);
  }, [playTone]);

  const updateSettings = useCallback((updates: Partial<SoundSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      if (typeof window !== "undefined") {
        localStorage.setItem("pl_sound_settings", JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  return {
    settings,
    updateSettings,
    toggleMute,
    playCorrect,
    playIncorrect,
    playCelebration,
    playClick,
    playStreakMilestone,
    playTimeWarning,
  };
}
