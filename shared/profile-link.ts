export const PROFILE_LINK_PROVIDERS = [
  "soundcloud",
  "spotify",
  "youtube",
  "instagram",
  "apple_music",
  "bandcamp",
  "tiktok",
  "x",
  "facebook",
  "website",
] as const;

export type ProfileLinkProvider = (typeof PROFILE_LINK_PROVIDERS)[number];

export type ParsedProfileLink =
  | {
      ok: true;
      provider: ProfileLinkProvider;
      normalizedUrl: string;
      host: string;
      handle: string | null;
    }
  | { ok: false; error: string };

const STRIP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "si",
  "ref",
]);

function matchesDomain(host: string, root: string): boolean {
  return host === root || host.endsWith(`.${root}`);
}

export function isBlockedHostname(host: string): boolean {
  const lower = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower === "::1" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd")
  ) {
    return true;
  }
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return true;
    }
  }
  return false;
}

export function classifyProfileHost(host: string): ProfileLinkProvider {
  const h = host.toLowerCase();
  if (matchesDomain(h, "soundcloud.com")) return "soundcloud";
  if (h === "open.spotify.com" || matchesDomain(h, "spotify.com")) return "spotify";
  if (matchesDomain(h, "youtube.com") || h === "youtu.be") return "youtube";
  if (matchesDomain(h, "instagram.com")) return "instagram";
  if (h === "music.apple.com") return "apple_music";
  if (matchesDomain(h, "bandcamp.com")) return "bandcamp";
  if (matchesDomain(h, "tiktok.com")) return "tiktok";
  if (h === "x.com" || matchesDomain(h, "twitter.com")) return "x";
  if (matchesDomain(h, "facebook.com") || h === "fb.com") return "facebook";
  return "website";
}

export function parseProfileLink(rawInput: unknown): ParsedProfileLink {
  if (typeof rawInput !== "string") {
    return { ok: false, error: "Lien de profil requis" };
  }
  const trimmed = rawInput.trim();
  if (!trimmed || trimmed.length > 1000) {
    return { ok: false, error: "Lien invalide" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Format d'URL invalide (https:// requis)" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Seuls les liens https:// sont acceptés" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Les identifiants dans l'URL sont refusés" };
  }
  if (parsed.port && parsed.port !== "443") {
    return { ok: false, error: "Port non standard refusé" };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.includes(".") || isBlockedHostname(host)) {
    return { ok: false, error: "Hôte non autorisé" };
  }

  const provider = classifyProfileHost(host);
  // Reject lookalike subdomains like soundcloud.com.evil.com (handled by matchesDomain above,
  // plus extra guard if someone passes a suspicious soundcloud-like domain).
  if (host.includes("soundcloud") && provider !== "soundcloud") {
    return { ok: false, error: "Domaine SoundCloud suspect refusé" };
  }

  const cleanParams = new URLSearchParams();
  parsed.searchParams.forEach((v, k) => {
    if (!STRIP_PARAMS.has(k.toLowerCase())) {
      cleanParams.set(k, v);
    }
  });
  parsed.search = cleanParams.toString() ? `?${cleanParams.toString()}` : "";
  parsed.hash = "";

  // Normalize trailing slash on path (keep "/" if root)
  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const handle = segments[0] ? decodeURIComponent(segments[0]) : null;

  return {
    ok: true,
    provider,
    normalizedUrl: parsed.toString(),
    host,
    handle,
  };
}
