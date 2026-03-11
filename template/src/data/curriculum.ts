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

// Helper: get items by category
export function getItemsByCategory(categoryId: string): ContentItem[] {
  return items.filter((item) => item.category === categoryId);
}

// Helper: get items by level
export function getItemsByLevel(categoryId: string, levelId: number): ContentItem[] {
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return [];
  const level = category.levels.find((l) => l.id === levelId);
  if (!level) return [];
  return level.items
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ContentItem => item !== undefined);
}
