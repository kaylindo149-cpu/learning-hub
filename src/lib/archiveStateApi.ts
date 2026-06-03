import type { LearningCard } from "@/data/learningCards";
import type { CapturedLink } from "@/lib/capturedLinks";

export type ArchiveState = {
  savedCards: LearningCard[];
  capturedLinks: CapturedLink[];
  categories: string[];
  hiddenStarterCardIds: string[];
};

export type RemoteArchiveState = {
  isInitialized: boolean;
  state: ArchiveState;
};

export type ArchiveStatePatch = Partial<ArchiveState>;

let isSyncPaused = false;
let pendingPatch: ArchiveStatePatch = {};
let pendingSaveId: number | undefined;

export function pauseArchiveStateSync() {
  isSyncPaused = true;
}

export function resumeArchiveStateSync() {
  isSyncPaused = false;
}

async function writeArchiveStatePatch(patch: ArchiveStatePatch) {
  const response = await fetch("/api/archive-state", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(patch)
  });

  if (!response.ok) {
    throw new Error("Could not save archive state.");
  }
}

export async function saveArchiveStatePatch(patch: ArchiveStatePatch) {
  if (typeof window === "undefined") {
    return;
  }

  await writeArchiveStatePatch(patch);
}

export function queueArchiveStatePatch(patch: ArchiveStatePatch) {
  if (typeof window === "undefined" || isSyncPaused) {
    return;
  }

  pendingPatch = {
    ...pendingPatch,
    ...patch
  };

  if (pendingSaveId) {
    window.clearTimeout(pendingSaveId);
  }

  pendingSaveId = window.setTimeout(() => {
    const patchToSave = pendingPatch;

    pendingPatch = {};
    pendingSaveId = undefined;

    void writeArchiveStatePatch(patchToSave).catch(() => {
      pendingPatch = {
        ...patchToSave,
        ...pendingPatch
      };
    });
  }, 180);
}

export async function readRemoteArchiveState(): Promise<RemoteArchiveState | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const response = await fetch("/api/archive-state", {
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as RemoteArchiveState;
}
