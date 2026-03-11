"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TimerProps {
  duration: number;      // seconds
  onTimeUp: () => void;
  isRunning: boolean;
  warningAt?: number;    // seconds remaining to trigger warning
}

export function Timer({ duration, onTimeUp, isRunning, warningAt = 5 }: TimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isWarning = remaining <= warningAt && remaining > 0;

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRunning) {
      cleanup();
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          cleanup();
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return cleanup;
  }, [isRunning, cleanup, onTimeUp]);

  // Reset when duration changes
  useEffect(() => {
    setRemaining(duration);
  }, [duration]);

  const pct = (remaining / duration) * 100;

  return (
    <div className="w-full max-w-md mx-auto mb-4">
      <div className="flex justify-between mb-1">
        <span className={`font-pixel text-[10px] ${isWarning ? "text-game-error animate-blink" : "text-game-accent"}`}>
          {remaining}s
        </span>
      </div>
      <div className="h-2 bg-game-dark border border-game-primary/30">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${isWarning ? "bg-game-error" : "bg-game-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
