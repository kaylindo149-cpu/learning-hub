"use client";

import { useEffect, useMemo, useState } from "react";
import { KaylinLogo } from "@/components/KaylinLogo";
import { learningCards, type LearningCard } from "@/data/learningCards";
import {
  capturedLinksChangedEvent,
  capturedLinksStorageKey,
  getCapturedLinkDomain,
  readCapturedLinks,
  removeCapturedLinks,
  saveCapturedLinks,
  type CapturedLink
} from "@/lib/capturedLinks";
import {
  readSavedLearningCards,
  removeSavedLearningCards,
  saveSavedLearningCards,
  savedLearningCardsChangedEvent,
  savedLearningCardsStorageKey
} from "@/lib/savedLearningCards";
import {
  learningCategoriesChangedEvent,
  learningCategoriesStorageKey,
  readLearningCategories,
  saveLearningCategories
} from "@/lib/learningCategories";
import {
  hiddenStarterCardsChangedEvent,
  hiddenStarterCardsStorageKey,
  hideStarterCards,
  readHiddenStarterCardIds
} from "@/lib/hiddenStarterCards";
import { syncBrowserArchiveStateWithServer } from "@/lib/browserArchiveState";

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

function normalizeCategoryName(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

function normalizeTagValue(tag: string) {
  return normalizeCategoryName(tag).toLowerCase();
}

const tagMarkColors = [
  "#ff6f91",
  "#ffb84d",
  "#59c7f2",
  "#7ed957",
  "#b86bff",
  "#ff7a59",
  "#48d1b5",
  "#ff4f64",
  "#9bdc4a",
  "#4aa8ff",
  "#f05bd5",
  "#2ec4b6",
  "#ff9f1c",
  "#6a9cff",
  "#c77dff",
  "#00b894"
];

const tagMarkShapes = ["star", "flower", "heart"] as const;

function getTagMarkSeed(tag: string) {
  return normalizeTagValue(tag)
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);
}

function TagMark({
  colorIndex,
  muted = false,
  tag
}: {
  colorIndex?: number;
  muted?: boolean;
  tag: string;
}) {
  const seed = getTagMarkSeed(tag);
  const shape = tagMarkShapes[seed % tagMarkShapes.length];
  const resolvedColorIndex =
    typeof colorIndex === "number" && colorIndex >= 0
      ? colorIndex
      : seed;
  const color = muted
    ? "rgba(45, 40, 35, 0.24)"
    : tagMarkColors[resolvedColorIndex % tagMarkColors.length];

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
      style={{ color }}
    >
      <svg
        className="h-full w-full"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        {shape === "star" ? (
          <path d="M10 1.7 12.4 7l5.8.7-4.3 3.9 1.2 5.7-5.1-2.9-5.1 2.9 1.2-5.7-4.3-3.9L7.6 7 10 1.7Z" />
        ) : null}
        {shape === "flower" ? (
          <>
            <circle cx="10" cy="10" r="2.7" />
            <circle cx="10" cy="4.6" r="3" />
            <circle cx="14.9" cy="8.4" r="3" />
            <circle cx="13" cy="14.3" r="3" />
            <circle cx="7" cy="14.3" r="3" />
            <circle cx="5.1" cy="8.4" r="3" />
          </>
        ) : null}
        {shape === "heart" ? (
          <path d="M10 17.2S2.8 13.1 2.8 7.7c0-2.7 1.7-4.5 4-4.5 1.4 0 2.6.7 3.2 1.8.6-1.1 1.8-1.8 3.2-1.8 2.3 0 4 1.8 4 4.5 0 5.4-7.2 9.5-7.2 9.5Z" />
        ) : null}
      </svg>
    </span>
  );
}

function isUtilityTag(tag: string, card: LearningCard) {
  const normalizedTag = normalizeTagValue(tag);

  return (
    normalizedTag === "pending" ||
    normalizedTag === "processing" ||
    normalizedTag === "failed" ||
    normalizedTag === normalizeTagValue(card.source) ||
    normalizedTag.startsWith("http://") ||
    normalizedTag.startsWith("https://")
  );
}

function getCardTags(card: LearningCard, tagOptions: string[]) {
  const tagLookup = new Map(
    tagOptions.map((tag) => [normalizeTagValue(tag), tag] as const)
  );
  const tagMap = new Map<string, string>();

  [card.category, ...card.tags].forEach((tag) => {
    const normalizedTag = normalizeTagValue(tag);
    const manualTag = tagLookup.get(normalizedTag);

    if (!manualTag || isUtilityTag(tag, card)) {
      return;
    }

    if (!tagMap.has(normalizedTag)) {
      tagMap.set(normalizedTag, manualTag);
    }
  });

  return Array.from(tagMap.values());
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
    ].filter(Boolean),
    thumbnailClass:
      "bg-[radial-gradient(circle_at_28%_30%,#fff27a_0_12%,transparent_13%),radial-gradient(circle_at_74%_24%,#b8f46f_0_14%,transparent_15%),linear-gradient(135deg,#fffdf0,#d8ffd1_48%,#ffb6c8)]",
    thumbnailLabel: capturedLink.category || "Saved link"
  };
}

export function LearningArchive() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [capturedLinks, setCapturedLinks] = useState<CapturedLink[]>([]);
  const [savedCards, setSavedCards] = useState<LearningCard[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [activeCardCategoryMenuId, setActiveCardCategoryMenuId] = useState("");
  const [hiddenStarterCardIds, setHiddenStarterCardIds] = useState<string[]>(
    []
  );
  const [isSelectingCards, setIsSelectingCards] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  useEffect(() => {
    void syncBrowserArchiveStateWithServer();
  }, []);

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

    function syncLearningCategories() {
      setCategoryOptions(readLearningCategories());
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

    function handleLearningCategoriesChanged() {
      syncLearningCategories();
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

      if (event.key === learningCategoriesStorageKey) {
        handleLearningCategoriesChanged();
      }
    }

    syncCapturedLinks();
    syncSavedCards();
    syncHiddenStarterCards();
    syncLearningCategories();
    window.addEventListener(capturedLinksChangedEvent, handleCapturedLinksChanged);
    window.addEventListener(
      savedLearningCardsChangedEvent,
      handleSavedLearningCardsChanged
    );
    window.addEventListener(
      hiddenStarterCardsChangedEvent,
      handleHiddenStarterCardsChanged
    );
    window.addEventListener(
      learningCategoriesChangedEvent,
      handleLearningCategoriesChanged
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
      window.removeEventListener(
        learningCategoriesChangedEvent,
        handleLearningCategoriesChanged
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
        (starterCard) =>
          !hiddenStarterCardIds.includes(starterCard.id) &&
          (categoryOptions.length === 0 ||
            categoryOptions.includes(starterCard.category))
      ),
    [categoryOptions, hiddenStarterCardIds]
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

  const learningCategories = useMemo(() => ["All", ...categoryOptions], [
    categoryOptions
  ]);

  const filteredCards = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return allCards.filter((card) => {
      const matchesCategory =
        activeCategory === "All" ||
        getCardTags(card, categoryOptions).some(
          (tag) => normalizeTagValue(tag) === normalizeTagValue(activeCategory)
        );
      const manualTags = getCardTags(card, categoryOptions);
      const searchableText = [
        card.title,
        card.summary,
        card.source,
        card.url,
        ...manualTags
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!search || searchableText.includes(search));
    });
  }, [activeCategory, allCards, categoryOptions, searchTerm]);

  const selectedCardsCount = selectedCardIds.length;
  const hasDeletableCards = filteredCards.some(isDeletableCard);
  const filteredDeletableCardIds = useMemo(
    () => filteredCards.filter(isDeletableCard).map((card) => card.id),
    [filteredCards]
  );
  const areAllFilteredDeletableCardsSelected =
    filteredDeletableCardIds.length > 0 &&
    filteredDeletableCardIds.every((cardId) =>
      selectedCardIds.includes(cardId)
    );

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

  function toggleAllFilteredCards() {
    const filteredDeletableCardIdsSet = new Set(filteredDeletableCardIds);

    setSelectedCardIds((currentIds) => {
      const hasSelectedAllFilteredCards =
        filteredDeletableCardIds.length > 0 &&
        filteredDeletableCardIds.every((cardId) =>
          currentIds.includes(cardId)
        );

      if (hasSelectedAllFilteredCards) {
        return currentIds.filter(
          (cardId) => !filteredDeletableCardIdsSet.has(cardId)
        );
      }

      return Array.from(new Set([...currentIds, ...filteredDeletableCardIds]));
    });
  }

  function saveCategoryChanges(
    nextCategories: string[],
    renamedCategory?: { from: string; to: string },
    deletedCategory?: { category: string }
  ) {
    saveLearningCategories(nextCategories);

    if (renamedCategory) {
      saveSavedLearningCards(
        readSavedLearningCards().map((card) => ({
          ...card,
          category:
            card.category === renamedCategory.from
              ? renamedCategory.to
              : card.category,
          tags: card.tags.map((tag) =>
            tag === renamedCategory.from ? renamedCategory.to : tag
          ),
          thumbnailLabel:
            card.thumbnailLabel === renamedCategory.from
              ? renamedCategory.to
              : card.thumbnailLabel
        }))
      );
      saveCapturedLinks(
        readCapturedLinks().map((capturedLink) =>
          capturedLink.category === renamedCategory.from
            ? { ...capturedLink, category: renamedCategory.to }
            : capturedLink
        )
      );
      return;
    }

    if (deletedCategory) {
      saveSavedLearningCards(
        readSavedLearningCards().map((card) => {
          const nextTags = card.tags.filter(
            (tag) => tag !== deletedCategory.category
          );
          const nextCategory =
            card.category === deletedCategory.category
              ? nextTags[0] ?? ""
              : card.category;

          return {
            ...card,
            category: nextCategory,
            tags: nextTags,
            thumbnailLabel:
              card.thumbnailLabel === deletedCategory.category
                ? nextCategory || "Saved link"
                : card.thumbnailLabel
          };
        })
      );
      saveCapturedLinks(
        readCapturedLinks().map((capturedLink) =>
          capturedLink.category === deletedCategory.category
            ? { ...capturedLink, category: "" }
            : capturedLink
        )
      );
    }
  }

  function handleAddCategory() {
    const nextCategory = normalizeCategoryName(newCategoryName);

    if (!nextCategory) {
      setCategoryMessage("Enter a category name first.");
      return;
    }

    if (
      categoryOptions.some(
        (category) => category.toLowerCase() === nextCategory.toLowerCase()
      )
    ) {
      setCategoryMessage("That category already exists.");
      return;
    }

    saveLearningCategories([...categoryOptions, nextCategory]);
    setNewCategoryName("");
    setCategoryMessage(`Added ${nextCategory}.`);
  }

  function startRenamingCategory(category: string) {
    setEditingCategory(category);
    setEditingCategoryName(category);
    setCategoryMessage("");
  }

  function cancelRenamingCategory() {
    setEditingCategory("");
    setEditingCategoryName("");
  }

  function handleRenameCategory() {
    const nextCategory = normalizeCategoryName(editingCategoryName);

    if (!editingCategory) {
      return;
    }

    if (!nextCategory) {
      setCategoryMessage("Enter a category name first.");
      return;
    }

    if (
      categoryOptions.some(
        (category) =>
          category !== editingCategory &&
          category.toLowerCase() === nextCategory.toLowerCase()
      )
    ) {
      setCategoryMessage("That category already exists.");
      return;
    }

    const nextCategories = categoryOptions.map((category) =>
      category === editingCategory ? nextCategory : category
    );

    saveCategoryChanges(nextCategories, {
      from: editingCategory,
      to: nextCategory
    });
    setCategoryMessage(`Renamed ${editingCategory} to ${nextCategory}.`);
    cancelRenamingCategory();
  }

  function handleDeleteCategory(category: string) {
    const nextCategories = categoryOptions.filter(
      (currentCategory) => currentCategory !== category
    );

    saveCategoryChanges(nextCategories, undefined, {
      category
    });
    setCategoryMessage(`Deleted ${category}. Existing cards were updated.`);
    if (editingCategory === category) {
      cancelRenamingCategory();
    }
  }

  function openCategoryManager() {
    setIsManagingCategories(true);
    setCategoryMessage("");
  }

  function closeCategoryManager() {
    setIsManagingCategories(false);
  }

  function toggleCardCategoryMenu(cardId: string) {
    setActiveCardCategoryMenuId((currentCardId) =>
      currentCardId === cardId ? "" : cardId
    );
  }

  function getTagColorIndex(tag: string) {
    return categoryOptions.findIndex(
      (category) => normalizeTagValue(category) === normalizeTagValue(tag)
    );
  }

  function updateSavedCardTags(cardId: string, nextTags: string[]) {
    const nextTagSet = new Set(nextTags.map(normalizeTagValue));
    const normalizedNextTags = categoryOptions.filter((category) =>
      nextTagSet.has(normalizeTagValue(category))
    );
    const primaryTag = normalizedNextTags[0] ?? "";

    saveSavedLearningCards(
      readSavedLearningCards().map((card) =>
        card.id === cardId
          ? {
              ...card,
              category: primaryTag,
              tags: normalizedNextTags,
              thumbnailLabel:
                card.thumbnailLabel === card.category ||
                card.thumbnailLabel === "Saved link"
                  ? primaryTag || "Saved link"
                  : card.thumbnailLabel
            }
          : card
      )
    );
    setCategoryMessage("");
  }

  function toggleSavedCardTag(card: LearningCard, tag: string) {
    const currentTags = getCardTags(card, categoryOptions);
    const normalizedTag = normalizeTagValue(tag);
    const nextTags = currentTags.some(
      (currentTag) => normalizeTagValue(currentTag) === normalizedTag
    )
      ? currentTags.filter(
          (currentTag) => normalizeTagValue(currentTag) !== normalizedTag
        )
      : [...currentTags, tag];

    updateSavedCardTags(card.id, nextTags);
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
      {activeCardCategoryMenuId ? (
        <button
          aria-label="Close card category menu"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          onClick={() => setActiveCardCategoryMenuId("")}
          type="button"
        />
      ) : null}

      <section
        className="relative h-[48vh] min-h-[360px] max-h-[560px] overflow-hidden bg-cover bg-[position:center_bottom] saturate-[1.2] contrast-[1.04]"
        style={{
          backgroundImage: "url('/images/learning-hub-meadow-hero.png')"
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_34%,rgba(21,54,23,0.1)_100%)]" />
        <div className="relative z-[1] flex h-full flex-col items-center px-5 pt-5 text-center sm:pt-6">
          <a
            className="flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14 [&_svg]:h-full [&_svg]:w-full"
            href="/"
            aria-label="Kaylin's Learning Hub"
          >
            <KaylinLogo />
          </a>
          <div className="mb-[clamp(2.1rem,5.8vh,4.5rem)] mt-auto flex flex-col items-center">
            <h1 className="display-bubble max-w-[94vw] whitespace-nowrap text-[clamp(1.65rem,3.75vw,3.65rem)] leading-none text-white drop-shadow-[0_4px_18px_rgba(42,31,41,0.34)]">
              Kaylin&apos;s Learning Hub
            </h1>
            <div
              aria-hidden="true"
              className="mt-4 w-[min(68vw,280px)] text-white drop-shadow-[0_2px_8px_rgba(42,31,41,0.26)] sm:mt-5 sm:w-[min(28vw,320px)]"
            >
              <svg
                fill="none"
                viewBox="0 0 420 160"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M76 105c-26 0-49-14-49-34 0-19 23-34 51-32 8-22 36-34 64-24 16-18 48-21 72-6 16-13 41-11 59 3 17 13 23 31 16 48 28-1 52 15 54 36 2 23-24 39-54 34-17 21-53 25-82 10-28 19-70 16-92-4-15 7-36 5-49-7-10-8-14-17-11-26 6 2 13 3 21 2Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4.2"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  fill="currentColor"
                  fontFamily="Inter, Arial, sans-serif"
                  fontSize="19"
                  fontWeight="600"
                  opacity="0.5"
                  textAnchor="middle"
                  x="208"
                  y="83"
                >
                  paste your links here
                </text>
              </svg>
            </div>
          </div>
        </div>
      </section>

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
            {learningCategories.map((category, categoryIndex) => (
              <button
                className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-[0.68rem] font-bold lowercase tracking-normal transition ${
                  activeCategory === category
                    ? "border-ink bg-ink text-paper shadow-soft"
                    : "border-ink/25 bg-white/55 text-ink/70 hover:border-sage hover:text-sage"
                }`}
                key={category}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                {category !== "All" ? (
                  <TagMark colorIndex={categoryIndex - 1} tag={category} />
                ) : null}
                {category}
              </button>
            ))}
            <button
              className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-ink/15 bg-paper/80 px-3 text-[0.68rem] font-bold lowercase tracking-normal text-sage transition hover:border-sage hover:bg-white"
              onClick={() => openCategoryManager()}
              type="button"
            >
              manage tags
            </button>
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
                  className="border border-ink/15 bg-white/55 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-ink/70 transition hover:border-sage hover:text-sage disabled:cursor-not-allowed disabled:text-ink/30"
                  disabled={filteredDeletableCardIds.length === 0}
                  onClick={toggleAllFilteredCards}
                  type="button"
                >
                  {areAllFilteredDeletableCardsSelected
                    ? "Deselect all"
                    : "Select all"}
                </button>
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
            const cardTags = getCardTags(card, categoryOptions);

            return (
              <article className="group relative" key={card.id}>
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
                    <div className="flex flex-wrap gap-2">
                      {cardTags.map((tag) => (
                        <span
                          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-2.5 text-[0.68rem] font-bold lowercase text-ink/68"
                          key={tag}
                        >
                          <TagMark
                            colorIndex={getTagColorIndex(tag)}
                            tag={tag}
                          />
                          {tag}
                        </span>
                      ))}
                    </div>
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
                {isSavedUserCard(card) && !isSelectingCards ? (
                  <>
                    <button
                      aria-expanded={activeCardCategoryMenuId === card.id}
                      aria-label="Edit card categories"
                      className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-paper/90 text-lg font-black leading-none text-ink shadow-soft transition hover:border-sage hover:text-sage"
                      onClick={() => toggleCardCategoryMenu(card.id)}
                      type="button"
                    >
                      ...
                    </button>
                    {activeCardCategoryMenuId === card.id ? (
                      <div className="absolute right-3 top-14 z-30 w-72 border border-ink/10 bg-paper p-3 shadow-soft">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage">
                            Categories
                          </p>
                          <button
                            className="text-xs font-bold lowercase text-ink/45 transition hover:text-sage"
                            onClick={() => setActiveCardCategoryMenuId("")}
                            type="button"
                          >
                            done
                          </button>
                        </div>
                        {categoryOptions.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {categoryOptions.map((category, categoryIndex) => {
                              const isSelected = cardTags.some(
                                (tag) =>
                                  normalizeTagValue(tag) ===
                                  normalizeTagValue(category)
                              );

                              return (
                                <button
                                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[0.68rem] font-bold lowercase transition ${
                                    isSelected
                                      ? "border-ink bg-ink text-paper"
                                      : "border-ink/20 bg-white/60 text-ink/60 hover:border-sage hover:text-sage"
                                  }`}
                                  key={category}
                                  onClick={() =>
                                    toggleSavedCardTag(card, category)
                                  }
                                  type="button"
                                >
                                  <TagMark
                                    colorIndex={categoryIndex}
                                    muted={!isSelected}
                                    tag={category}
                                  />
                                  {category}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm font-semibold leading-6 text-ink/50">
                            Create tags from manage tags first.
                          </p>
                        )}
                        {cardTags.length === 0 ? (
                          <p className="mt-3 text-xs font-bold lowercase text-ink/42">
                            no categories selected
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
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

      {isManagingCategories ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center px-4 py-5 sm:items-center"
          role="dialog"
        >
          <button
            aria-label="Close tag manager"
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={closeCategoryManager}
            type="button"
          />
          <section className="relative max-h-[min(42rem,calc(100vh-2.5rem))] w-full max-w-2xl overflow-y-auto border border-ink/10 bg-paper p-5 shadow-soft sm:p-6">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-sage">
                  Manage
                </p>
                <h2 className="mt-2 font-serif text-3xl text-ink">Tags</h2>
              </div>
              <button
                className="h-10 border border-ink/15 bg-white/55 px-4 text-xs font-bold uppercase tracking-[0.14em] text-ink/65 transition hover:border-sage hover:text-sage"
                onClick={closeCategoryManager}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">New tag</span>
                <input
                  className="h-11 w-full border border-ink/15 bg-white/70 px-3 text-sm font-semibold outline-none transition placeholder:text-ink/35 focus:border-sage"
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleAddCategory();
                    }
                  }}
                  placeholder="New tag"
                  type="text"
                  value={newCategoryName}
                />
              </label>
              <button
                className="h-11 border border-ink bg-ink px-4 text-xs font-bold uppercase tracking-[0.14em] text-paper transition hover:border-sage hover:bg-sage"
                onClick={handleAddCategory}
                type="button"
              >
                Add
              </button>
            </div>

            {categoryMessage ? (
              <p className="mt-3 text-sm font-semibold text-ink/55">
                {categoryMessage}
              </p>
            ) : null}

            <ul className="mt-5 space-y-2">
              {categoryOptions.map((category, categoryIndex) => (
                <li
                  className="flex min-w-0 flex-col gap-2 border border-ink/10 bg-white/45 p-2 sm:flex-row sm:items-center"
                  key={category}
                >
                  {editingCategory === category ? (
                    <>
                      <input
                        className="h-10 min-w-0 flex-1 border border-ink/15 bg-paper/80 px-3 text-sm font-semibold outline-none transition focus:border-sage"
                        onChange={(event) =>
                          setEditingCategoryName(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handleRenameCategory();
                          }

                          if (event.key === "Escape") {
                            cancelRenamingCategory();
                          }
                        }}
                        type="text"
                        value={editingCategoryName}
                      />
                      <div className="flex gap-2">
                        <button
                          className="h-10 border border-sage bg-sage px-3 text-xs font-bold uppercase tracking-[0.12em] text-paper"
                          onClick={handleRenameCategory}
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          className="h-10 border border-ink/15 bg-white/55 px-3 text-xs font-bold uppercase tracking-[0.12em] text-ink/60"
                          onClick={cancelRenamingCategory}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex min-w-0 flex-1 items-center gap-2 truncate px-1 text-sm font-bold text-ink">
                        <TagMark colorIndex={categoryIndex} tag={category} />
                        {category}
                      </span>
                      <div className="flex gap-2">
                        <button
                          className="h-10 border border-ink/15 bg-white/55 px-3 text-xs font-bold uppercase tracking-[0.12em] text-ink/60 transition hover:border-sage hover:text-sage"
                          onClick={() => startRenamingCategory(category)}
                          type="button"
                        >
                          Rename
                        </button>
                        <button
                          className="h-10 border border-clay/30 bg-white/55 px-3 text-xs font-bold uppercase tracking-[0.12em] text-clay transition hover:border-clay hover:bg-clay hover:text-paper"
                          onClick={() => handleDeleteCategory(category)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </main>
  );
}
