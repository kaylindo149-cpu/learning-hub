export const facebookSavedLinkSummary =
  "Saved Facebook link. Open it in your browser to view the content with your Facebook session.";

function normalizeHttpUrl(url: string) {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(url) ? url : `https://${url}`;
}

export function isFacebookUrl(url: string) {
  try {
    const hostname = new URL(normalizeHttpUrl(url)).hostname
      .replace(/^www\./, "")
      .toLowerCase();

    return (
      hostname === "facebook.com" ||
      hostname.endsWith(".facebook.com") ||
      hostname === "fb.watch" ||
      hostname === "fb.com"
    );
  } catch {
    return false;
  }
}

export function getFacebookLinkTitle(url: string) {
  try {
    const parsedUrl = new URL(normalizeHttpUrl(url));
    const hostname = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();

    if (pathname.includes("/reel/") || pathname.includes("/reels/")) {
      return "Facebook reel";
    }

    if (pathname.includes("/watch/") || hostname === "fb.watch") {
      return "Facebook video";
    }

    if (pathname.includes("/photo") || pathname.includes("/photos/")) {
      return "Facebook photo";
    }

    if (
      pathname.includes("/posts/") ||
      pathname.includes("/permalink") ||
      pathname.includes("/story.php") ||
      pathname.includes("/share/")
    ) {
      return "Facebook post";
    }

    if (pathname.includes("/groups/")) {
      return "Facebook group link";
    }
  } catch {
    // Fall back to a generic Facebook label below.
  }

  return "Facebook link";
}

export function getFacebookTags(url: string) {
  return [
    "facebook",
    getFacebookLinkTitle(url).replace(/^facebook\s+/i, ""),
    "saved link"
  ]
    .filter(Boolean)
    .slice(0, 4);
}
