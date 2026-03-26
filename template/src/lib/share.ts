// ─── Passionate Learning — Social Share Utilities ───
// Pure functions for generating shareable score cards.
// Used by ShareCard component and available to all games.

import { GameResults } from "@/types/game";
import { computeGrade } from "@/lib/formatters";

/** Data needed to generate a share card. */
export interface ShareData {
  results: GameResults;
  gameName: string;
  streak?: number;
  level?: number;
  gameUrl?: string;
}

const GRADE_EMOJI: Record<string, string> = {
  S: "👑",
  A: "⚡",
  B: "🔥",
  C: "✨",
  D: "💪",
  F: "🎮",
};

// ─── Security: Share Text Input Sanitization ───
// Guards against social engineering via crafted game names (CWE-20).
// Strips newlines (prevents fake share content injection), control chars,
// and enforces length bounds.
const MAX_GAME_NAME_LENGTH = 100;

/**
 * Sanitize a game name for inclusion in share text.
 * Strips control characters and newlines to prevent content injection,
 * and truncates to a safe display length.
 * See: CWE-20 (Improper Input Validation), OWASP A03 (Injection).
 */
function sanitizeShareString(input: string): string {
  // Strip control characters (U+0000–U+001F, U+007F–U+009F) and newlines
  const cleaned = input.replace(/[\x00-\x1f\x7f-\x9f]/g, "").trim();
  if (cleaned.length > MAX_GAME_NAME_LENGTH) {
    return cleaned.slice(0, MAX_GAME_NAME_LENGTH) + "…";
  }
  return cleaned || "Game";
}

/**
 * Generate shareable text from game results.
 * Designed for social media, clipboard, or native share sheets.
 * @example
 * ```ts
 * generateShareText({
 *   results: { accuracy: 95, correctAnswers: 19, totalQuestions: 20, xp: 190, speed: 45 },
 *   gameName: "Prompt Craft",
 *   streak: 7,
 * });
 * // "👑 S Rank on Prompt Craft!\n95% accuracy · 19/20 correct · 🔥 7-day streak\nCan you beat my score?"
 * ```
 */
export function generateShareText(data: ShareData): string {
  const grade = computeGrade(data.results.accuracy);
  const emoji = GRADE_EMOJI[grade] ?? "🎮";
  const lines: string[] = [];
  const safeName = sanitizeShareString(data.gameName);

  lines.push(`${emoji} ${grade} Rank on ${safeName}!`);

  const stats: string[] = [
    `${data.results.accuracy}% accuracy`,
    `${data.results.correctAnswers}/${data.results.totalQuestions} correct`,
  ];
  if (data.streak && data.streak > 1) {
    stats.push(`🔥 ${data.streak}-day streak`);
  }
  lines.push(stats.join(" · "));

  lines.push("Can you beat my score?");

  if (data.gameUrl) {
    lines.push(data.gameUrl);
  }

  return lines.join("\n");
}

/** Check if the Web Share API is available (mobile browsers, some desktop). */
export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Share results using the Web Share API (native share sheet on mobile).
 * Falls back to clipboard copy on unsupported platforms.
 * @returns `"shared"` if native share succeeded, `"copied"` if clipboard fallback used, `"failed"` on error.
 */
export async function shareResults(data: ShareData): Promise<"shared" | "copied" | "failed"> {
  const text = generateShareText(data);

  if (canNativeShare()) {
    try {
      await navigator.share({ text, title: `${sanitizeShareString(data.gameName)} Score` });
      return "shared";
    } catch (e) {
      // User cancelled or share failed — fall through to clipboard
      if (e instanceof Error && e.name === "AbortError") return "failed";
    }
  }

  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
