/**
 * What the listening-session pages show, decided with no React in it: which view a session
 * is in, what the listener can do, how each tracklist row looks, what the chat panel offers,
 * and what a failed message means. The components only draw these answers.
 */
import {
  SESSION_STATUSES,
  type SessionChatMessage,
  type SessionStatus,
  type SessionSummary,
  type SessionTrackView,
} from "@shared/listening-session";
import type { SessionLang } from "./listening-session-format";
import type { LivePhase } from "./listening-session-live";
import {
  CHAT_KEEP,
  currentSlot,
  lastChatId,
  mergeChatMessages,
  upNextTrack,
  type PlaybackPlan,
} from "./listening-session-sync";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

// ─── the main view ───────────────────────────────────────────────────────

export type DetailView = "loading" | "notfound" | "error" | SessionStatus;

/** The load phase says whether there is a session at all; the status says which kind of page it is. */
export function detailView(input: { phase: LivePhase; status: SessionStatus | null }): DetailView {
  if (input.phase === "ready") return input.status ?? "loading";
  return input.phase;
}

/** "Reconnecting" only makes sense while the page still follows a session that has not finished. */
export const showsOfflineBanner = (view: DetailView, offline: boolean): boolean =>
  offline && (view === "scheduled" || view === "live");

export type StatusLabelKey = "pillLive" | "sectionUpcoming" | "pillEnded" | "pillCancelled";

const STATUS_LABEL_KEYS: Record<SessionStatus, StatusLabelKey> = {
  live: "pillLive",
  scheduled: "sectionUpcoming",
  ended: "pillEnded",
  cancelled: "pillCancelled",
};

/** The copy that names a status on a card or a page header. */
export const statusLabelKey = (status: SessionStatus): StatusLabelKey => STATUS_LABEL_KEYS[status];

export type CardActionKey = "cardJoin" | "cardDetails" | "cardReplay";

const CARD_ACTION_KEYS: Record<SessionStatus, CardActionKey> = {
  live: "cardJoin",
  scheduled: "cardDetails",
  ended: "cardReplay",
  cancelled: "cardDetails",
};

/** What a card on the list invites the visitor to do. */
export const cardActionKey = (status: SessionStatus): CardActionKey => CARD_ACTION_KEYS[status];

export type ListenMode =
  /** Nothing to listen to: the session is over, cancelled, or not loaded. */
  | "none"
  /** Live, not joined: the Join button. */
  | "join"
  /** Joined before the start: the sound begins by itself. */
  | "waiting"
  /** Joined, but the browser or the listener paused the sound: the tap button. */
  | "tap"
  /** Joined and hearing the session. */
  | "listening";

export function listenMode(input: { view: DetailView; joined: boolean; needsTap: boolean }): ListenMode {
  if (input.view === "live") {
    if (!input.joined) return "join";
    return input.needsTap ? "tap" : "listening";
  }
  if (input.view === "scheduled" && input.joined) return "waiting";
  return "none";
}

/** Seconds to the start while the session is still scheduled; null at any other time. */
export const countdownSec = (plan: PlaybackPlan): number | null =>
  plan.kind === "idle" && plan.reason === "scheduled" ? plan.startsInSec : null;

// ─── now playing and the tracklist ───────────────────────────────────────

export interface NowPlayingView {
  /** A track, a slot whose track is unpublished, a pause between tracks, or nothing. */
  kind: "track" | "unavailable" | "break" | "idle";
  /** The slot playing now (kinds "track" and "unavailable"). */
  track: SessionTrackView | null;
  /** 0 to 1 along the current slot. */
  progress: number;
  elapsedSec: number;
  /** The engine could not load this track even after its retries; the clock keeps going. */
  failed: boolean;
  next: SessionTrackView | null;
}

export function nowPlayingView(
  plan: PlaybackPlan,
  tracks: readonly SessionTrackView[],
  failedTrackId: number | null,
): NowPlayingView {
  const slot = currentSlot(plan, tracks);
  const next = upNextTrack(plan, tracks);
  if (slot && plan.kind === "play") {
    return {
      kind: "track",
      track: slot.track,
      progress: slot.progress,
      elapsedSec: plan.targetSec,
      failed: failedTrackId === plan.trackId,
      next,
    };
  }
  if (slot && plan.kind === "unavailable") {
    return {
      kind: "unavailable",
      track: slot.track,
      progress: slot.progress,
      elapsedSec: slot.track.durationSec - plan.remainingSec,
      failed: false,
      next,
    };
  }
  if (plan.kind === "gap") {
    return { kind: "break", track: null, progress: 0, elapsedSec: 0, failed: false, next };
  }
  return { kind: "idle", track: null, progress: 0, elapsedSec: 0, failed: false, next: null };
}

export type NowPlayingNote = "unavailable" | "break" | "breakThenNext" | "syncing";

/** The line shown beside or in place of a track title; null when a track is simply playing. */
export function nowPlayingNote(view: NowPlayingView): NowPlayingNote | null {
  switch (view.kind) {
    case "track":
      return view.failed ? "unavailable" : null;
    case "unavailable":
      return "unavailable";
    case "break":
      // A track that was unpublished has no title to announce.
      return view.next?.available ? "breakThenNext" : "break";
    case "idle":
      return "syncing";
  }
}

export interface TrackRowState {
  /** The slot playing now. */
  current: boolean;
  /** The slot announced as up next. */
  next: boolean;
  /** Already played in the live set. */
  past: boolean;
  /** Unpublished since the set was built: it keeps its slot but has no sound. */
  unavailable: boolean;
}

/** Only a live set marks rows as played, current or next; before and after it every row reads the same. */
export function trackRowStates(plan: PlaybackPlan, tracks: readonly SessionTrackView[]): TrackRowState[] {
  const slot = currentSlot(plan, tracks);
  const next = upNextTrack(plan, tracks);
  const currentIndex = slot ? slot.index : -1;
  const nextIndex = next ? tracks.indexOf(next) : -1;
  const playedBefore = slot ? slot.index : plan.kind === "gap" ? nextIndex : 0;
  return tracks.map((track, index) => ({
    current: index === currentIndex,
    next: index === nextIndex,
    past: index < playedBefore,
    unavailable: !track.available,
  }));
}

/** What the replay hands to the site's player: only tracks that can be heard, in set order. */
export interface ReplayTrack {
  id: number;
  title: string;
  duration: number;
  artist_name?: string;
}

export function replayTracks(tracks: readonly SessionTrackView[]): ReplayTrack[] {
  return tracks
    .filter((track) => track.available)
    .map((track) => ({
      id: track.trackId,
      title: track.title,
      duration: track.durationSec,
      ...(track.artistName ? { artist_name: track.artistName } : {}),
    }));
}

// ─── the chat panel ──────────────────────────────────────────────────────

export type AuthState = "signedIn" | "anonymous" | "checking";

export function authState(input: { signedIn: boolean; checking: boolean }): AuthState {
  if (input.signedIn) return "signedIn";
  return input.checking ? "checking" : "anonymous";
}

export interface ChatPanelState {
  visible: boolean;
  /** Messages are fetched in this state: once, or on a timer when `polls` is set too. */
  loads: boolean;
  polls: boolean;
  /** Under the messages: a message box, a sign-in prompt, a wait for the account check, or nothing. */
  composer: "compose" | "signIn" | "checking" | "none";
  /** The line that says why nobody can write. */
  note: "beforeStart" | "ended" | null;
}

const NO_PANEL: ChatPanelState = { visible: false, loads: false, polls: false, composer: "none", note: null };

export function chatPanelState(view: DetailView, auth: AuthState): ChatPanelState {
  switch (view) {
    case "scheduled":
      return { visible: true, loads: false, polls: false, composer: "none", note: "beforeStart" };
    case "live":
      return {
        visible: true,
        loads: true,
        polls: true,
        composer: auth === "signedIn" ? "compose" : auth === "anonymous" ? "signIn" : "checking",
        note: null,
      };
    case "ended":
      return { visible: true, loads: true, polls: false, composer: "none", note: "ended" };
    default:
      return NO_PANEL;
  }
}

export const CHAT_POLL_VISIBLE_MS = 4_000;
export const CHAT_POLL_HIDDEN_MS = 15_000;
export const CHAT_POLL_MAX_MS = 30_000;

/** Every failed poll in a row doubles the wait, up to 30 s; the first good one goes back to normal. */
export function chatPollDelayMs(input: { tabVisible: boolean; failures: number }): number {
  const base = input.tabVisible ? CHAT_POLL_VISIBLE_MS : CHAT_POLL_HIDDEN_MS;
  const failures = Number.isFinite(input.failures) ? Math.floor(input.failures) : 0;
  const steps = Math.min(Math.max(0, failures), 3);
  return Math.min(CHAT_POLL_MAX_MS, base * 2 ** steps);
}

// ─── the chat messages on screen ─────────────────────────────────────────

/** The same limit as `POST /api/community/posts`. */
export const CHAT_MAX_CHARS = 2000;
/** The first page and each page of earlier messages. */
export const CHAT_PAGE = 50;
/** A poll asks for the most the API allows, so a long gap is caught up in few requests. */
export const CHAT_POLL_LIMIT = 100;

export interface ChatRequest {
  afterId: number | null;
  beforeId: number | null;
  limit: number;
}

/** The next poll: what came after the newest message on screen, or the latest page when there is none yet. */
export function nextChatRequest(messages: readonly SessionChatMessage[]): ChatRequest {
  const newest = lastChatId(messages);
  return newest === null
    ? { afterId: null, beforeId: null, limit: CHAT_PAGE }
    : { afterId: newest, beforeId: null, limit: CHAT_POLL_LIMIT };
}

export function earlierChatRequest(messages: readonly SessionChatMessage[]): ChatRequest | null {
  return messages.length === 0 ? null : { afterId: null, beforeId: messages[0].id, limit: CHAT_PAGE };
}

export function chatUrl(sessionId: number, request: ChatRequest): string {
  const params = new URLSearchParams({ limit: String(request.limit) });
  if (request.afterId !== null) params.set("afterId", String(request.afterId));
  if (request.beforeId !== null) params.set("beforeId", String(request.beforeId));
  return `/api/listening-sessions/${sessionId}/chat?${params.toString()}`;
}

/** The messages of a chat answer, or null when the answer is not one. A malformed message is left out. */
export function parseChatMessages(body: unknown): SessionChatMessage[] | null {
  if (!isRecord(body) || !Array.isArray(body.messages)) return null;
  const messages: SessionChatMessage[] = [];
  for (const item of body.messages) {
    if (!isRecord(item)) continue;
    const { id, body: text, createdAt, author, isHost } = item;
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) continue;
    if (typeof text !== "string" || typeof author !== "string") continue;
    messages.push({
      id,
      body: text,
      createdAt: typeof createdAt === "string" ? createdAt : "",
      author,
      isHost: isHost === true,
    });
  }
  return messages;
}

export interface ChatState {
  messages: readonly SessionChatMessage[];
  /** Older messages than the first one on screen may exist. */
  earlier: boolean;
}

export const EMPTY_CHAT: ChatState = { messages: [], earlier: false };

/** Folds one answer into the chat. An answer with nothing new returns the same state, so nothing redraws. */
export function applyChatPage(
  state: ChatState,
  request: ChatRequest,
  incoming: readonly SessionChatMessage[],
): ChatState {
  if (request.beforeId !== null) {
    // Paging back is the reader's choice, so nothing they asked for is trimmed away.
    return {
      messages: mergeChatMessages(state.messages, incoming, Number.MAX_SAFE_INTEGER),
      earlier: incoming.length >= request.limit,
    };
  }
  if (incoming.length === 0) return state;
  if (request.afterId !== null) {
    const messages = mergeChatMessages(state.messages, incoming, Math.max(CHAT_KEEP, state.messages.length));
    const trimmed = state.messages.length > 0 && messages[0].id !== state.messages[0].id;
    return { messages, earlier: state.earlier || trimmed };
  }
  return {
    messages: mergeChatMessages(state.messages, incoming),
    earlier: incoming.length >= request.limit,
  };
}

/** The time of day a message was sent, in the reader's own time zone unless one is given. */
export function formatChatTime(iso: string, lang: SessionLang, timeZone?: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(ms);
}

// ─── writing a message ───────────────────────────────────────────────────

export type ChatDraft = { ok: true; content: string } | { ok: false; reason: "empty" | "tooLong" };

export function checkChatDraft(text: string): ChatDraft {
  const content = text.trim();
  if (content.length === 0) return { ok: false, reason: "empty" };
  if (content.length > CHAT_MAX_CHARS) return { ok: false, reason: "tooLong" };
  return { ok: true, content };
}

export type ChatPostFailure = "slowMode" | "signIn" | "failed";

/**
 * Why `POST /api/community/posts` refused. The slow-mode answer carries `slowMode: true`, a
 * general rate limit is a 429, and a lost login is a 401; the `error` field is a string from
 * the community route and an object from the auth middleware, so it is not read here.
 */
export function classifyChatPostFailure(status: number, body: unknown): ChatPostFailure {
  if (status === 429 || (isRecord(body) && body.slowMode === true)) return "slowMode";
  if (status === 401) return "signIn";
  return "failed";
}

/** A refused login in the middle of a conversation turns the message box back into the sign-in prompt. */
export const composerFor = (
  panel: ChatPanelState,
  lastFailure: ChatPostFailure | null,
): ChatPanelState["composer"] =>
  panel.composer === "compose" && lastFailure === "signIn" ? "signIn" : panel.composer;

export type ComposerNotice = "tooLong" | "slowMode" | "failed";

/** The line under the message box: a draft that cannot be sent comes first, then why the last send was refused. */
export function composerNotice(draft: ChatDraft, lastFailure: ChatPostFailure | null): ComposerNotice | null {
  if (!draft.ok && draft.reason === "tooLong") return "tooLong";
  return lastFailure === "slowMode" || lastFailure === "failed" ? lastFailure : null;
}

export const SIGN_IN_PATH = "/auth/signin";

/** The sign-in page, told to come back to this page afterwards. */
export const signInPath = (returnTo: string): string =>
  `${SIGN_IN_PATH}?redirect=${encodeURIComponent(returnTo)}`;

// ─── the list page ───────────────────────────────────────────────────────

export interface SessionListData {
  serverTime: string;
  sessions: SessionSummary[];
}

function parseSummary(value: unknown): SessionSummary | null {
  if (!isRecord(value)) return null;
  const { id, title, startsAt, endsAt, status } = value;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return null;
  if (typeof startsAt !== "string" || typeof endsAt !== "string") return null;
  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  if (typeof status !== "string" || !(SESSION_STATUSES as readonly string[]).includes(status)) return null;
  return {
    id,
    title: typeof title === "string" ? title : "",
    description: textOrNull(value.description),
    hostName: textOrNull(value.hostName),
    startsAt,
    endsAt,
    status: status as SessionStatus,
    gapSeconds: finiteOr(value.gapSeconds, 0),
    trackCount: finiteOr(value.trackCount, 0),
    totalDurationSec: finiteOr(value.totalDurationSec, 0),
  };
}

/**
 * A list answer, or null when it is not one. A session with a missing id or an impossible time is
 * left out rather than failing the whole list: grouping works out the status from those times.
 */
export function parseSessionList(body: unknown): SessionListData | null {
  if (!isRecord(body) || typeof body.serverTime !== "string" || !Array.isArray(body.sessions)) return null;
  const sessions: SessionSummary[] = [];
  for (const item of body.sessions) {
    const session = parseSummary(item);
    if (session) sessions.push(session);
  }
  return { serverTime: body.serverTime, sessions };
}
