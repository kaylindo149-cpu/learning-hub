import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CapturedLink } from "@/lib/capturedLinks";

const dataDirectory =
  process.env.LEARNING_HUB_DATA_DIR ?? path.join(process.cwd(), ".data");
const capturedLinksPath = path.join(dataDirectory, "slack-captured-links.json");
const redisRestUrl =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisRestToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redisCapturedLinksKey =
  process.env.LEARNING_HUB_SLACK_LINKS_KEY ??
  "learning-hub:slack-captured-links";

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

function hasRedisStorage() {
  return Boolean(redisRestUrl && redisRestToken);
}

async function runRedisCommand<T>(command: Array<string | number>) {
  if (!redisRestUrl || !redisRestToken) {
    throw new Error("Redis storage is not configured.");
  }

  const response = await fetch(redisRestUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${redisRestToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(command),
    cache: "no-store"
  });
  const data = (await response.json().catch(() => ({}))) as {
    result?: T;
    error?: string;
  };

  if (!response.ok || data.error) {
    throw new Error(data.error ?? "Redis command failed.");
  }

  return data.result;
}

async function readRedisCapturedLinks() {
  const storedValue = await runRedisCommand<string | null>([
    "GET",
    redisCapturedLinksKey
  ]);

  if (!storedValue) {
    return [];
  }

  return normalizeCapturedLinks(JSON.parse(storedValue));
}

async function writeRedisCapturedLinks(capturedLinks: CapturedLink[]) {
  await runRedisCommand(["SET", redisCapturedLinksKey, JSON.stringify(capturedLinks)]);
}

export async function readServerCapturedLinks(): Promise<CapturedLink[]> {
  if (hasRedisStorage()) {
    return readRedisCapturedLinks();
  }

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

  if (hasRedisStorage()) {
    await writeRedisCapturedLinks(nextLinks);
  } else {
    await writeCapturedLinks(nextLinks);
  }

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

  if (hasRedisStorage()) {
    await writeRedisCapturedLinks(nextLinks);
  } else {
    await writeCapturedLinks(nextLinks);
  }

  return nextLinks;
}
