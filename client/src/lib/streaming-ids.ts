// Some streaming endpoints answer an object that holds the id list under one key:
//   GET /api/streaming/user/following     -> { following: [artistId, ...] }
//   GET /api/streaming/user/liked-tracks  -> { likedTrackIds: [trackId, ...] }
// Pages ask "is this id in the list?", so anything that is not a list of whole numbers
// means "none" instead of crashing the page that reads it.
function idsAt(body: unknown, key: string): number[] {
  const list = (body as Record<string, unknown> | null | undefined)?.[key];
  if (!Array.isArray(list)) return [];
  const ids: number[] = [];
  for (const entry of list) {
    const id =
      typeof entry === "number"
        ? entry
        : typeof entry === "string" && /^\d+$/.test(entry)
          ? Number(entry)
          : Number.NaN;
    if (Number.isInteger(id)) ids.push(id);
  }
  return ids;
}

export const followedArtistIds = (body: unknown): number[] => idsAt(body, "following");

export const likedTrackIds = (body: unknown): number[] => idsAt(body, "likedTrackIds");
