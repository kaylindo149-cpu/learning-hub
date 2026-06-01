export const hiddenStarterCardsStorageKey =
  "kaylins-learning-hub-hidden-starter-cards";
export const hiddenStarterCardsChangedEvent =
  "kaylins-learning-hub-hidden-starter-cards-changed";

let hiddenStarterCardIdsFallback: string[] = [];

function notifyHiddenStarterCardsChanged() {
  window.dispatchEvent(new Event(hiddenStarterCardsChangedEvent));
}

export function readHiddenStarterCardIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(hiddenStarterCardsStorageKey);
    if (!value) {
      return hiddenStarterCardIdsFallback;
    }

    const parsed = JSON.parse(value);
    hiddenStarterCardIdsFallback = Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "string")
      : [];

    return hiddenStarterCardIdsFallback;
  } catch {
    return hiddenStarterCardIdsFallback;
  }
}

export function hideStarterCards(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  hiddenStarterCardIdsFallback = Array.from(
    new Set([...readHiddenStarterCardIds(), ...ids])
  );

  try {
    window.localStorage.setItem(
      hiddenStarterCardsStorageKey,
      JSON.stringify(hiddenStarterCardIdsFallback)
    );
  } catch {
    // Keep the in-memory copy usable when storage is blocked.
  }

  notifyHiddenStarterCardsChanged();
}
