import { NextResponse } from "next/server";
import { learningCategoryOptions } from "@/lib/learningCategories";

const maxArticleCharacters = 12000;
const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

type ProcessedLink = {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  source: string;
  imageUrl?: string;
};

function normalizeUrl(url: string) {
  const normalizedUrl = /^[a-z][a-z\d+\-.]*:\/\//i.test(url)
    ? url
    : `https://${url}`;
  const parsedUrl = new URL(normalizedUrl);

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Only http and https links are supported.");
  }

  return parsedUrl.toString();
}

function getSource(url: string) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const metaPattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escapedKey}["'][^>]*>`,
    "i"
  );
  const match = html.match(metaPattern);

  return decodeHtmlEntities((match?.[1] ?? match?.[2] ?? "").trim());
}

function getTagText(html: string, tagName: string) {
  const match = html.match(
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i")
  );

  return decodeHtmlEntities(
    (match?.[1] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function resolveImageUrl(imageUrl: string, pageUrl: string) {
  if (!imageUrl) {
    return undefined;
  }

  try {
    return new URL(imageUrl, pageUrl).toString();
  } catch {
    return undefined;
  }
}

function extractReadableText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxArticleCharacters)
  );
}

async function fetchArticleContext(url: string) {
  const normalizedUrl = normalizeUrl(url);
  const controller = new AbortController();
  const timeout = windowlessSetTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent":
          "Mozilla/5.0 (compatible; LearningHubBot/1.0; +https://example.com)"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Could not read link content (${response.status}).`);
    }

    const html = await response.text();
    const title =
      getMetaContent(html, "og:title") ||
      getMetaContent(html, "twitter:title") ||
      getTagText(html, "title") ||
      getTagText(html, "h1");
    const description =
      getMetaContent(html, "description") ||
      getMetaContent(html, "og:description") ||
      getMetaContent(html, "twitter:description");
    const imageUrl = resolveImageUrl(
      getMetaContent(html, "og:image") ||
        getMetaContent(html, "og:image:url") ||
        getMetaContent(html, "twitter:image") ||
        getMetaContent(html, "image"),
      normalizedUrl
    );

    return {
      url: normalizedUrl,
      source: getSource(normalizedUrl),
      title,
      description,
      text: extractReadableText(html),
      imageUrl
    };
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessSetTimeout(callback: () => void, delay: number) {
  return setTimeout(callback, delay);
}

function validateProcessedLink(value: unknown, source: string): ProcessedLink {
  if (!value || typeof value !== "object") {
    throw new Error("AI response was not an object.");
  }

  const processedLink = value as Partial<ProcessedLink>;
  const tags = Array.isArray(processedLink.tags)
    ? processedLink.tags.filter((tag) => typeof tag === "string").slice(0, 4)
    : [];

  return {
    title:
      typeof processedLink.title === "string" && processedLink.title.trim()
        ? processedLink.title.trim()
        : "Saved article",
    summary:
      typeof processedLink.summary === "string" && processedLink.summary.trim()
        ? processedLink.summary.trim()
        : "A saved article ready to revisit.",
    category:
      typeof processedLink.category === "string" && processedLink.category.trim()
        ? processedLink.category.trim()
        : "Learn Later",
    tags: tags.length > 0 ? tags : ["learn later"],
    source:
      typeof processedLink.source === "string" && processedLink.source.trim()
        ? processedLink.source.trim()
        : source
  };
}

function createFallbackProcessedLink(
  context: Awaited<ReturnType<typeof fetchArticleContext>>,
  selectedCategory: string
): ProcessedLink {
  return {
    title: context.title || context.source || "Saved article",
    summary:
      context.description ||
      (context.text
        ? `${context.text.slice(0, 180).trim()}${context.text.length > 180 ? "..." : ""}`
        : "A saved link ready to revisit."),
    category: selectedCategory,
    tags: ["learn later", context.source].filter(Boolean).slice(0, 4),
    source: context.source
  };
}

function parseGeminiJsonOutput(outputText: string) {
  const cleanedOutput = outputText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleanedOutput);
}

async function analyzeLinkWithGemini(
  context: Awaited<ReturnType<typeof fetchArticleContext>>,
  selectedCategory: string
) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in .env.local.");
  }

  const prompt = `You create concise learning archive cards from article metadata and article text. Use the article's real title when available. Do not invent unsupported facts.

Create one saved learning card from this link.

URL: ${context.url}
Source: ${context.source}
Selected category: ${selectedCategory}
HTML title: ${context.title || "Unknown"}
Meta description: ${context.description || "Unknown"}
Article excerpt:
${context.text || "No readable article text was available."}

Return:
- title: the real article/page title, cleaned up
- summary: one short sentence summarizing the article content in the same language as the article/page. Do not translate the summary into English unless the original article is English.
- category: exactly "${selectedCategory}"
- tags: 2 to 4 specific lowercase tags
- source: domain/source name`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 700,
          response_mime_type: "application/json",
          response_schema: {
            type: "OBJECT",
            required: ["title", "summary", "category", "tags", "source"],
            properties: {
              title: { type: "STRING" },
              summary: { type: "STRING" },
              category: { type: "STRING" },
              tags: {
                type: "ARRAY",
                minItems: 2,
                maxItems: 4,
                items: { type: "STRING" }
              },
              source: { type: "STRING" }
            }
          }
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const outputText = data.candidates
    ?.flatMap(
      (candidate: { content?: { parts?: Array<{ text?: string }> } }) =>
        candidate.content?.parts?.map((part) => part.text) ?? []
    )
    .filter(Boolean)
    .join("");

  if (!outputText) {
    throw new Error("Gemini response did not include text output.");
  }

  return {
    ...validateProcessedLink(
      parseGeminiJsonOutput(outputText),
      context.source
    ),
    imageUrl: context.imageUrl
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const category =
      typeof body.category === "string" &&
      learningCategoryOptions.includes(body.category)
        ? body.category
        : learningCategoryOptions[0];

    if (!url) {
      return NextResponse.json({ error: "Missing link URL." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in .env.local." },
        { status: 500 }
      );
    }

    const context = await fetchArticleContext(url);
    const card = await analyzeLinkWithGemini(context, category).catch((error) => {
      if (
        error instanceof SyntaxError ||
        (error instanceof Error &&
          error.message.toLowerCase().includes("json"))
      ) {
        return {
          ...createFallbackProcessedLink(context, category),
          imageUrl: context.imageUrl
        };
      }

      throw error;
    });

    return NextResponse.json({ card: { ...card, category } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not process this link."
      },
      { status: 500 }
    );
  }
}
