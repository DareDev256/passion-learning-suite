import { ContentItem, Category } from "@/types/game";

// ─── TEMPLATE CURRICULUM ───
// Each game REPLACES this entire file with its own content.
// This serves as the structural example.

export const categories: Category[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Your first steps",
    icon: ">>",
    levels: [
      {
        id: 1,
        name: "Basics",
        items: ["gs-001", "gs-002", "gs-003", "gs-004", "gs-005"],
        requiredXp: 0,
        gameMode: "standard",
      },
      {
        id: 2,
        name: "Fundamentals",
        items: ["gs-006", "gs-007", "gs-008", "gs-009", "gs-010"],
        requiredXp: 50,
        gameMode: "standard",
      },
    ],
  },
];

export const items: ContentItem[] = [
  {
    id: "gs-001",
    prompt: "This is the question or scenario the player sees",
    answer: "This is the correct answer or action",
    category: "getting-started",
    difficulty: "easy",
    enrichment: {
      whyItMatters: "Explains why this concept matters in the real world",
      realWorldExample: "A concrete example of this concept in action",
      proTip: "An advanced insight for those who want to go deeper",
    },
  },
  // Add more items...
];

/**
 * Get all content items belonging to a category.
 *
 * @param categoryId - Category identifier (e.g. `"getting-started"`)
 * @returns Matching items, or empty array if category has no items
 *
 * @example
 * ```ts
 * const basics = getItemsByCategory("getting-started");
 * // → [{ id: "gs-001", ... }, { id: "gs-002", ... }, ...]
 * ```
 */
export function getItemsByCategory(categoryId: string): ContentItem[] {
  return items.filter((item) => item.category === categoryId);
}

/**
 * Get content items for a specific level within a category.
 * Resolves item IDs defined in the level's `items` array to full `ContentItem` objects.
 *
 * @param categoryId - Category identifier (e.g. `"getting-started"`)
 * @param levelId - Numeric level ID within the category
 * @returns Matching items in level order, or empty array if category/level not found
 *
 * @example
 * ```ts
 * const level1 = getItemsByLevel("getting-started", 1);
 * // → [{ id: "gs-001", ... }, ..., { id: "gs-005", ... }]
 * ```
 */
export function getItemsByLevel(categoryId: string, levelId: number): ContentItem[] {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return [];
  const level = category.levels.find((l) => l.id === levelId);
  if (!level) return [];
  return level.items
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ContentItem => item !== undefined);
}
