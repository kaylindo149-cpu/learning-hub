import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CapturedLink } from "@/lib/capturedLinks";

const dataDirectory =
  process.env.LEARNING_HUB_DATA_DIR ?? path.join(process.cwd(), ".data");
const capturedLinksPath = path.join(dataDirectory, "slack-captured-links.json");

type StoredCapturedLink = Omit<CapturedLink, "status"> & {
  status?: unknown;
};

function isStoredCapturedLink(value: unknown): value is StoredCapturedLink {
  if (!value || typeof value !== "object") {
    return false;
  }

  const link = value as Partial<StoredCapturedLink>;

  return (
    typeof link.id === "string" &&
    typeof link.url === "string" &&
    typeof link.category === "string" &&
    typeof link.capturedAt === "string"
  );
}

function normalizeCapturedLinks(value: unknown): CapturedLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isStoredCapturedLink).map((link) => ({
    id: link.id,
    url: link.url,
    category: link.category,
    capturedAt: link.capturedAt,
    status:
      link.status === "Processing" || link.status === "Failed"
        ? link.status
        : "Pending",
    error: typeof link.error === "string" ? link.error : undefined
  }));
}

async function writeCapturedLinks(capturedLinks: CapturedLink[]) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(capturedLinksPath, JSON.stringify(capturedLinks, null, 2));
}

export async function readServerCapturedLinks(): Promise<CapturedLink[]> {
  try {
    const file = await readFile(capturedLinksPath, "utf8");

    return normalizeCapturedLinks(JSON.parse(file));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code?: unknown }).code;

      if (code === "ENOENT") {
        return [];
      }
    }

    throw error;
  }
}

export async function appendServerCapturedLinks(capturedLinks: CapturedLink[]) {
  if (capturedLinks.length === 0) {
    return [];
  }

  const existingLinks = await readServerCapturedLinks();
  const existingIds = new Set(existingLinks.map((link) => link.id));
  const nextLinks = [
    ...capturedLinks.filter((link) => !existingIds.has(link.id)),
    ...existingLinks
  ];

  await writeCapturedLinks(nextLinks);

  return nextLinks;
}

export async function removeServerCapturedLinks(ids: string[]) {
  if (ids.length === 0) {
    return readServerCapturedLinks();
  }

  const idsToRemove = new Set(ids);
  const nextLinks = (await readServerCapturedLinks()).filter(
    (link) => !idsToRemove.has(link.id)
  );

  await writeCapturedLinks(nextLinks);

  return nextLinks;
}
