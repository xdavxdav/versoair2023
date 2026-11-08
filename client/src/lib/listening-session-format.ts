/**
 * Formatting and list helpers for the listening-session pages. Pure: the caller
 * passes the corrected server time instead of this module reading the clock.
 */
import {
  deriveStatus,
  type SessionStatus,
  type SessionSummary,
} from "@shared/listening-session";

export type SessionLang = "fr" | "en";

/** Anything that is not French falls back to English, like the rest of the site. */
export function sessionLang(value: string | null | undefined): SessionLang {
  return value === "fr" ? "fr" : "en";
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

const wholeSeconds = (value: number): number =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

/** A track length: 3:05, or 1:02:03 past an hour. */
export function formatDuration(totalSec: number): string {
  const total = wholeSeconds(totalSec);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${minutes}:${pad2(seconds)}`;
}

/** Time until the start: 12:05, 3:12:05, or "2d 3h" once it is a day or more away. */
export function formatCountdown(totalSec: number, lang: SessionLang): string {
  const total = wholeSeconds(totalSec);
  if (total >= 86_400) {
    const days = Math.floor(total / 86_400);
    const hours = Math.floor((total % 86_400) / 3600);
    return lang === "fr" ? `${days} j ${hours} h` : `${days}d ${hours}h`;
  }
  return formatDuration(total);
}

/** The length of a whole set: 45 s, 12 min, 1 h 30 min. The units read the same in both languages. */
export function formatTotalLength(totalSec: number): string {
  const total = wholeSeconds(totalSec);
  if (total < 60) return `${total} s`;
  const minutesTotal = Math.round(total / 60);
  if (minutesTotal < 60) return `${minutesTotal} min`;
  const hours = Math.floor(minutesTotal / 60);
  const minutes = minutesTotal % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${pad2(minutes)} min`;
}

/**
 * When a session starts, in the reader's own time zone unless one is given. The year
 * is left out when it is the current one; without `nowMs` it is always shown.
 */
export function formatSessionWhen(
  iso: string,
  lang: SessionLang,
  options: { timeZone?: string; nowMs?: number } = {},
): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const { timeZone } = options;
  const yearOf = (value: number) =>
    new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(value);
  const showYear = options.nowMs === undefined || yearOf(ms) !== yearOf(options.nowMs);
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(showYear ? { year: "numeric" as const } : {}),
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(ms);
}

/** The status right now from the corrected server clock, not the moment the list was fetched. */
export function liveStatus(
  session: Pick<SessionSummary, "status" | "startsAt" | "endsAt">,
  serverNowMs: number,
): SessionStatus {
  return deriveStatus({
    storedStatus: session.status === "cancelled" ? "cancelled" : null,
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    now: serverNowMs,
  });
}

export interface SessionGroups {
  live: SessionSummary[];
  upcoming: SessionSummary[];
  replays: SessionSummary[];
}

/** Live and upcoming sessions soonest first, replays newest first; cancelled ones are not listed. */
export function groupSessions(
  sessions: readonly SessionSummary[],
  serverNowMs: number,
): SessionGroups {
  const groups: SessionGroups = { live: [], upcoming: [], replays: [] };
  for (const session of sessions) {
    const status = liveStatus(session, serverNowMs);
    if (status === "live") groups.live.push(session);
    else if (status === "scheduled") groups.upcoming.push(session);
    else if (status === "ended") groups.replays.push(session);
  }
  const byStart = (a: SessionSummary, b: SessionSummary) =>
    Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id - b.id;
  const byEndDesc = (a: SessionSummary, b: SessionSummary) =>
    Date.parse(b.endsAt) - Date.parse(a.endsAt) || b.id - a.id;
  groups.live.sort(byStart);
  groups.upcoming.sort(byStart);
  groups.replays.sort(byEndDesc);
  return groups;
}

/** A route parameter as a session id, or null when it is not a plain positive integer. */
export function parseSessionId(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return id <= 2_147_483_647 ? id : null;
}

export const SESSIONS_PATH = "/sessions";

export const sessionPath = (id: number): string => `${SESSIONS_PATH}/${id}`;
