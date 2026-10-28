import { MUSIC_ROUTE_PREFIXES } from "./music-routes";

export const REPORT_NUDGE_SESSION_KEY = "verso-report-nudge-shown";
export const REPORT_NUDGE_DELAY_MS = 4_000;
export const REPORT_NUDGE_RETRY_MS = 3_000;
export const REPORT_NUDGE_MAX_ATTEMPTS = 5;

// Focused pages where an unprompted reminder would interrupt the visitor:
// sign-in, admin tools, portals, messaging and the immersive workspaces.
// Mirrors the page flags in App.tsx.
const QUIET_PREFIXES = [
  "/auth",
  "/signup",
  "/admin",
  "/geo-admin",
  "/geo-insights",
  "/sys",
  "/dashboard",
  "/apply",
  "/profile",
  "/messages",
  "/user",
  "/inventory",
  ...MUSIC_ROUTE_PREFIXES,
] as const;

export function isReportNudgeQuietPath(path: string): boolean {
  const normalized =
    path.split(/[?#]/)[0].replace(/\/+$/, "").toLowerCase() || "/";
  if (normalized.includes("portal")) return true;
  return QUIET_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

// The home page shows the cookie banner until the visitor chooses; the
// reminder waits for that choice so the two never compete for the same corner.
export function isCookieBannerPending(
  path: string,
  consent: "accepted" | "declined" | null,
): boolean {
  return (path.replace(/\/+$/, "") || "/") === "/" && consent === null;
}
