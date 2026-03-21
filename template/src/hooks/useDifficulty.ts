"use client";

import { useState, useCallback, useMemo } from "react";
import { ContentItem } from "@/types/game";
import {
  analyzeDifficulty,
  selectItems,
  DifficultyProfile,
  Difficulty,
} from "@/lib/difficulty";

/**
 * React hook for adaptive difficulty. Wraps the pure difficulty engine
 * with reactive state. Re-analyzes after each answer batch.
 *
 * @param items - Full content catalog for the current game
 * @param batchSize - Items per round (default 5)
 */
export function useDifficulty(items: ContentItem[], batchSize = 5) {
  // Derive initial profile synchronously from props (no effect needed)
  const initial = useMemo(() => {
    const p = analyzeDifficulty(items);
    return { profile: p, items: selectItems(items, batchSize, p) };
  }, [items, batchSize]);

  const [profile, setProfile] = useState<DifficultyProfile>(initial.profile);
  const [currentItems, setCurrentItems] = useState<ContentItem[]>(initial.items);

  /** Re-analyze and select a fresh batch. Call after completing a round. */
  const refresh = useCallback(() => {
    const p = analyzeDifficulty(items);
    setProfile(p);
    setCurrentItems(selectItems(items, batchSize, p));
    return p;
  }, [items, batchSize]);

  /** Override the engine and force a specific difficulty. */
  const setDifficulty = useCallback(
    (difficulty: Difficulty) => {
      const p = analyzeDifficulty(items);
      const forced: DifficultyProfile = { ...p, recommended: difficulty };
      setProfile(forced);
      setCurrentItems(selectItems(items, batchSize, forced));
    },
    [items, batchSize],
  );

  return {
    /** Current difficulty profile */
    profile,
    /** Items selected at the recommended difficulty */
    currentItems,
    /** Re-analyze performance and get fresh items */
    refresh,
    /** Override to a specific difficulty */
    setDifficulty,
  };
}
