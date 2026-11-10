// Rules the VersaVids API enforces and the studio page relies on. Kept in one
// place so what the page offers and what the server accepts cannot drift apart.

// A project takes deliveries from the moment an artist has it until it is
// approved or cancelled. "review" stays open so a wrong link can be replaced.
export const DELIVERY_ACCEPTING_STATUSES: readonly string[] = [
  "claimed",
  "in_progress",
  "review",
  "revision",
];

export const DELIVERY_URL_MAX = 2000;

/**
 * A delivery is a link to the finished video (Vimeo, Drive, Dropbox...). Only
 * plain http(s) links are kept, because the client clicks them. Over-long
 * values are refused rather than cut, since a cut link points nowhere.
 */
export function parseDeliveryUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > DELIVERY_URL_MAX) return null;
  try {
    const url = new URL(text);
    const isWeb = url.protocol === "http:" || url.protocol === "https:";
    // "https://trusted.com@evil.com" reads like trusted.com but opens evil.com.
    return isWeb && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}
