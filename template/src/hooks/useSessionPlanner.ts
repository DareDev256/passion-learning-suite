"use client";

import { useState, useCallback, useMemo } from "react";
import { ContentItem } from "@/types/game";
import {
  planSession,
  describeSession,
  hasReviewsDue,
  SessionPlan,
  SessionItem,
} from "@/lib/sessionPlanner";

interface UseSessionPlannerOptions {
  sessionSize?: number;
  reviewRatio?: number;
  weakCategoryBoost?: number;
  minutesPerItem?: number;
}

/**
 * React hook for the smart session planner. Wraps `planSession()` with
 * sequential item consumption — games call `advance()` after each answer
 * to move through the session, and `skip()` to pass on an item.
 *
 * @param items - Full content catalog for the current game
 * @param options - Session planner configuration
 */
export function useSessionPlanner(
  items: ContentItem[],
  options: UseSessionPlannerOptions = {},
) {
  const initialPlan = useMemo(
    () => planSession(items, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  const [plan, setPlan] = useState<SessionPlan>(initialPlan);
  const [cursor, setCursor] = useState(0);

  /** Current session item (with reason + priority metadata), or null if session is complete. */
  const currentSessionItem: SessionItem | null =
    cursor < plan.items.length ? plan.items[cursor] : null;

  /** The raw ContentItem for the current position, or null if done. */
  const currentItem: ContentItem | null = currentSessionItem?.item ?? null;

  /** Why this item was selected: review, weak-category, new, or recall-bonus. */
  const currentReason = currentSessionItem?.reason ?? null;

  /** True when all items in the session have been consumed. */
  const isComplete = cursor >= plan.items.length;

  /** Human-readable session summary (e.g. "4 reviews + 3 new items ~ 6 min"). */
  const description = useMemo(() => describeSession(plan), [plan]);

  /** How far through the session: 0 to plan.items.length. */
  const progress = { current: cursor, total: plan.items.length };

  /** Advance to the next item. Call after the player answers. */
  const advance = useCallback(() => {
    setCursor((c) => Math.min(c + 1, plan.items.length));
  }, [plan.items.length]);

  /** Skip the current item (move forward without answering). */
  const skip = useCallback(() => {
    setCursor((c) => Math.min(c + 1, plan.items.length));
  }, [plan.items.length]);

  /** Replan the session from scratch (e.g. after settings change). */
  const replan = useCallback(() => {
    const fresh = planSession(items, options);
    setPlan(fresh);
    setCursor(0);
    return fresh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  /** Quick check for pending FSRS reviews (useful for notification badges). */
  const reviewsDue = useMemo(() => hasReviewsDue(), []);

  return {
    plan,
    description,
    currentItem,
    currentReason,
    isComplete,
    progress,
    reviewsDue,
    advance,
    skip,
    replan,
  };
}
