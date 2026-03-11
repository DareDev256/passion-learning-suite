"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface GameStats {
  correct: number;
  incorrect: number;
  total: number;
  accuracy: number;
  elapsedSeconds: number;
  startTime: number | null;
}

const initialStats: GameStats = {
  correct: 0,
  incorrect: 0,
  total: 0,
  accuracy: 100,
  elapsedSeconds: 0,
  startTime: null,
};

export function useGameStats() {
  const [stats, setStats] = useState<GameStats>(initialStats);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTracking = useCallback(() => {
    const now = Date.now();
    setStats((prev) => ({ ...prev, startTime: now }));

    intervalRef.current = setInterval(() => {
      setStats((prev) => {
        if (!prev.startTime) return prev;
        return {
          ...prev,
          elapsedSeconds: Math.floor((Date.now() - prev.startTime) / 1000),
        };
      });
    }, 1000);
  }, []);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const recordAnswer = useCallback((isCorrect: boolean) => {
    setStats((prev) => {
      const newCorrect = prev.correct + (isCorrect ? 1 : 0);
      const newIncorrect = prev.incorrect + (isCorrect ? 0 : 1);
      const newTotal = prev.total + 1;
      return {
        ...prev,
        correct: newCorrect,
        incorrect: newIncorrect,
        total: newTotal,
        accuracy: newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 100,
      };
    });
  }, []);

  const reset = useCallback(() => {
    stopTracking();
    setStats(initialStats);
  }, [stopTracking]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { stats, startTracking, stopTracking, recordAnswer, reset };
}
