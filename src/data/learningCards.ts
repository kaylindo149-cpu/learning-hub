export type LearningCard = {
  id: string;
  category: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  dateAdded: string;
  tags: string[];
  thumbnailClass: string;
  thumbnailLabel: string;
  imageUrl?: string;
};

export const learningCards: LearningCard[] = [
  {
    id: "attention-economy-notes",
    category: "Digital Culture",
    title: "How the attention economy changes what we remember",
    url: "https://example.com/attention-economy",
    summary:
      "A thoughtful read about why saved links disappear from memory, and how personal archives can make ideas easier to revisit.",
    source: "example.com",
    dateAdded: "May 24, 2026",
    tags: ["digital culture", "memory", "systems"],
    thumbnailClass:
      "bg-[radial-gradient(circle_at_24%_28%,#f8b6a7_0_12%,transparent_13%),radial-gradient(circle_at_76%_22%,#ffd96f_0_10%,transparent_11%),linear-gradient(135deg,#fbefe7,#d9ecdf_42%,#f7c9bd)]",
    thumbnailLabel: "Memory map"
  },
  {
    id: "visual-thinking-sketches",
    category: "Visual Thinking",
    title: "A beginner's guide to turning messy notes into diagrams",
    url: "https://example.com/visual-thinking",
    summary:
      "Simple ways to sketch relationships between ideas before turning them into polished notes or blog-style cards.",
    source: "example.com",
    dateAdded: "May 22, 2026",
    tags: ["visual thinking", "notes", "diagrams"],
    thumbnailClass:
      "bg-[linear-gradient(90deg,rgba(45,40,35,.08)_1px,transparent_1px),linear-gradient(rgba(45,40,35,.08)_1px,transparent_1px),linear-gradient(135deg,#fff8ec,#f6b4c8_46%,#a9cbb7)] [background-size:24px_24px,24px_24px,100%_100%]",
    thumbnailLabel: "Sketch grid"
  },
  {
    id: "learning-in-public",
    category: "Writing",
    title: "Learning in public without turning everything into content",
    url: "https://example.com/learning-in-public",
    summary:
      "A useful reminder that public notes can be generous, unfinished, and personal without becoming a performance.",
    source: "example.com",
    dateAdded: "May 18, 2026",
    tags: ["writing", "learning", "reflection"],
    thumbnailClass:
      "bg-[radial-gradient(circle_at_20%_80%,#f79d65_0_14%,transparent_15%),radial-gradient(circle_at_76%_28%,#8fb6a0_0_18%,transparent_19%),linear-gradient(160deg,#fff4d8,#ffd2dc_45%,#d4e2ff)]",
    thumbnailLabel: "Notebook"
  },
  {
    id: "css-layout-patterns",
    category: "Web Design",
    title: "CSS layout patterns that make websites feel calm",
    url: "https://example.com/css-layout-patterns",
    summary:
      "A practical reference for spacing, grids, and rhythm when building pages that feel organized instead of crowded.",
    source: "example.com",
    dateAdded: "May 16, 2026",
    tags: ["css", "layout", "design"],
    thumbnailClass:
      "bg-[linear-gradient(135deg,#2d2823_0_18%,transparent_18%),linear-gradient(45deg,#f6d365,#fda085_45%,#f7f0df)]",
    thumbnailLabel: "Layout blocks"
  },
  {
    id: "tiny-habits-research",
    category: "Learning Science",
    title: "Why tiny habits make deep learning easier to restart",
    url: "https://example.com/tiny-habits",
    summary:
      "Notes on lowering friction, keeping momentum, and designing small study loops that survive busy weeks.",
    source: "example.com",
    dateAdded: "May 12, 2026",
    tags: ["habits", "learning science", "practice"],
    thumbnailClass:
      "bg-[radial-gradient(ellipse_at_30%_28%,#fff7bf_0_18%,transparent_19%),repeating-linear-gradient(115deg,#e8f1de_0_16px,#f8d0b3_16px_32px,#fbf7f0_32px_48px)]",
    thumbnailLabel: "Habit loop"
  },
  {
    id: "internet-gardens",
    category: "Knowledge Gardens",
    title: "Digital gardens, commonplace books, and the joy of collecting",
    url: "https://example.com/digital-gardens",
    summary:
      "A warm overview of personal knowledge spaces and why archives can be more alive than folders full of bookmarks.",
    source: "example.com",
    dateAdded: "May 8, 2026",
    tags: ["digital gardens", "archives", "curation"],
    thumbnailClass:
      "bg-[radial-gradient(circle_at_28%_34%,#99b898_0_10%,transparent_11%),radial-gradient(circle_at_52%_62%,#feceab_0_15%,transparent_16%),radial-gradient(circle_at_78%_26%,#ff847c_0_12%,transparent_13%),linear-gradient(140deg,#fdf6e9,#d7ead8)]",
    thumbnailLabel: "Garden archive"
  }
];

export const learningCategories = [
  "All",
  ...Array.from(new Set(learningCards.map((card) => card.category)))
];
