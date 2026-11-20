import {
  isBlockedHostname,
  parseProfileLink,
  type ProfileLinkProvider,
} from "@shared/profile-link";

export interface ImportedTrackPreview {
  externalTrackId: string | null;
  title: string;
  description: string | null;
  genre: string | null;
  durationSec: number | null;
  artworkUrl: string | null;
  externalUrl: string | null;
  license: string | null;
  externalCreatedAt: string | null;
  externalStats?: {
    playbackCount?: number;
    likesCount?: number;
  };
}

export interface ProfileSnapshot {
  provider: ProfileLinkProvider;
  normalizedUrl: string;
  sourceTier: "hydration" | "oembed" | "opengraph" | "link_only";
  externalId: string | null;
  displayName: string | null;
  username: string | null;
  bio: string | null;
  city: string | null;
  countryCode: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  externalStats: {
    followersCount?: number;
    followingsCount?: number;
    trackCount?: number;
  };
  tracks: ImportedTrackPreview[];
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5_000;

const ALLOWED_HYDRATION_HOSTS = new Set([
  "soundcloud.com",
  "www.soundcloud.com",
  "m.soundcloud.com",
]);

function decodeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

export function extractSoundCloudHydration(html: string): any[] | null {
  const marker = "window.__sc_hydration";
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const eqIdx = html.indexOf("=", idx);
  if (eqIdx === -1) return null;
  const startBracket = html.indexOf("[", eqIdx);
  if (startBracket === -1) return null;

  // Walk balanced brackets safely to avoid regex backtracking on large HTML
  let depth = 0;
  let inStr = false;
  let escaped = false;
  let endBracket = -1;
  for (let i = startBracket; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
    } else if (ch === "[") {
      depth++;
    } else if (ch === "]") {
      depth--;
      if (depth === 0) {
        endBracket = i;
        break;
      }
    }
  }
  if (endBracket === -1) return null;
  try {
    const parsed = JSON.parse(html.slice(startBracket, endBracket + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function extractOpenGraph(html: string): {
  title: string | null;
  description: string | null;
  image: string | null;
} {
  const findMeta = (prop: string): string | null => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
      "i",
    );
    const m = re.exec(html);
    const val = m?.[1] || m?.[2];
    return val ? decodeEntities(val) : null;
  };
  const titleTag = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1];
  return {
    title: findMeta("og:title") || (titleTag ? decodeEntities(titleTag) : null),
    description: findMeta("og:description") || findMeta("description"),
    image: findMeta("og:image"),
  };
}

export function extractSoundCloudTrackUrls(
  html: string,
  profileUrl: string,
): string[] {
  const origin = "https://soundcloud.com";
  let profilePath = "";
  try {
    profilePath = new URL(profileUrl).pathname.replace(/\/+$/, "");
  } catch {
    return [];
  }
  if (!profilePath || profilePath === "/") return [];

  const escaped = profilePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `href=["'](${escaped}/[a-zA-Z0-9._-]+)["']`,
    "g",
  );
  const found = new Set<string>();
  const reserved = new Set([
    "tracks",
    "albums",
    "sets",
    "reposts",
    "likes",
    "followers",
    "following",
    "comments",
    "popular-tracks",
  ]);

  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const rel = m[1];
    const slug = rel.slice(profilePath.length + 1);
    if (!slug || reserved.has(slug.toLowerCase())) continue;
    found.add(`${origin}${rel}`);
    if (found.size >= 10) break;
  }
  return Array.from(found);
}

async function safeFetchText(
  urlStr: string,
  fetchImpl: FetchLike,
): Promise<string | null> {
  let target: URL;
  try {
    target = new URL(urlStr);
  } catch {
    return null;
  }
  if (target.protocol !== "https:" || isBlockedHostname(target.hostname)) {
    return null;
  }

  const res = await fetchImpl(target.toString(), {
    method: "GET",
    redirect: "manual",
    credentials: "omit",
    headers: {
      "User-Agent": "VersoAirProfileImporter/1.0 (+https://versoair.com)",
      Accept: "text/html,application/json;q=0.9,*/*;q=0.5",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (res.status >= 300 && res.status < 400) {
    // Allow single same-host canonical redirect only; reject cross-host redirects
    const loc = res.headers.get("location");
    if (!loc) return null;
    try {
      const nextUrl = new URL(loc, target);
      if (
        nextUrl.protocol !== "https:" ||
        nextUrl.hostname.toLowerCase() !== target.hostname.toLowerCase()
      ) {
        return null;
      }
      const redirected = await fetchImpl(nextUrl.toString(), {
        method: "GET",
        redirect: "manual",
        credentials: "omit",
        headers: {
          "User-Agent": "VersoAirProfileImporter/1.0 (+https://versoair.com)",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!redirected.ok) return null;
      const txt = await redirected.text();
      return txt.slice(0, MAX_HTML_BYTES);
    } catch {
      return null;
    }
  }

  if (!res.ok) return null;
  const text = await res.text();
  return text.slice(0, MAX_HTML_BYTES);
}

function mapSoundDataToTrack(sound: any): ImportedTrackPreview | null {
  if (!sound || typeof sound !== "object" || !sound.title) return null;
  const durationMs = Number(sound.duration ?? sound.full_duration ?? 0);
  const artwork =
    typeof sound.artwork_url === "string"
      ? sound.artwork_url.replace("-large.", "-t500x500.")
      : null;
  return {
    externalTrackId: sound.id ? String(sound.id) : null,
    title: String(sound.title).slice(0, 255),
    description:
      typeof sound.description === "string" && sound.description.trim()
        ? sound.description.trim().slice(0, 2000)
        : null,
    genre:
      typeof sound.genre === "string" && sound.genre.trim()
        ? sound.genre.trim().slice(0, 100)
        : null,
    durationSec:
      Number.isFinite(durationMs) && durationMs > 0
        ? Math.round(durationMs / 1000)
        : null,
    artworkUrl: artwork,
    externalUrl:
      typeof sound.permalink_url === "string" ? sound.permalink_url : null,
    license: typeof sound.license === "string" ? sound.license : null,
    externalCreatedAt:
      typeof sound.created_at === "string" ? sound.created_at : null,
    externalStats: {
      playbackCount: Number.isFinite(Number(sound.playback_count))
        ? Number(sound.playback_count)
        : undefined,
      likesCount: Number.isFinite(Number(sound.likes_count))
        ? Number(sound.likes_count)
        : undefined,
    },
  };
}

export async function fetchProfileSnapshot(
  rawUrl: string,
  fetchImpl: FetchLike = fetch,
): Promise<ProfileSnapshot | null> {
  const parsed = parseProfileLink(rawUrl);
  if (!parsed.ok) return null;

  const baseSnapshot: ProfileSnapshot = {
    provider: parsed.provider,
    normalizedUrl: parsed.normalizedUrl,
    sourceTier: "link_only",
    externalId: null,
    displayName: parsed.handle,
    username: parsed.handle,
    bio: null,
    city: null,
    countryCode: null,
    avatarUrl: null,
    bannerUrl: null,
    externalStats: {},
    tracks: [],
  };

  try {
    if (
      parsed.provider === "soundcloud" &&
      ALLOWED_HYDRATION_HOSTS.has(parsed.host)
    ) {
      const html = await safeFetchText(parsed.normalizedUrl, fetchImpl);
      if (html) {
        const hydration = extractSoundCloudHydration(html);
        const userEntry = hydration?.find((h) => h?.hydratable === "user")?.data;
        if (userEntry) {
          const avatarUrl =
            typeof userEntry.avatar_url === "string"
              ? userEntry.avatar_url
              : null;
          const bannerUrl =
            typeof userEntry.visuals?.visuals?.[0]?.visual_url === "string"
              ? userEntry.visuals.visuals[0].visual_url
              : null;

          const directSounds = (hydration || [])
            .filter((h) => h?.hydratable === "sound" && h?.data)
            .map((h) => mapSoundDataToTrack(h.data))
            .filter((t): t is ImportedTrackPreview => t !== null);

          let tracks = directSounds;
          if (tracks.length === 0) {
            const trackUrls = extractSoundCloudTrackUrls(
              html,
              parsed.normalizedUrl,
            );
            const fetchedTracks: ImportedTrackPreview[] = [];
            for (const trackUrl of trackUrls) {
              try {
                const trackHtml = await safeFetchText(trackUrl, fetchImpl);
                if (!trackHtml) continue;
                const trackHydration = extractSoundCloudHydration(trackHtml);
                const sound = trackHydration?.find(
                  (h) => h?.hydratable === "sound",
                )?.data;
                const mapped = mapSoundDataToTrack(sound);
                if (mapped) fetchedTracks.push(mapped);
              } catch {
                // Skip failed individual track page cleanly
              }
            }
            tracks = fetchedTracks;
          }

          return {
            provider: "soundcloud",
            normalizedUrl: parsed.normalizedUrl,
            sourceTier: "hydration",
            externalId: userEntry.id ? String(userEntry.id) : null,
            displayName:
              (typeof userEntry.full_name === "string" &&
                userEntry.full_name.trim()) ||
              (typeof userEntry.username === "string" &&
                userEntry.username.trim()) ||
              parsed.handle,
            username:
              typeof userEntry.username === "string"
                ? userEntry.username.trim()
                : parsed.handle,
            bio:
              typeof userEntry.description === "string" &&
              userEntry.description.trim()
                ? userEntry.description.trim()
                : null,
            city:
              typeof userEntry.city === "string" && userEntry.city.trim()
                ? userEntry.city.trim()
                : null,
            countryCode:
              typeof userEntry.country_code === "string" &&
              userEntry.country_code.trim()
                ? userEntry.country_code.trim()
                : null,
            avatarUrl,
            bannerUrl,
            externalStats: {
              followersCount: Number.isFinite(Number(userEntry.followers_count))
                ? Number(userEntry.followers_count)
                : undefined,
              followingsCount: Number.isFinite(
                Number(userEntry.followings_count),
              )
                ? Number(userEntry.followings_count)
                : undefined,
              trackCount: Number.isFinite(Number(userEntry.track_count))
                ? Number(userEntry.track_count)
                : undefined,
            },
            tracks,
          };
        }
      }

      // SoundCloud oEmbed fallback
      const oembedText = await safeFetchText(
        `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(parsed.normalizedUrl)}`,
        fetchImpl,
      );
      if (oembedText) {
        try {
          const oe = JSON.parse(oembedText);
          return {
            ...baseSnapshot,
            sourceTier: "oembed",
            displayName:
              typeof oe.author_name === "string"
                ? oe.author_name
                : typeof oe.title === "string"
                  ? oe.title
                  : baseSnapshot.displayName,
            bio: typeof oe.description === "string" ? oe.description : null,
            avatarUrl:
              typeof oe.thumbnail_url === "string" ? oe.thumbnail_url : null,
          };
        } catch {
          // Fall through to link-only
        }
      }
      return baseSnapshot;
    }

    // Generic Open Graph fallback for Spotify / YouTube / Instagram / Bandcamp / Website
    const html = await safeFetchText(parsed.normalizedUrl, fetchImpl);
    if (html) {
      const og = extractOpenGraph(html);
      if (og.title || og.description || og.image) {
        return {
          ...baseSnapshot,
          sourceTier: "opengraph",
          displayName: og.title || baseSnapshot.displayName,
          bio: og.description,
          avatarUrl: og.image,
        };
      }
    }
    return baseSnapshot;
  } catch {
    return baseSnapshot;
  }
}
