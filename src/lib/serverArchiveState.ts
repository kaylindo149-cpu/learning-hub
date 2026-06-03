import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { LearningCard } from "@/data/learningCards";
import type { ArchiveState } from "@/lib/archiveStateApi";
import type { CapturedLink, CapturedLinkStatus } from "@/lib/capturedLinks";
import { learningCategoryOptions } from "@/lib/learningCategories";

const dataDirectory =
  process.env.LEARNING_HUB_DATA_DIR ??
  (process.env.VERCEL
    ? path.join(tmpdir(), "learning-hub")
    : path.join(process.cwd(), ".data"));
const archiveStatePath = path.join(dataDirectory, "archive-state.json");
const redisRestUrl =
  process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisRestToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redisArchiveStateKey =
  process.env.LEARNING_HUB_ARCHIVE_STATE_KEY ??
  "learning-hub:archive-state";

type StoredArchiveState = Partial<ArchiveState> & {
  updatedAt?: string;
};

type ServerArchiveState = ArchiveState & {
  updatedAt: string;
};

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

function isCapturedLink(value: unknown): value is CapturedLink {
  if (!value || typeof value !== "object") {
    return false;
  }

  const link = value as Partial<CapturedLink>;

  return (
    typeof link.id === "string" &&
    typeof link.url === "string" &&
    typeof link.category === "string" &&
    typeof link.capturedAt === "string"
  );
}

function normalizeCategories(value: unknown) {
  if (!Array.isArray(value)) {
    return learningCategoryOptions;
  }

  const categories = value
    .filter((category): category is string => typeof category === "string")
    .map((category) => category.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  const uniqueCategories = Array.from(new Set(categories));

  return uniqueCategories.length > 0 ? uniqueCategories : learningCategoryOptions;
}

function normalizeHiddenStarterCardIds(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((id): id is string => typeof id === "string")))
    : [];
}

function normalizeSavedCards(value: unknown) {
  return Array.isArray(value) ? value.filter(isLearningCard) : [];
}

function normalizeCapturedLinks(value: unknown) {
  return Array.isArray(value)
    ? value.filter(isCapturedLink).map((link) => {
        const status: CapturedLinkStatus =
          link.status === "Processing" || link.status === "Failed"
            ? link.status
            : "Pending";

        return {
          ...link,
          status,
          error: typeof link.error === "string" ? link.error : undefined
        };
      })
    : [];
}

function createEmptyArchiveState(): ServerArchiveState {
  return {
    savedCards: [],
    capturedLinks: [],
    categories: learningCategoryOptions,
    hiddenStarterCardIds: [],
    updatedAt: ""
  };
}

function normalizeArchiveState(value: unknown): ServerArchiveState {
  if (!value || typeof value !== "object") {
    return createEmptyArchiveState();
  }

  const state = value as StoredArchiveState;

  return {
    savedCards: normalizeSavedCards(state.savedCards),
    capturedLinks: normalizeCapturedLinks(state.capturedLinks),
    categories: normalizeCategories(state.categories),
    hiddenStarterCardIds: normalizeHiddenStarterCardIds(
      state.hiddenStarterCardIds
    ),
    updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : ""
  };
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

async function readStoredArchiveState() {
  if (hasRedisStorage()) {
    const storedValue = await runRedisCommand<string | null>([
      "GET",
      redisArchiveStateKey
    ]);

    return storedValue ? normalizeArchiveState(JSON.parse(storedValue)) : null;
  }

  try {
    const file = await readFile(archiveStatePath, "utf8");

    return normalizeArchiveState(JSON.parse(file));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code?: unknown }).code;

      if (code === "ENOENT") {
        return null;
      }
    }

    throw error;
  }
}

async function writeStoredArchiveState(state: ServerArchiveState) {
  if (hasRedisStorage()) {
    await runRedisCommand(["SET", redisArchiveStateKey, JSON.stringify(state)]);
    return;
  }

  await mkdir(dataDirectory, { recursive: true });
  await writeFile(archiveStatePath, JSON.stringify(state, null, 2));
}

export async function readServerArchiveState() {
  const state = await readStoredArchiveState();

  return {
    isInitialized: Boolean(state?.updatedAt),
    state: state ?? createEmptyArchiveState()
  };
}

export async function patchServerArchiveState(value: unknown) {
  const currentState =
    (await readStoredArchiveState()) ?? createEmptyArchiveState();
  const patch = value && typeof value === "object" ? value : {};
  const patchRecord = patch as Partial<Record<keyof ArchiveState, unknown>>;
  const nextState: ServerArchiveState = {
    savedCards:
      "savedCards" in patchRecord
        ? normalizeSavedCards(patchRecord.savedCards)
        : currentState.savedCards,
    capturedLinks:
      "capturedLinks" in patchRecord
        ? normalizeCapturedLinks(patchRecord.capturedLinks)
        : currentState.capturedLinks,
    categories:
      "categories" in patchRecord
        ? normalizeCategories(patchRecord.categories)
        : currentState.categories,
    hiddenStarterCardIds:
      "hiddenStarterCardIds" in patchRecord
        ? normalizeHiddenStarterCardIds(patchRecord.hiddenStarterCardIds)
        : currentState.hiddenStarterCardIds,
    updatedAt: new Date().toISOString()
  };

  await writeStoredArchiveState(nextState);

  return {
    isInitialized: true,
    state: nextState
  };
}
