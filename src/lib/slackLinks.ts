const slackWrappedUrlPattern = /<(https?:\/\/[^>|]+)(?:\|[^>]*)?>/gi;
const plainUrlPattern = /https?:\/\/[^\s<>"']+/gi;
const bracketCategoryPattern = /\[([^\][\n]{1,48})\]/;
const namedCategoryPattern =
  /(?:^|\s)(?:tag|category|cat)\s*:\s*([^\n<]+?)(?=\s*(?:<https?:|https?:|$))/i;

function cleanUrl(url: string) {
  return url.replace(/[),.;!?]+$/g, "");
}

function isSupportedUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function extractUrlsFromSlackText(text: string) {
  const urls: string[] = [];
  const seenUrls = new Set<string>();
  let textWithoutWrappedUrls = text;

  for (const match of text.matchAll(slackWrappedUrlPattern)) {
    const url = cleanUrl(match[1]);

    if (isSupportedUrl(url) && !seenUrls.has(url)) {
      seenUrls.add(url);
      urls.push(url);
    }

    textWithoutWrappedUrls = textWithoutWrappedUrls.replace(match[0], " ");
  }

  for (const match of textWithoutWrappedUrls.matchAll(plainUrlPattern)) {
    const url = cleanUrl(match[0]);

    if (isSupportedUrl(url) && !seenUrls.has(url)) {
      seenUrls.add(url);
      urls.push(url);
    }
  }

  return urls;
}

function removeUrlsFromSlackText(text: string) {
  return text
    .replace(slackWrappedUrlPattern, " ")
    .replace(plainUrlPattern, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategoryName(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

export function extractCategoryFromSlackText(text: string) {
  const textWithoutUrls = removeUrlsFromSlackText(text);
  const namedCategory = textWithoutUrls.match(namedCategoryPattern)?.[1];
  const bracketCategory = textWithoutUrls.match(bracketCategoryPattern)?.[1];
  const category = normalizeCategoryName(namedCategory ?? bracketCategory ?? "");

  return category || undefined;
}
