import type { LearningCard } from "@/data/learningCards";
import {
  readCapturedLinks,
  removeCapturedLink,
  updateCapturedLinkStatus,
  type CapturedLink
} from "@/lib/capturedLinks";
import { upsertSavedLearningCard } from "@/lib/savedLearningCards";

const processingLinkIds = new Set<string>();

const thumbnailClasses = [
  "bg-[linear-gradient(135deg,#fdf6e9,#c7d8ee_44%,#f8b6a7)]",
  "bg-[radial-gradient(circle_at_26%_30%,#ffd96f_0_13%,transparent_14%),linear-gradient(145deg,#fbefe7,#a9cbb7_48%,#f7c9bd)]",
  "bg-[linear-gradient(90deg,rgba(45,40,35,.08)_1px,transparent_1px),linear-gradient(rgba(45,40,35,.08)_1px,transparent_1px),linear-gradient(135deg,#fff8ec,#d9ecdf_46%,#f6b4c8)] [background-size:22px_22px,22px_22px,100%_100%]",
  "bg-[radial-gradient(ellipse_at_30%_28%,#fff7bf_0_18%,transparent_19%),repeating-linear-gradient(115deg,#e8f1de_0_16px,#f8d0b3_16px_32px,#fbf7f0_32px_48px)]"
];

type ProcessedLink = {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  source: string;
  imageUrl?: string;
};

function getThumbnailClass(id: string) {
  const thumbnailIndex =
    id.split("").reduce((total, char) => total + char.charCodeAt(0), 0) %
    thumbnailClasses.length;

  return thumbnailClasses[thumbnailIndex];
}

function createLearningCard(
  capturedLink: CapturedLink,
  processedLink: ProcessedLink
): LearningCard {
  return {
    id: `saved-card-${capturedLink.id}`,
    category: processedLink.category,
    title: processedLink.title,
    url: capturedLink.url,
    summary: processedLink.summary,
    source: processedLink.source,
    dateAdded: "Just now",
    tags: processedLink.tags,
    thumbnailClass: getThumbnailClass(capturedLink.id),
    thumbnailLabel: processedLink.category || processedLink.source || "Saved link",
    imageUrl: processedLink.imageUrl
  };
}

async function requestProcessedLink(url: string, category: string) {
  const response = await fetch("/api/process-link", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ url, category })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Could not process this link.");
  }

  return data.card as ProcessedLink;
}

export async function processCapturedLinkWithAi(capturedLink: CapturedLink) {
  if (
    typeof window === "undefined" ||
    processingLinkIds.has(capturedLink.id) ||
    capturedLink.status === "Processing" ||
    capturedLink.status === "Failed"
  ) {
    return;
  }

  processingLinkIds.add(capturedLink.id);
  updateCapturedLinkStatus(capturedLink.id, "Processing");

  try {
    const processedLink = await requestProcessedLink(
      capturedLink.url,
      capturedLink.category
    );
    const capturedLinkStillPending = readCapturedLinks().find(
      (storedLink) => storedLink.id === capturedLink.id
    );

    if (!capturedLinkStillPending) {
      return;
    }

    upsertSavedLearningCard(
      createLearningCard(capturedLinkStillPending, processedLink)
    );
    removeCapturedLink(capturedLink.id);
  } catch (error) {
    updateCapturedLinkStatus(
      capturedLink.id,
      "Failed",
      error instanceof Error ? error.message : "Could not process this link."
    );
  } finally {
    processingLinkIds.delete(capturedLink.id);
  }
}

export function processCapturedLinksWithAi(capturedLinks: CapturedLink[]) {
  capturedLinks.forEach((capturedLink) => {
    void processCapturedLinkWithAi(capturedLink);
  });
}
