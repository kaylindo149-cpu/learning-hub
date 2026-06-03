import { queueArchiveStatePatch } from "@/lib/archiveStateApi";

export const defaultLearningCategory = "Learn Later";
export const learningCategoriesStorageKey =
  "kaylins-learning-hub-learning-categories";
export const learningCategoriesChangedEvent =
  "kaylins-learning-hub-learning-categories-changed";

export const learningCategoryOptions = [
  "Learn Later",
  "Digital Culture",
  "Learning Science",
  "Writing",
  "Web Design",
  "AI",
  "Product",
  "Knowledge Gardens",
  "Visual Thinking"
];

let learningCategoriesFallback = learningCategoryOptions;

function normalizeCategoryName(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

function normalizeLearningCategories(value: unknown) {
  if (!Array.isArray(value)) {
    return learningCategoryOptions;
  }

  const categories = value
    .filter((category): category is string => typeof category === "string")
    .map(normalizeCategoryName)
    .filter(Boolean);
  const uniqueCategories = Array.from(new Set(categories));

  return uniqueCategories.length > 0 ? uniqueCategories : learningCategoryOptions;
}

function notifyLearningCategoriesChanged() {
  window.dispatchEvent(new Event(learningCategoriesChangedEvent));
}

export function readLearningCategories() {
  if (typeof window === "undefined") {
    return learningCategoryOptions;
  }

  try {
    const value = window.localStorage.getItem(learningCategoriesStorageKey);
    if (!value) {
      return learningCategoriesFallback;
    }

    learningCategoriesFallback = normalizeLearningCategories(JSON.parse(value));
    return learningCategoriesFallback;
  } catch {
    return learningCategoriesFallback;
  }
}

export function saveLearningCategories(categories: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  learningCategoriesFallback = normalizeLearningCategories(categories);

  try {
    window.localStorage.setItem(
      learningCategoriesStorageKey,
      JSON.stringify(learningCategoriesFallback)
    );
  } catch {
    // Keep the in-memory copy usable when storage is blocked.
  }

  notifyLearningCategoriesChanged();
  queueArchiveStatePatch({ categories: learningCategoriesFallback });
}
