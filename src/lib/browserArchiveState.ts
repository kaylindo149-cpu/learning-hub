import { learningCategoryOptions } from "@/lib/learningCategories";
import {
  pauseArchiveStateSync,
  readRemoteArchiveState,
  resumeArchiveStateSync,
  saveArchiveStatePatch,
  type ArchiveState
} from "@/lib/archiveStateApi";
import {
  readCapturedLinks,
  saveCapturedLinks
} from "@/lib/capturedLinks";
import {
  readHiddenStarterCardIds,
  saveHiddenStarterCardIds
} from "@/lib/hiddenStarterCards";
import {
  readLearningCategories,
  saveLearningCategories
} from "@/lib/learningCategories";
import {
  readSavedLearningCards,
  saveSavedLearningCards
} from "@/lib/savedLearningCards";

function readLocalArchiveState(): ArchiveState {
  return {
    savedCards: readSavedLearningCards(),
    capturedLinks: readCapturedLinks(),
    categories: readLearningCategories(),
    hiddenStarterCardIds: readHiddenStarterCardIds()
  };
}

function haveCategoriesChanged(categories: string[]) {
  return (
    categories.length !== learningCategoryOptions.length ||
    categories.some((category, index) => category !== learningCategoryOptions[index])
  );
}

function hasMeaningfulLocalArchiveState(state: ArchiveState) {
  return (
    state.savedCards.length > 0 ||
    state.capturedLinks.length > 0 ||
    state.hiddenStarterCardIds.length > 0 ||
    haveCategoriesChanged(state.categories)
  );
}

function applyArchiveStateToBrowser(state: ArchiveState) {
  pauseArchiveStateSync();

  try {
    saveSavedLearningCards(state.savedCards);
    saveCapturedLinks(state.capturedLinks);
    saveLearningCategories(state.categories);
    saveHiddenStarterCardIds(state.hiddenStarterCardIds);
  } finally {
    resumeArchiveStateSync();
  }
}

export async function syncBrowserArchiveStateWithServer() {
  try {
    const remoteArchiveState = await readRemoteArchiveState();

    if (!remoteArchiveState) {
      return;
    }

    const localArchiveState = readLocalArchiveState();

    if (remoteArchiveState.isInitialized) {
      applyArchiveStateToBrowser(remoteArchiveState.state);
      return;
    }

    if (hasMeaningfulLocalArchiveState(localArchiveState)) {
      await saveArchiveStatePatch(localArchiveState);
    }
  } catch {
    // Keep the page usable from the browser copy if the shared store is offline.
  }
}
