import { describe, it, expect } from "vitest";
import { formatTime, renderSpeed, computeGrade } from "@/lib/formatters";

// ─── formatTime ───
describe("formatTime", () => {
  it("renders 0 seconds as 0:00", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("renders sub-minute values with zero-padded seconds", () => {
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(59)).toBe("0:59");
  });

  it("renders minutes and seconds correctly", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(125)).toBe("2:05");
  });

  it("handles large values (multi-hour)", () => {
    expect(formatTime(3661)).toBe("61:01"); // not HH:MM:SS — games show total minutes
  });

  it("rounds fractional seconds", () => {
    expect(formatTime(4.7)).toBe("0:05");
    expect(formatTime(59.4)).toBe("0:59");
    expect(formatTime(59.5)).toBe("1:00"); // rounds up to 60
  });

  it("treats NaN, negative, and Infinity as 0", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(-10)).toBe("0:00");
    expect(formatTime(-Infinity)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
  });
});

// ─── renderSpeed ───
describe("renderSpeed", () => {
  it("formats time-based labels through formatTime", () => {
    expect(renderSpeed(65, "Time")).toBe("1:05");
    expect(renderSpeed(90, "Elapsed")).toBe("1:30");
    expect(renderSpeed(30, "Duration")).toBe("0:30");
    expect(renderSpeed(5, "seconds")).toBe("0:05");
  });

  it("is case-insensitive for time detection", () => {
    expect(renderSpeed(65, "TIME")).toBe("1:05");
    expect(renderSpeed(65, "Elapsed Seconds")).toBe("1:05");
  });

  it("renders rate-based labels as rounded integers", () => {
    expect(renderSpeed(72.8, "WPM")).toBe("73");
    expect(renderSpeed(100, "Speed")).toBe("100");
    expect(renderSpeed(42.3, "Score")).toBe("42");
  });

  it("returns dash for NaN, negative, and Infinity", () => {
    expect(renderSpeed(NaN, "WPM")).toBe("—");
    expect(renderSpeed(-1, "Time")).toBe("—");
    expect(renderSpeed(Infinity, "Speed")).toBe("—");
  });

  it("handles 0 correctly (valid speed)", () => {
    expect(renderSpeed(0, "WPM")).toBe("0");
    expect(renderSpeed(0, "Time")).toBe("0:00");
  });
});

// ─── computeGrade ───
describe("computeGrade", () => {
  it("awards S at exactly 95%", () => {
    expect(computeGrade(95)).toBe("S");
  });

  it("awards A at exactly 90%", () => {
    expect(computeGrade(90)).toBe("A");
  });

  it("awards B at exactly 80%", () => {
    expect(computeGrade(80)).toBe("B");
  });

  it("awards C at exactly 70%", () => {
    expect(computeGrade(70)).toBe("C");
  });

  it("awards D at exactly 60%", () => {
    expect(computeGrade(60)).toBe("D");
  });

  it("awards F below 60%", () => {
    expect(computeGrade(59)).toBe("F");
    expect(computeGrade(0)).toBe("F");
  });

  it("handles perfect and above-100 scores", () => {
    expect(computeGrade(100)).toBe("S");
    expect(computeGrade(150)).toBe("S"); // clamped upstream, but grade still works
  });

  it("handles boundary transitions (grade - 1)", () => {
    expect(computeGrade(94.9)).toBe("A"); // just under S
    expect(computeGrade(89.9)).toBe("B"); // just under A
    expect(computeGrade(79.9)).toBe("C"); // just under B
    expect(computeGrade(69.9)).toBe("D"); // just under C
    expect(computeGrade(59.9)).toBe("F"); // just under D
  });
});
