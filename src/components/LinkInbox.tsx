"use client";

import { useEffect, useState } from "react";
import {
  clearCapturedLinks,
  capturedLinksChangedEvent,
  readCapturedLinks,
  saveCapturedLinks,
  type CapturedLink
} from "@/lib/capturedLinks";
import {
  processCapturedLinkWithAi,
  processCapturedLinksWithAi
} from "@/lib/aiProcessor";
import {
  learningCategoriesChangedEvent,
  readLearningCategories
} from "@/lib/learningCategories";

const defaultMessage =
  "This is a quiet holding place for links before they become cards.";

const linkInputId = "link-inbox-url";

function formatCapturedTime() {
  return "Just now";
}

function formatCapturedError(error: string) {
  const normalizedError = error.toLowerCase();

  if (
    normalizedError.includes("gemini request failed") ||
    normalizedError.includes("unavailable") ||
    normalizedError.includes("high demand")
  ) {
    return "AI is temporarily busy. Try again in a moment.";
  }

  return error.length > 160 ? `${error.slice(0, 157).trim()}...` : error;
}

function isCapturedLink(value: unknown): value is CapturedLink {
  if (!value || typeof value !== "object") {
    return false;
  }

  const capturedLink = value as Partial<CapturedLink>;

  return (
    typeof capturedLink.id === "string" &&
    typeof capturedLink.url === "string" &&
    typeof capturedLink.category === "string" &&
    typeof capturedLink.capturedAt === "string"
  );
}

async function readSlackCapturedLinks(): Promise<CapturedLink[]> {
  const response = await fetch("/api/slack/captured-links", {
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return Array.isArray(data.links) ? data.links.filter(isCapturedLink) : [];
}

async function acknowledgeSlackCapturedLinks(ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  await fetch("/api/slack/captured-links", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ ids })
  });
}

export default function LinkInbox() {
  const [link, setLink] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [capturedLinks, setCapturedLinks] = useState<CapturedLink[]>([]);

  useEffect(() => {
    function syncLearningCategories() {
      const nextCategories = readLearningCategories();

      setCategoryOptions(nextCategories);
      setSelectedCategory((currentCategory) =>
        currentCategory && nextCategories.includes(currentCategory)
          ? currentCategory
          : nextCategories[0]
      );
    }

    syncLearningCategories();
    window.addEventListener(
      learningCategoriesChangedEvent,
      syncLearningCategories
    );

    return () => {
      window.removeEventListener(
        learningCategoriesChangedEvent,
        syncLearningCategories
      );
    };
  }, []);

  useEffect(() => {
    function syncCapturedLinks() {
      const nextCapturedLinks = readCapturedLinks();

      setCapturedLinks(nextCapturedLinks);
      processCapturedLinksWithAi(nextCapturedLinks);
    }

    syncCapturedLinks();
    window.addEventListener(capturedLinksChangedEvent, syncCapturedLinks);

    return () => {
      window.removeEventListener(capturedLinksChangedEvent, syncCapturedLinks);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function importSlackCapturedLinks() {
      try {
        const slackCapturedLinks = await readSlackCapturedLinks();

        if (!isMounted || slackCapturedLinks.length === 0) {
          return;
        }

        const storedCapturedLinks = readCapturedLinks();
        const storedCapturedLinkIds = new Set(
          storedCapturedLinks.map((capturedLink) => capturedLink.id)
        );
        const newCapturedLinks = slackCapturedLinks.filter(
          (capturedLink) => !storedCapturedLinkIds.has(capturedLink.id)
        );

        if (newCapturedLinks.length === 0) {
          await acknowledgeSlackCapturedLinks(
            slackCapturedLinks.map((capturedLink) => capturedLink.id)
          );
          return;
        }

        const normalizedSlackCapturedLinks: CapturedLink[] =
          newCapturedLinks.map((capturedLink) => {
            const status: CapturedLink["status"] =
              capturedLink.status === "Processing" ||
              capturedLink.status === "Failed"
                ? capturedLink.status
                : "Pending";

            return {
              ...capturedLink,
              status
            };
          });
        const nextCapturedLinks: CapturedLink[] = [
          ...normalizedSlackCapturedLinks,
          ...storedCapturedLinks
        ];

        setCapturedLinks(nextCapturedLinks);
        saveCapturedLinks(nextCapturedLinks);
        await acknowledgeSlackCapturedLinks(
          newCapturedLinks.map((capturedLink) => capturedLink.id)
        );
      } catch {
        // Slack sync should not interrupt manual link capture.
      }
    }

    void importSlackCapturedLinks();
    const intervalId = window.setInterval(importSlackCapturedLinks, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  function handleCapture() {
    const inputElement = document.getElementById(
      linkInputId
    ) as HTMLInputElement | null;
    const trimmedLink = (inputElement?.value ?? link).trim();

    if (!trimmedLink) {
      setMessage("Paste a link first.");
      return;
    }

    const capturedLink: CapturedLink = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: trimmedLink,
      category: selectedCategory || categoryOptions[0],
      status: "Pending",
      capturedAt: new Date().toISOString()
    };

    const nextCapturedLinks = [capturedLink, ...readCapturedLinks()];
    setCapturedLinks(nextCapturedLinks);
    saveCapturedLinks(nextCapturedLinks);
    void processCapturedLinkWithAi(capturedLink);
    setMessage("Link captured — AI is processing it.");
    setLink("");
    if (inputElement) {
      inputElement.value = "";
    }
  }

  function handleClearCapturedLinks() {
    setCapturedLinks([]);
    clearCapturedLinks();
  }

  function handleRetryCapturedLink(capturedLink: CapturedLink) {
    const retryLink: CapturedLink = {
      ...capturedLink,
      status: "Pending",
      error: undefined
    };
    const nextCapturedLinks = readCapturedLinks().map((storedLink) =>
      storedLink.id === capturedLink.id ? retryLink : storedLink
    );

    setCapturedLinks(nextCapturedLinks);
    saveCapturedLinks(nextCapturedLinks);
    void processCapturedLinkWithAi(retryLink);
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8 lg:px-10">
      <div className="grid gap-8 border border-ink/10 bg-white/55 p-5 shadow-soft sm:p-7 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
        <div className="self-start lg:pt-1">
          <p className="pl-1 text-xs font-black uppercase tracking-[0.28em] text-sage">
            Link Inbox
          </p>
          <h2 className="display-bubble mt-4 text-3xl leading-tight text-ink sm:text-5xl">
            Drop a useful
            <br />
            link here →
          </h2>
          <p className="mt-4 max-w-lg text-base font-medium leading-7 text-ink/66">
            Paste anything worth revisiting. Later, AI will distill it into a
            clean knowledge card.
          </p>
        </div>

        <div className="lg:pt-8">
          <div className="grid gap-4">
            <label className="block">
              <span className="sr-only">Paste a link</span>
              <input
                aria-describedby="link-inbox-message"
                className="h-16 w-full border border-ink/15 bg-paper/80 px-5 text-base font-medium outline-none transition placeholder:text-ink/35 focus:border-sage"
                id={linkInputId}
                inputMode="url"
                onChange={(event) => setLink(event.target.value)}
                onInput={(event) =>
                  setLink((event.target as HTMLInputElement).value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleCapture();
                  }
                }}
                placeholder="Paste a link from Facebook, Slack, browser..."
                type="text"
                value={link}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="relative block">
                <span className="sr-only">Choose category</span>
                <select
                  aria-label="Choose category"
                  className="h-16 w-full appearance-none border border-ink/15 bg-paper/80 px-5 pr-12 text-sm font-bold text-ink outline-none transition focus:border-sage"
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  value={selectedCategory}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-xl leading-none text-ink/70"
                >
                  ↓
                </span>
              </label>
              <button
                type="button"
                onClick={handleCapture}
                className="h-16 border border-ink bg-ink px-6 text-sm font-bold uppercase tracking-[0.16em] text-paper transition hover:border-sage hover:bg-sage sm:min-w-56"
              >
                Capture link →
              </button>
            </div>
          </div>

          <div
            aria-live="polite"
            className={`mt-4 min-h-12 border px-4 py-3 text-sm transition ${
              message === defaultMessage
                ? "border-transparent bg-transparent text-ink/45"
                : "border-sage/30 bg-paper text-sage"
            }`}
            id="link-inbox-message"
            role="status"
          >
            {message}
          </div>

          {capturedLinks.length > 0 ? (
            <div className="mt-5 border-t border-ink/10 pt-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-serif text-2xl text-ink">Captured Links</h3>
                <button
                  className="text-xs font-bold uppercase tracking-[0.14em] text-sage transition hover:text-ink"
                  onClick={handleClearCapturedLinks}
                  type="button"
                >
                  Clear captured links
                </button>
              </div>

              <ul className="mt-4 space-y-3">
                {capturedLinks.map((capturedLink) => (
                  <li
                    className="min-w-0 overflow-hidden border border-ink/10 bg-paper/70 px-4 py-3"
                    key={capturedLink.id}
                  >
                    <div className="flex min-w-0 flex-col gap-3">
                      <a
                        className="block max-w-full truncate text-sm font-semibold leading-6 text-ink transition hover:text-sage"
                        href={capturedLink.url}
                        rel="noreferrer"
                        target="_blank"
                        title={capturedLink.url}
                      >
                        {capturedLink.url}
                      </a>

                      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
                        <span className="border border-sage/20 bg-white/55 px-2.5 py-1 text-sage">
                          {capturedLink.status}
                        </span>
                        <span className="border border-ink/10 bg-white/55 px-2.5 py-1 text-ink/55">
                          {capturedLink.category}
                        </span>
                        <span className="text-ink/45">
                          {formatCapturedTime()}
                        </span>
                        {capturedLink.status === "Failed" ? (
                          <button
                            className="border border-ink/10 bg-white/70 px-2.5 py-1 text-ink/60 transition hover:border-sage/30 hover:text-sage"
                            onClick={() => handleRetryCapturedLink(capturedLink)}
                            type="button"
                          >
                            Retry
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {capturedLink.error ? (
                      <p className="mt-3 text-sm font-semibold leading-6 text-clay">
                        {formatCapturedError(capturedLink.error)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
