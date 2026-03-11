"use client";

import { useState, useEffect, useCallback } from "react";
import { UserProgress, Category } from "@/types/game";
import {
  getProgress,
  addXP,
  completeLevel,
  updateStreak,
  checkMastery,
} from "@/lib/storage";

export function useProgress(categories?: Category[]) {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setProgress(getProgress());
    setIsLoading(false);
  }, []);

  const earnXP = useCallback((amount: number) => {
    const updated = addXP(amount);
    setProgress(updated);
    return updated;
  }, []);

  const finishLevel = useCallback(
    (categoryId: string, levelId: number) => {
      const updated = completeLevel(categoryId, levelId);
      setProgress(updated);
      return updated;
    },
    []
  );

  const refreshStreak = useCallback(() => {
    const updated = updateStreak();
    setProgress(updated);
    return updated;
  }, []);

  const isLevelUnlocked = useCallback(
    (categoryId: string, levelId: number) => {
      if (!progress) return false;
      if (levelId === 1) return true; // First level always unlocked

      // Previous level must be completed AND mastered
      const prevKey = `${categoryId}-${levelId - 1}`;
      const completed = progress.completedLevels.includes(prevKey);
      const mastered = checkMastery(prevKey);
      return completed && mastered;
    },
    [progress]
  );

  const isCategoryUnlocked = useCallback(
    (categoryId: string) => {
      if (!progress || !categories) return true;
      const idx = categories.findIndex((c) => c.id === categoryId);
      if (idx <= 0) return true; // First category always unlocked

      // Previous category must have all levels completed
      const prevCategory = categories[idx - 1];
      return prevCategory.levels.every((level) =>
        progress.completedLevels.includes(`${prevCategory.id}-${level.id}`)
      );
    },
    [progress, categories]
  );

  return {
    progress,
    isLoading,
    earnXP,
    finishLevel,
    refreshStreak,
    isLevelUnlocked,
    isCategoryUnlocked,
  };
}
