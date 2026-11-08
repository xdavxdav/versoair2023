/**
 * Typed calls to the admin listening-sessions API. Requests go through the shared
 * `loadJson` / `submitJson` helpers, so the auth cookie and the CSRF header work exactly as in
 * the other GeoAdmin sections. A failure is thrown as an `AdminApiError` whose message is safe
 * to show as it is.
 */
import type {
  AdminHostOption,
  AdminPlaylistOption,
  AdminSessionDetail,
  AdminSessionSummary,
  AdminTrackOption,
} from "@shared/listening-session";
import { authenticatedFetch } from "./auth";
import type { CreatePayload, UpdatePayload } from "./listening-session-admin";
import { loadJson, submitJson, type SubmitFailure, type SubmitResult } from "./submit-json";

export const ADMIN_API_BASE = "/api/listening-sessions/admin";

/** The server answers `[]` for a host search shorter than this, so no request is made. */
export const HOST_SEARCH_MIN_CHARS = 2;
export const SEARCH_TERM_MAX_CHARS = 100;
export const TRACK_SEARCH_LIMIT = 30;

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export const adminKeys = {
  all: ["listening-sessions-admin"] as const,
  status: ["listening-sessions-admin", "status"] as const,
  list: ["listening-sessions-admin", "list"] as const,
  detail: (id: number) => ["listening-sessions-admin", "detail", id] as const,
};

export class AdminApiError extends Error {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;
  readonly code: string | null;

  constructor(failure: Pick<SubmitFailure, "status" | "code" | "message">) {
    super(failure.message);
    this.name = "AdminApiError";
    this.status = failure.status;
    this.code = failure.code;
  }
}

const INVALID_RESPONSE_MESSAGE = "The server sent an answer this page cannot read. Try again.";

const invalidResponse = (): AdminApiError =>
  new AdminApiError({ status: 200, code: "INVALID_RESPONSE", message: INVALID_RESPONSE_MESSAGE });

/** Not signed in, or signed in without the right to manage sessions. */
export const isAccessError = (error: unknown): boolean =>
  error instanceof AdminApiError && (error.status === 401 || error.status === 403);

/** What to show for a failed call: the server's own wording, or the fallback for anything unexpected. */
export const adminErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof AdminApiError && error.message ? error.message : fallback;

/** The text sent as `q`: trimmed and short enough for the server's limit. */
export const searchTerm = (value: string): string => value.trim().slice(0, SEARCH_TERM_MAX_CHARS);

export function searchPath(resource: "tracks" | "hosts" | "playlists", q: string): string {
  const params = new URLSearchParams({ q: searchTerm(q) });
  if (resource === "tracks") params.set("limit", String(TRACK_SEARCH_LIMIT));
  return `${ADMIN_API_BASE}/${resource}?${params.toString()}`;
}

// ─── readiness ───────────────────────────────────────────────────────────

interface StatusBody {
  enabled?: unknown;
  schemaReady?: unknown;
  serverTime?: unknown;
}

export type AdminReadiness =
  | { state: "ready" }
  /** The kill switch is on: every sessions route answers 404. */
  | { state: "off" }
  /** The sessions table could not be prepared: the routes answer 503. */
  | { state: "not_ready" }
  | { state: "access"; message: string }
  | { state: "error"; message: string };

/**
 * The status route only answers with a body when everything is fine; a switched-off or
 * unprepared server answers with an HTTP error instead, so both are read here.
 */
export function readinessFromStatus(result: SubmitResult<StatusBody>): AdminReadiness {
  if (result.ok) {
    const { enabled, schemaReady } = result.data;
    if (enabled === false) return { state: "off" };
    if (schemaReady === false) return { state: "not_ready" };
    if (enabled === true && schemaReady === true) return { state: "ready" };
    return { state: "error", message: INVALID_RESPONSE_MESSAGE };
  }
  if (result.status === 404) return { state: "off" };
  if (result.status === 503) return { state: "not_ready" };
  if (result.status === 401 || result.status === 403) return { state: "access", message: result.message };
  return { state: "error", message: result.message };
}

const CLOCK_SKEW_NOTICE_FROM_MS = 60_000;

/** A warning when the device clock is a minute or more away from the server's, otherwise null. */
export function clockSkewNotice(serverTimeIso: string | null | undefined, deviceNowMs: number): string | null {
  const serverMs = Date.parse(serverTimeIso ?? "");
  if (!Number.isFinite(serverMs)) return null;
  const skewMs = deviceNowMs - serverMs;
  if (Math.abs(skewMs) < CLOCK_SKEW_NOTICE_FROM_MS) return null;
  const minutes = Math.round(Math.abs(skewMs) / 60_000);
  return `This device's clock is about ${minutes} min ${skewMs > 0 ? "ahead of" : "behind"} the server. The "start in N minutes" buttons use the device clock, so they can be off by that much.`;
}

// ─── the calls ───────────────────────────────────────────────────────────

export interface AdminSessionList {
  sessions: AdminSessionSummary[];
  /** The server's clock when the list was read; null if it was missing. */
  serverTime: string | null;
}

export interface CancelResult {
  id: number;
  alreadyCancelled: boolean;
}

export function createAdminApi(options: { fetcher?: Fetcher } = {}) {
  const base: Fetcher = options.fetcher ?? authenticatedFetch;
  const withSignal =
    (signal?: AbortSignal): Fetcher =>
    (url, init) =>
      base(url, signal ? { ...init, signal } : init);

  function unwrap<T>(result: SubmitResult<T>, signal?: AbortSignal): T {
    if (result.ok) return result.data;
    // A cancelled request is not a failure worth reporting; the caller already moved on.
    if (signal?.aborted) throw new DOMException("The request was cancelled.", "AbortError");
    throw new AdminApiError(result);
  }

  async function read<T>(path: string, fallbackMessage: string, signal?: AbortSignal): Promise<T> {
    const result = await loadJson<T>(path, { lang: "en", fallbackMessage, fetcher: withSignal(signal) });
    return unwrap(result, signal);
  }

  async function write<T>(
    path: string,
    method: "POST" | "PATCH",
    body: unknown,
    fallbackMessage: string,
  ): Promise<T> {
    return unwrap(await submitJson<T>(path, { method, body, lang: "en", fallbackMessage, fetcher: base }));
  }

  const readSession = (body: { session?: AdminSessionDetail }): AdminSessionDetail => {
    const { session } = body;
    if (!session || typeof session.id !== "number" || !Array.isArray(session.tracks)) throw invalidResponse();
    return session;
  };

  return {
    async fetchReadiness(signal?: AbortSignal): Promise<AdminReadiness> {
      const result = await loadJson<StatusBody>(`${ADMIN_API_BASE}/status`, {
        lang: "en",
        fallbackMessage: "Could not check whether listening sessions are ready.",
        fetcher: withSignal(signal),
      });
      return readinessFromStatus(result);
    },

    async listSessions(signal?: AbortSignal): Promise<AdminSessionList> {
      const body = await read<{ sessions?: AdminSessionSummary[]; serverTime?: unknown }>(
        `${ADMIN_API_BASE}/list`,
        "Could not load the sessions.",
        signal,
      );
      if (!Array.isArray(body.sessions)) throw invalidResponse();
      return {
        sessions: body.sessions,
        serverTime: typeof body.serverTime === "string" ? body.serverTime : null,
      };
    },

    async getSession(id: number, signal?: AbortSignal): Promise<AdminSessionDetail> {
      return readSession(
        await read<{ session?: AdminSessionDetail }>(
          `${ADMIN_API_BASE}/${id}`,
          "Could not load this session.",
          signal,
        ),
      );
    },

    async searchTracks(q: string, signal?: AbortSignal): Promise<AdminTrackOption[]> {
      const body = await read<{ tracks?: AdminTrackOption[] }>(
        searchPath("tracks", q),
        "Could not search the tracks.",
        signal,
      );
      if (!Array.isArray(body.tracks)) throw invalidResponse();
      return body.tracks;
    },

    async searchHosts(q: string, signal?: AbortSignal): Promise<AdminHostOption[]> {
      if (searchTerm(q).length < HOST_SEARCH_MIN_CHARS) return [];
      const body = await read<{ hosts?: AdminHostOption[] }>(
        searchPath("hosts", q),
        "Could not search the hosts.",
        signal,
      );
      if (!Array.isArray(body.hosts)) throw invalidResponse();
      return body.hosts;
    },

    async searchPlaylists(q: string, signal?: AbortSignal): Promise<AdminPlaylistOption[]> {
      const body = await read<{ playlists?: AdminPlaylistOption[] }>(
        searchPath("playlists", q),
        "Could not search the playlists.",
        signal,
      );
      if (!Array.isArray(body.playlists)) throw invalidResponse();
      return body.playlists;
    },

    async playlistTracks(playlistId: number, signal?: AbortSignal): Promise<AdminTrackOption[]> {
      const body = await read<{ tracks?: AdminTrackOption[] }>(
        `${ADMIN_API_BASE}/playlists/${playlistId}/tracks`,
        "Could not load the playlist.",
        signal,
      );
      if (!Array.isArray(body.tracks)) throw invalidResponse();
      return body.tracks;
    },

    async createSession(payload: CreatePayload): Promise<AdminSessionDetail> {
      return readSession(
        await write<{ session?: AdminSessionDetail }>(
          ADMIN_API_BASE,
          "POST",
          payload,
          "Could not create the session.",
        ),
      );
    },

    async updateSession(id: number, payload: UpdatePayload): Promise<AdminSessionDetail> {
      return readSession(
        await write<{ session?: AdminSessionDetail }>(
          `${ADMIN_API_BASE}/${id}`,
          "PATCH",
          payload,
          "Could not save the changes.",
        ),
      );
    },

    async cancelSession(id: number): Promise<CancelResult> {
      const body = await write<{ alreadyCancelled?: unknown }>(
        `${ADMIN_API_BASE}/${id}/cancel`,
        "POST",
        undefined,
        "Could not cancel the session.",
      );
      return { id, alreadyCancelled: body.alreadyCancelled === true };
    },
  };
}

export type AdminApi = ReturnType<typeof createAdminApi>;

export const adminApi: AdminApi = createAdminApi();
