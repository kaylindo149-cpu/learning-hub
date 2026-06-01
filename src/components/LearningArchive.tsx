"use client";

import { useEffect, useMemo, useState } from "react";
import { KaylinLogo } from "@/components/KaylinLogo";
import LinkInbox from "./LinkInbox";
import { learningCards, type LearningCard } from "@/data/learningCards";
import {
  capturedLinksChangedEvent,
  capturedLinksStorageKey,
  getCapturedLinkDomain,
  readCapturedLinks,
  removeCapturedLinks,
  type CapturedLink
} from "@/lib/capturedLinks";
import {
  readSavedLearningCards,
  removeSavedLearningCards,
  savedLearningCardsChangedEvent,
  savedLearningCardsStorageKey
} from "@/lib/savedLearningCards";
import {
  hiddenStarterCardsChangedEvent,
  hiddenStarterCardsStorageKey,
  hideStarterCards,
  readHiddenStarterCardIds
} from "@/lib/hiddenStarterCards";

function isTemporaryCard(card: LearningCard) {
  return card.id.startsWith("temporary-card-");
}

function isSavedUserCard(card: LearningCard) {
  return card.id.startsWith("saved-card-");
}

function isDeletableCard(card: LearningCard) {
  return isSavedUserCard(card) || isTemporaryCard(card) || isStarterCard(card);
}

function isStarterCard(card: LearningCard) {
  return learningCards.some((starterCard) => starterCard.id === card.id);
}

function getCapturedLinkIdFromTemporaryCard(cardId: string) {
  return cardId.replace(/^temporary-card-/, "");
}

function createTemporaryCard(capturedLink: CapturedLink): LearningCard {
  const source = getCapturedLinkDomain(capturedLink.url);

  return {
    id: `temporary-card-${capturedLink.id}`,
    category: capturedLink.category,
    title: "Untitled saved link",
    url: capturedLink.url,
    summary: "AI is reading this link and preparing a saved card.",
    source,
    dateAdded: "Just now",
    tags: [
      capturedLink.category,
      capturedLink.status,
      source,
      capturedLink.url
    ],
    thumbnailClass:
      "bg-[radial-gradient(circle_at_28%_30%,#fff27a_0_12%,transparent_13%),radial-gradient(circle_at_74%_24%,#b8f46f_0_14%,transparent_15%),linear-gradient(135deg,#fffdf0,#d8ffd1_48%,#ffb6c8)]",
    thumbnailLabel: capturedLink.category
  };
}

export function LearningArchive() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [capturedLinks, setCapturedLinks] = useState<CapturedLink[]>([]);
  const [savedCards, setSavedCards] = useState<LearningCard[]>([]);
  const [hiddenStarterCardIds, setHiddenStarterCardIds] = useState<string[]>(
    []
  );
  const [isSelectingCards, setIsSelectingCards] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  useEffect(() => {
    function syncCapturedLinks() {
      setCapturedLinks(readCapturedLinks());
    }

    function syncSavedCards() {
      setSavedCards(readSavedLearningCards());
    }

    function syncHiddenStarterCards() {
      setHiddenStarterCardIds(readHiddenStarterCardIds());
    }

    function handleCapturedLinksChanged() {
      syncCapturedLinks();
      setActiveCategory("All");
      setSearchTerm("");
    }

    function handleSavedLearningCardsChanged() {
      syncSavedCards();
      setActiveCategory("All");
      setSearchTerm("");
    }

    function handleHiddenStarterCardsChanged() {
      syncHiddenStarterCards();
      setActiveCategory("All");
      setSearchTerm("");
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === capturedLinksStorageKey) {
        handleCapturedLinksChanged();
      }

      if (event.key === savedLearningCardsStorageKey) {
        handleSavedLearningCardsChanged();
      }

      if (event.key === hiddenStarterCardsStorageKey) {
        handleHiddenStarterCardsChanged();
      }
    }

    syncCapturedLinks();
    syncSavedCards();
    syncHiddenStarterCards();
    window.addEventListener(capturedLinksChangedEvent, handleCapturedLinksChanged);
    window.addEventListener(
      savedLearningCardsChangedEvent,
      handleSavedLearningCardsChanged
    );
    window.addEventListener(
      hiddenStarterCardsChangedEvent,
      handleHiddenStarterCardsChanged
    );
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(
        capturedLinksChangedEvent,
        handleCapturedLinksChanged
      );
      window.removeEventListener(
        savedLearningCardsChangedEvent,
        handleSavedLearningCardsChanged
      );
      window.removeEventListener(
        hiddenStarterCardsChangedEvent,
        handleHiddenStarterCardsChanged
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (selectedCardIds.length === 0) {
      setIsConfirmingDelete(false);
    }
  }, [selectedCardIds]);

  const visibleStarterCards = useMemo(
    () =>
      learningCards.filter(
        (starterCard) => !hiddenStarterCardIds.includes(starterCard.id)
      ),
    [hiddenStarterCardIds]
  );

  const allCards = useMemo(
    () => [
      ...savedCards,
      ...capturedLinks.map((capturedLink) =>
        createTemporaryCard(capturedLink)
      ),
      ...visibleStarterCards
    ],
    [capturedLinks, savedCards, visibleStarterCards]
  );

  const learningCategories = useMemo(
    () => ["All", ...Array.from(new Set(allCards.map((card) => card.category)))],
    [allCards]
  );

  const filteredCards = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return allCards.filter((card) => {
      const matchesCategory =
        activeCategory === "All" || card.category === activeCategory;
      const searchableText = [
        card.category,
        card.title,
        card.summary,
        card.source,
        card.url,
        ...card.tags
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!search || searchableText.includes(search));
    });
  }, [activeCategory, allCards, searchTerm]);

  const selectedCardsCount = selectedCardIds.length;
  const hasDeletableCards = filteredCards.some(isDeletableCard);

  function toggleSelectedCard(cardId: string) {
    setSelectedCardIds((currentIds) =>
      currentIds.includes(cardId)
        ? currentIds.filter((id) => id !== cardId)
        : [...currentIds, cardId]
    );
  }

  function stopSelectingCards() {
    setIsSelectingCards(false);
    setIsConfirmingDelete(false);
    setSelectedCardIds([]);
  }

  function deleteSelectedCards() {
    if (selectedCardIds.length === 0) {
      return;
    }

    const savedCardIds = selectedCardIds.filter((id) =>
      id.startsWith("saved-card-")
    );
    const capturedLinkIds = selectedCardIds
      .filter((id) => id.startsWith("temporary-card-"))
      .map(getCapturedLinkIdFromTemporaryCard);
    const starterCardIds = selectedCardIds.filter((id) =>
      learningCards.some((starterCard) => starterCard.id === id)
    );

    if (savedCardIds.length > 0) {
      removeSavedLearningCards(savedCardIds);
    }

    if (capturedLinkIds.length > 0) {
      removeCapturedLinks(capturedLinkIds);
    }

    if (starterCardIds.length > 0) {
      hideStarterCards(starterCardIds);
    }

    stopSelectingCards();
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-8 sm:px-8 lg:px-10">
        <button
          aria-label="Open navigation"
          className="flex h-10 w-10 items-center justify-center text-sage"
          type="button"
        >
          <span className="flex flex-col gap-1.5">
            <span className="h-0.5 w-6 bg-current" />
            <span className="h-0.5 w-6 bg-current" />
            <span className="h-0.5 w-6 bg-current" />
          </span>
        </button>

        <a
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          href="/"
          aria-label="Kaylin's Learning Hub"
        >
          <KaylinLogo />
        </a>

        <nav
          aria-label="Archive sections"
          className="hidden items-center gap-5 text-xs font-bold uppercase tracking-[0.2em] text-sage sm:flex"
        >
          <a href="#archive">Archive</a>
          <a href="#filters">Search</a>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 pb-12 pt-6 sm:px-8 lg:px-10">
        <div className="border-y border-ink/10 py-10 sm:py-12">
          <div className="w-full">
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-sage">
              Curated learning archive
            </p>
            <h1 className="display-bubble mt-5 whitespace-nowrap text-[clamp(2.25rem,6.7vw,6.9rem)] leading-none text-ink">
              Kaylin&apos;s Learning Hub
            </h1>
          </div>
          <p className="mt-8 max-w-3xl text-lg font-semibold leading-8 text-ink/68">
            A visual archive of links, notes, and ideas worth revisiting.
          </p>
        </div>
      </section>

      <LinkInbox />

      <section
        id="filters"
        className="sticky top-0 z-10 border-y border-ink/10 bg-paper/90 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:px-10">
          <label className="relative block w-full lg:max-w-md">
            <span className="sr-only">Search saved links</span>
            <input
              className="w-full border border-ink/15 bg-white/70 px-5 py-3 text-base font-semibold outline-none transition placeholder:text-ink/35 focus:border-sage"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search links, topics, sources..."
              type="search"
              value={searchTerm}
            />
          </label>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:ml-auto lg:pb-0">
            {learningCategories.map((category) => (
              <button
                className={`whitespace-nowrap border px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] transition ${
                  activeCategory === category
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/15 bg-white/55 text-ink/70 hover:border-sage hover:text-sage"
                }`}
                key={category}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section
        id="archive"
        className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-10"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-sage">
              {filteredCards.length} saved cards
            </p>
            {isSelectingCards ? (
              <p className="mt-2 text-sm text-ink/55">
                {selectedCardsCount} selected
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            {isSelectingCards ? (
              <>
                <button
                  className="border border-clay bg-clay px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-paper transition disabled:cursor-not-allowed disabled:border-ink/15 disabled:bg-ink/10 disabled:text-ink/35"
                  disabled={selectedCardsCount === 0}
                  onClick={() => setIsConfirmingDelete(true)}
                  type="button"
                >
                  Delete selected
                </button>
                <button
                  className="border border-ink/15 bg-white/55 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-ink/70 transition hover:border-sage hover:text-sage"
                  onClick={stopSelectingCards}
                  type="button"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="border border-ink/15 bg-white/55 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-ink/70 transition hover:border-sage hover:text-sage disabled:cursor-not-allowed disabled:text-ink/30"
                  disabled={!hasDeletableCards}
                  onClick={() => setIsSelectingCards(true)}
                  type="button"
                >
                  Select
                </button>
                <p className="hidden py-3 text-xs font-bold uppercase tracking-[0.28em] text-sage/80 sm:block">
                  Browse slowly
                </p>
              </>
            )}
          </div>
        </div>

        {isConfirmingDelete ? (
          <div
            aria-live="polite"
            className="mb-8 border border-clay/30 bg-white/65 p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-serif text-2xl leading-tight text-ink">
                Are you sure to delete {selectedCardsCount}{" "}
                {selectedCardsCount === 1 ? "card" : "cards"}?
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="border border-clay bg-clay px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-paper transition hover:border-ink hover:bg-ink"
                  onClick={deleteSelectedCards}
                  type="button"
                >
                  Yes, delete
                </button>
                <button
                  className="border border-ink/15 bg-white/55 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-ink/70 transition hover:border-sage hover:text-sage"
                  onClick={() => setIsConfirmingDelete(false)}
                  type="button"
                >
                  Keep cards
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-x-10 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((card) => {
            const temporaryStatus = isTemporaryCard(card)
              ? card.tags.includes("Failed")
                ? "Failed"
                : "Processing"
              : null;
            const isDeletable = isDeletableCard(card);
            const isSelected = selectedCardIds.includes(card.id);

            return (
              <article className="group" key={card.id}>
                <a
                  aria-disabled={isSelectingCards}
                  className={`block ${
                    isSelectingCards && isDeletable
                      ? "cursor-pointer"
                      : ""
                  }`}
                  href={card.url}
                  onClick={(event) => {
                    if (isSelectingCards) {
                      event.preventDefault();

                      if (isDeletable) {
                        toggleSelectedCard(card.id);
                      }
                    }
                  }}
                >
                  <div
                    aria-label={card.thumbnailLabel}
                    className={`relative aspect-[1.35] overflow-hidden ${
                      card.imageUrl ? "bg-ink/5" : card.thumbnailClass
                    }`}
                    role="img"
                  >
                    {card.imageUrl ? (
                      <img
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        src={card.imageUrl}
                      />
                    ) : null}
                    <div className="absolute inset-4 border border-white/60" />
                    <div className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] bg-paper/95 px-3 py-2 font-serif text-xl leading-tight text-ink shadow-soft">
                      {card.thumbnailLabel}
                    </div>
                    {isSelectingCards ? (
                      <span
                        className={`absolute right-4 top-4 flex h-9 w-9 items-center justify-center border text-sm font-black transition ${
                          isSelected
                            ? "border-ink bg-ink text-paper"
                            : isDeletable
                              ? "border-white/80 bg-paper/90 text-ink"
                              : "border-white/40 bg-paper/70 text-ink/25"
                        }`}
                      >
                        {isSelected ? "\u2713" : ""}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-sage">
                      {card.category}
                    </p>
                    <h2 className="mt-3 font-serif text-3xl leading-tight text-ink transition group-hover:text-sage">
                      {card.title}
                    </h2>
                    <p className="mt-4 text-base font-medium leading-7 text-ink/68">
                      {card.summary}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-ink/10 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
                      <span>{card.source}</span>
                      <span>{card.dateAdded}</span>
                      {temporaryStatus ? (
                        <span className="text-sage">{temporaryStatus}</span>
                      ) : null}
                    </div>
                  </div>
                </a>
              </article>
            );
          })}
        </div>

        {filteredCards.length === 0 ? (
          <div className="border border-ink/10 bg-white/45 px-6 py-12 text-center">
            <p className="font-serif text-3xl text-ink">No cards found.</p>
            <p className="mt-3 text-ink/60">
              Try a different search word or category.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
