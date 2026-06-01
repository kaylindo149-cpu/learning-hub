import type { LearningCard } from "@/data/learningCards";

export const savedLearningCardsStorageKey =
  "kaylins-learning-hub-saved-learning-cards";
export const savedLearningCardsChangedEvent =
  "kaylins-learning-hub-saved-learning-cards-changed";

let savedLearningCardsFallback: LearningCard[] = [];

function isLearningCard(value: unknown): value is LearningCard {
  if (!value || typeof value !== "object") {
    return false;
  }

  const card = value as Partial<LearningCard>;

  return (
    typeof card.id === "string" &&
    typeof card.category === "string" &&
    typeof card.title === "string" &&
    typeof card.url === "string" &&
    typeof card.summary === "string" &&
    typeof card.source === "string" &&
    typeof card.dateAdded === "string" &&
    Array.isArray(card.tags) &&
    card.tags.every((tag) => typeof tag === "string") &&
    typeof card.thumbnailClass === "string" &&
    typeof card.thumbnailLabel === "string" &&
    (typeof card.imageUrl === "undefined" || typeof card.imageUrl === "string")
  );
}

function notifySavedLearningCardsChanged() {
  window.dispatchEvent(new Event(savedLearningCardsChangedEvent));
}

export function readSavedLearningCards(): LearningCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(savedLearningCardsStorageKey);
    if (!value) {
      return savedLearningCardsFallback;
    }

    const parsed = JSON.parse(value);
    savedLearningCardsFallback = Array.isArray(parsed)
      ? parsed.filter(isLearningCard)
      : [];

    return savedLearningCardsFallback;
  } catch {
    return savedLearningCardsFallback;
  }
}

export function saveSavedLearningCards(cards: LearningCard[]) {
  if (typeof window === "undefined") {
    return;
  }

  savedLearningCardsFallback = cards;

  try {
    window.localStorage.setItem(
      savedLearningCardsStorageKey,
      JSON.stringify(cards)
    );
  } catch {
    // Keep the in-memory copy usable when storage is blocked.
  }

  notifySavedLearningCardsChanged();
}

export function upsertSavedLearningCard(card: LearningCard) {
  const existingCards = readSavedLearningCards();
  const nextCards = [
    card,
    ...existingCards.filter((existingCard) => existingCard.id !== card.id)
  ];

  saveSavedLearningCards(nextCards);
}

export function removeSavedLearningCards(ids: string[]) {
  const idsToRemove = new Set(ids);

  saveSavedLearningCards(
    readSavedLearningCards().filter((card) => !idsToRemove.has(card.id))
  );
}
