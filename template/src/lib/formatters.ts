// ─── Passionate Learning — Display Formatters ───
// Pure functions for rendering game stats. Extracted from VictoryScreen
// so they're independently testable without jsdom.

/** Format seconds as m:ss — guards against NaN, negative, and Infinity. */
export function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds) : 0;
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Render speed value: mm:ss for time-based metrics, raw integer for rate-based (WPM). */
export function renderSpeed(value: number, label: string): string {
  if (!Number.isFinite(value) || value < 0) return "—";
  const isTimeBased = /time|duration|elapsed|seconds?/i.test(label);
  return isTimeBased ? formatTime(value) : String(Math.round(value));
}

/** Map accuracy % to letter grade. */
export function computeGrade(accuracy: number): string {
  if (accuracy >= 95) return "S";
  if (accuracy >= 90) return "A";
  if (accuracy >= 80) return "B";
  if (accuracy >= 70) return "C";
  if (accuracy >= 60) return "D";
  return "F";
}
