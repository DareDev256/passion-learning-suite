import { describe, it, expect } from "vitest";
import {
  polarToCartesian,
  computeRadarPoints,
  pointsToPolygon,
  computeAxisEndpoints,
} from "@/lib/categoryRadar";

// ─── polarToCartesian ───

describe("polarToCartesian", () => {
  const cx = 100;
  const cy = 100;

  it("0° (top/12 o'clock) → directly above center", () => {
    const { x, y } = polarToCartesian(0, 50, cx, cy);
    expect(x).toBeCloseTo(100, 5);
    expect(y).toBeCloseTo(50, 5);
  });

  it("90° (3 o'clock) → directly right of center", () => {
    const { x, y } = polarToCartesian(90, 50, cx, cy);
    expect(x).toBeCloseTo(150, 5);
    expect(y).toBeCloseTo(100, 5);
  });

  it("180° (6 o'clock) → directly below center", () => {
    const { x, y } = polarToCartesian(180, 50, cx, cy);
    expect(x).toBeCloseTo(100, 5);
    expect(y).toBeCloseTo(150, 5);
  });

  it("270° (9 o'clock) → directly left of center", () => {
    const { x, y } = polarToCartesian(270, 50, cx, cy);
    expect(x).toBeCloseTo(50, 5);
    expect(y).toBeCloseTo(100, 5);
  });

  it("radius 0 → returns center", () => {
    const { x, y } = polarToCartesian(45, 0, cx, cy);
    expect(x).toBeCloseTo(100, 5);
    expect(y).toBeCloseTo(100, 5);
  });
});

// ─── computeRadarPoints ───

describe("computeRadarPoints", () => {
  const mockStrengths = (accs: number[]) =>
    accs.map((accuracy, i) => ({
      categoryId: `cat-${i}`,
      totalItems: 10,
      accuracy,
      strongCount: Math.round(accuracy / 10),
      weakCount: 10 - Math.round(accuracy / 10),
    }));

  it("returns empty array for < 3 categories", () => {
    expect(computeRadarPoints(mockStrengths([80, 60]), 50, 100, 100)).toEqual([]);
    expect(computeRadarPoints(mockStrengths([80]), 50, 100, 100)).toEqual([]);
    expect(computeRadarPoints([], 50, 100, 100)).toEqual([]);
  });

  it("returns correct number of points for 3+ categories", () => {
    const pts = computeRadarPoints(mockStrengths([80, 60, 40]), 50, 100, 100);
    expect(pts).toHaveLength(3);
  });

  it("100% accuracy → point at full radius", () => {
    const pts = computeRadarPoints(mockStrengths([100, 50, 50]), 50, 100, 100);
    // First point at 0° (top) with full radius should be at (100, 50)
    expect(pts[0].x).toBeCloseTo(100, 0);
    expect(pts[0].y).toBeCloseTo(50, 0);
  });

  it("0% accuracy → point at center", () => {
    const pts = computeRadarPoints(mockStrengths([0, 50, 50]), 50, 100, 100);
    expect(pts[0].x).toBeCloseTo(100, 0);
    expect(pts[0].y).toBeCloseTo(100, 0);
  });

  it("preserves label and value on each point", () => {
    const pts = computeRadarPoints(mockStrengths([75, 60, 40]), 50, 100, 100);
    expect(pts[0].label).toBe("cat-0");
    expect(pts[0].value).toBe(75);
    expect(pts[2].label).toBe("cat-2");
    expect(pts[2].value).toBe(40);
  });

  it("evenly distributes 4 categories at 90° intervals", () => {
    const pts = computeRadarPoints(
      mockStrengths([100, 100, 100, 100]),
      50,
      100,
      100,
    );
    // 0°, 90°, 180°, 270° — top, right, bottom, left
    expect(pts[0].y).toBeCloseTo(50, 0);  // top
    expect(pts[1].x).toBeCloseTo(150, 0); // right
    expect(pts[2].y).toBeCloseTo(150, 0); // bottom
    expect(pts[3].x).toBeCloseTo(50, 0);  // left
  });
});

// ─── pointsToPolygon ───

describe("pointsToPolygon", () => {
  it("converts points to SVG polygon string", () => {
    const pts = [
      { x: 10.123, y: 20.456, label: "a", value: 50 },
      { x: 30.789, y: 40.012, label: "b", value: 60 },
    ];
    expect(pointsToPolygon(pts)).toBe("10.1,20.5 30.8,40.0");
  });

  it("returns empty string for no points", () => {
    expect(pointsToPolygon([])).toBe("");
  });
});

// ─── computeAxisEndpoints ───

describe("computeAxisEndpoints", () => {
  it("returns empty for < 3 categories", () => {
    expect(computeAxisEndpoints(2, 50, 100, 100)).toEqual([]);
    expect(computeAxisEndpoints(0, 50, 100, 100)).toEqual([]);
  });

  it("returns correct count for 5 categories", () => {
    expect(computeAxisEndpoints(5, 50, 100, 100)).toHaveLength(5);
  });

  it("first endpoint is always at top (12 o'clock)", () => {
    const ends = computeAxisEndpoints(6, 50, 100, 100);
    expect(ends[0].x).toBeCloseTo(100, 0);
    expect(ends[0].y).toBeCloseTo(50, 0);
  });
});
