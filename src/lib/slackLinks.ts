const slackWrappedUrlPattern = /<(https?:\/\/[^>|]+)(?:\|[^>]*)?>/gi;
const plainUrlPattern = /https?:\/\/[^\s<>"']+/gi;

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
