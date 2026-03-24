import { describe, it, expect } from "vitest";
import { generateShareText } from "@/lib/share";

const baseResults = {
  accuracy: 95,
  correctAnswers: 19,
  totalQuestions: 20,
  xp: 190,
  speed: 45,
};

describe("generateShareText", () => {
  it("includes grade, accuracy, and score for S rank", () => {
    const text = generateShareText({ results: baseResults, gameName: "Prompt Craft" });
    expect(text).toContain("S Rank");
    expect(text).toContain("Prompt Craft");
    expect(text).toContain("95% accuracy");
    expect(text).toContain("19/20 correct");
    expect(text).toContain("Can you beat my score?");
  });

  it("includes streak when > 1", () => {
    const text = generateShareText({ results: baseResults, gameName: "Test", streak: 7 });
    expect(text).toContain("7-day streak");
    expect(text).toContain("🔥");
  });

  it("omits streak when 1 or undefined", () => {
    const noStreak = generateShareText({ results: baseResults, gameName: "Test" });
    expect(noStreak).not.toContain("streak");

    const oneDay = generateShareText({ results: baseResults, gameName: "Test", streak: 1 });
    expect(oneDay).not.toContain("streak");
  });

  it("includes game URL when provided", () => {
    const text = generateShareText({
      results: baseResults,
      gameName: "Test",
      gameUrl: "https://example.com",
    });
    expect(text).toContain("https://example.com");
  });

  it("uses correct emoji per grade", () => {
    // S rank (95%) → 👑
    expect(generateShareText({ results: { ...baseResults, accuracy: 95 }, gameName: "T" })).toContain("👑");

    // A rank (90%) → ⚡
    expect(generateShareText({ results: { ...baseResults, accuracy: 90 }, gameName: "T" })).toContain("⚡");

    // B rank (80%) → 🔥
    expect(generateShareText({ results: { ...baseResults, accuracy: 80 }, gameName: "T" })).toContain("🔥");

    // C rank (70%) → ✨
    expect(generateShareText({ results: { ...baseResults, accuracy: 70 }, gameName: "T" })).toContain("✨");

    // D rank (60%) → 💪
    expect(generateShareText({ results: { ...baseResults, accuracy: 60 }, gameName: "T" })).toContain("💪");

    // F rank (50%) → 🎮
    expect(generateShareText({ results: { ...baseResults, accuracy: 50 }, gameName: "T" })).toContain("🎮");
  });

  it("produces multi-line output with consistent structure", () => {
    const text = generateShareText({ results: baseResults, gameName: "Token Prophet", streak: 14 });
    const lines = text.split("\n");
    expect(lines.length).toBe(3);
    expect(lines[0]).toMatch(/Rank on Token Prophet/);
    expect(lines[1]).toMatch(/accuracy.*correct.*streak/);
    expect(lines[2]).toBe("Can you beat my score?");
  });

  it("handles zero accuracy gracefully", () => {
    const text = generateShareText({
      results: { ...baseResults, accuracy: 0, correctAnswers: 0 },
      gameName: "Test",
    });
    expect(text).toContain("F Rank");
    expect(text).toContain("0% accuracy");
    expect(text).toContain("0/20 correct");
  });

  it("handles 100% accuracy", () => {
    const text = generateShareText({
      results: { ...baseResults, accuracy: 100, correctAnswers: 20 },
      gameName: "Test",
    });
    expect(text).toContain("S Rank");
    expect(text).toContain("100% accuracy");
  });
});
