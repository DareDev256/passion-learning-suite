// ─── Passionate Learning — Category Radar Geometry ───
// Pure functions that convert category strength data into SVG radar coordinates.
// No side effects, no DOM access — geometry math only.

import { CategoryStrength } from "@/lib/insights";

export interface RadarPoint {
  x: number;
  y: number;
  label: string;
  value: number; // 0-100 accuracy
}

/**
 * Convert a polar coordinate (angle + distance) to cartesian (x, y).
 * Angle 0 = top (12 o'clock), increases clockwise.
 * @param angleDeg - Angle in degrees from 12 o'clock
 * @param radius - Distance from center
 * @param cx - Center X
 * @param cy - Center Y
 */
export function polarToCartesian(
  angleDeg: number,
  radius: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  // Offset by -90° so 0° = top
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/**
 * Compute radar polygon vertices from category strengths.
 * Distributes categories evenly around the circle, maps accuracy to radius.
 * @param strengths - Category strength data (from `computeCategoryStrengths`)
 * @param radius - Max radius in SVG units
 * @param cx - Center X of the radar
 * @param cy - Center Y of the radar
 * @returns Array of labeled points for the mastery polygon, or empty array if < 3 categories
 */
export function computeRadarPoints(
  strengths: CategoryStrength[],
  radius: number,
  cx: number,
  cy: number,
): RadarPoint[] {
  if (strengths.length < 3) return [];

  const step = 360 / strengths.length;
  return strengths.map((cat, i) => {
    const angle = step * i;
    const dist = (cat.accuracy / 100) * radius;
    const { x, y } = polarToCartesian(angle, dist, cx, cy);
    return { x, y, label: cat.categoryId, value: cat.accuracy };
  });
}

/**
 * Convert radar points to an SVG polygon `points` string.
 * Rounds to 1 decimal for clean SVG output.
 */
export function pointsToPolygon(pts: RadarPoint[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/**
 * Generate axis endpoint coordinates (from center to edge) for each category.
 * Used to draw the grid lines from center to each vertex label.
 */
export function computeAxisEndpoints(
  count: number,
  radius: number,
  cx: number,
  cy: number,
): { x: number; y: number }[] {
  if (count < 3) return [];
  const step = 360 / count;
  return Array.from({ length: count }, (_, i) =>
    polarToCartesian(step * i, radius, cx, cy),
  );
}
