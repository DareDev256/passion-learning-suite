import { describe, it, expect } from "vitest";
import { getItemsByCategory, getItemsByLevel, categories, items } from "@/data/curriculum";

describe("getItemsByCategory", () => {
  it("returns items matching the category ID", () => {
    const result = getItemsByCategory("getting-started");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((i) => i.category === "getting-started")).toBe(true);
  });

  it("returns empty for non-existent category", () => {
    expect(getItemsByCategory("nonexistent")).toEqual([]);
  });
});

describe("getItemsByLevel", () => {
  it("returns items for valid category and level", () => {
    const result = getItemsByLevel("getting-started", 1);
    for (const item of result) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("prompt");
    }
  });

  it("returns empty for invalid category or level", () => {
    expect(getItemsByLevel("fake", 1)).toEqual([]);
    expect(getItemsByLevel("getting-started", 999)).toEqual([]);
  });
});

describe("curriculum data integrity", () => {
  it("every category has levels, every item has required fields + unique IDs", () => {
    for (const cat of categories) expect(cat.levels.length).toBeGreaterThan(0);
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of items) {
      expect(["easy", "medium", "hard"]).toContain(item.difficulty);
    }
  });
});
