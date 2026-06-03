import { queueArchiveStatePatch } from "@/lib/archiveStateApi";

export const capturedLinksStorageKey = "kaylins-learning-hub-captured-links";
export const capturedLinksChangedEvent =
  "kaylins-learning-hub-captured-links-changed";

export type CapturedLinkStatus = "Pending" | "Processing" | "Failed";

export type CapturedLink = {
  id: string;
  url: string;
  category: string;
  status: CapturedLinkStatus;
  capturedAt: string;
  error?: string;
};

type StoredCapturedLink = Omit<CapturedLink, "status"> & {
  status?: unknown;
};

let capturedLinksFallback: CapturedLink[] = [];

function normalizeCapturedLinks(value: unknown): CapturedLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (link): link is StoredCapturedLink =>
        typeof link.id === "string" &&
        typeof link.url === "string" &&
        typeof link.capturedAt === "string"
    )
    .map((link) => ({
      ...link,
      category: typeof link.category === "string" ? link.category : "Learn Later",
      status:
        link.status === "Processing" || link.status === "Failed"
          ? link.status
          : "Pending",
      error: typeof link.error === "string" ? link.error : undefined
    }));
}

function notifyCapturedLinksChanged() {
  window.dispatchEvent(new Event(capturedLinksChangedEvent));
}

export function readCapturedLinks(): CapturedLink[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(capturedLinksStorageKey);
    if (!value) {
      return [];
    }

    capturedLinksFallback = normalizeCapturedLinks(JSON.parse(value));
    return capturedLinksFallback;
  } catch {
    return capturedLinksFallback;
  }
}

export function saveCapturedLinks(capturedLinks: CapturedLink[]) {
  if (typeof window === "undefined") {
    return;
  }

  capturedLinksFallback = capturedLinks;

  try {
    window.localStorage.setItem(
      capturedLinksStorageKey,
      JSON.stringify(capturedLinks)
    );
  } catch {
    // Keep the in-memory copy usable when storage is blocked.
  }

  notifyCapturedLinksChanged();
  queueArchiveStatePatch({ capturedLinks });
}

export function clearCapturedLinks() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(capturedLinksStorageKey);
  } catch {
    // Clearing should still update the current page if storage is blocked.
  }

  capturedLinksFallback = [];
  notifyCapturedLinksChanged();
  queueArchiveStatePatch({ capturedLinks: [] });
}

export function updateCapturedLinkStatus(
  id: string,
  status: CapturedLinkStatus,
  error?: string
) {
  const capturedLinks = readCapturedLinks();
  const nextCapturedLinks = capturedLinks.map((capturedLink) =>
    capturedLink.id === id
      ? {
          ...capturedLink,
          status,
          error
        }
      : capturedLink
  );

  saveCapturedLinks(nextCapturedLinks);
}

export function removeCapturedLink(id: string) {
  saveCapturedLinks(
    readCapturedLinks().filter((capturedLink) => capturedLink.id !== id)
  );
}

export function removeCapturedLinks(ids: string[]) {
  const idsToRemove = new Set(ids);

  saveCapturedLinks(
    readCapturedLinks().filter(
      (capturedLink) => !idsToRemove.has(capturedLink.id)
    )
  );
}

export function getCapturedLinkDomain(url: string) {
  try {
    const normalizedUrl = /^[a-z][a-z\d+\-.]*:\/\//i.test(url)
      ? url
      : `https://${url}`;
    return new URL(normalizedUrl).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
