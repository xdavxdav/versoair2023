import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_API_BASE,
  AdminApiError,
  HOST_SEARCH_MIN_CHARS,
  SEARCH_TERM_MAX_CHARS,
  adminErrorMessage,
  clockSkewNotice,
  createAdminApi,
  isAccessError,
  readinessFromStatus,
  searchPath,
  searchTerm,
} from "./listening-session-admin-api";

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetcher(...responses: Array<Response | Error>) {
  const calls: Call[] = [];
  const queue = [...responses];
  const fetcher = async (url: string, init: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    const next = queue.shift();
    if (!next) throw new Error(`unexpected request to ${url}`);
    if (next instanceof Error) throw next;
    return next;
  };
  return { fetcher, calls };
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const failureBody = (code: string, message: string) => ({ success: false, error: { code, message } });

const queryOf = (url: string) => new URL(url, "http://localhost").searchParams;

test("a search term is trimmed and kept within the server limit", () => {
  assert.equal(searchTerm("  hello  "), "hello");
  assert.equal(searchTerm("x".repeat(250)).length, SEARCH_TERM_MAX_CHARS);
});

test("a search path encodes the term and only asks tracks for a limit", () => {
  const tracks = searchPath("tracks", " Ça va & co ");
  assert.ok(tracks.startsWith(`${ADMIN_API_BASE}/tracks?`));
  assert.equal(queryOf(tracks).get("q"), "Ça va & co");
  assert.equal(queryOf(tracks).get("limit"), "30");

  const hosts = searchPath("hosts", "ab");
  assert.equal(queryOf(hosts).get("q"), "ab");
  assert.equal(queryOf(hosts).has("limit"), false);
});

test("listing reads the sessions and the server clock with a plain GET", async () => {
  const session = { id: 3, title: "Friday", status: "scheduled" };
  const { fetcher, calls } = fakeFetcher(
    json(200, { success: true, serverTime: "2026-11-07T15:00:00.000Z", sessions: [session] }),
  );
  const list = await createAdminApi({ fetcher }).listSessions();

  assert.deepEqual(list, { sessions: [session], serverTime: "2026-11-07T15:00:00.000Z" });
  assert.equal(calls[0].url, `${ADMIN_API_BASE}/list`);
  assert.equal(calls[0].init.method, "GET");
});

test("an answer without the expected data is refused instead of trusted", async () => {
  const { fetcher } = fakeFetcher(json(200, { success: true }), json(200, { success: true }));
  const api = createAdminApi({ fetcher });

  await assert.rejects(api.listSessions(), (error: unknown) => {
    assert.ok(error instanceof AdminApiError);
    assert.equal(error.code, "INVALID_RESPONSE");
    return true;
  });
  await assert.rejects(api.getSession(3), (error: unknown) => error instanceof AdminApiError);
});

test("a refusal carries the server's message and counts as an access problem for 401 and 403", async () => {
  const { fetcher } = fakeFetcher(
    json(403, failureBody("ADMIN_SECTION_FORBIDDEN", "Only the panel owner can open this section.")),
    json(401, failureBody("unauthorized", "Sign in again.")),
    json(500, { success: false }),
  );
  const api = createAdminApi({ fetcher });

  const forbidden = await api.listSessions().catch((error: unknown) => error);
  assert.ok(forbidden instanceof AdminApiError);
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.message, "Only the panel owner can open this section.");
  assert.equal(isAccessError(forbidden), true);

  const signedOut = await api.listSessions().catch((error: unknown) => error);
  assert.equal(isAccessError(signedOut), true);
  assert.equal((signedOut as AdminApiError).message, "Sign in again.");

  const broken = await api.listSessions().catch((error: unknown) => error);
  assert.equal(isAccessError(broken), false);
  assert.ok(broken instanceof AdminApiError);
  assert.equal(broken.status, 500);
});

test("adminErrorMessage shows the server's wording and a fallback for anything else", () => {
  const failure = new AdminApiError({ status: 409, code: "session_ended", message: "A session that has ended cannot be cancelled." });
  assert.equal(adminErrorMessage(failure, "Could not cancel."), "A session that has ended cannot be cancelled.");
  assert.equal(adminErrorMessage(new Error("boom"), "Could not cancel."), "Could not cancel.");
  assert.equal(adminErrorMessage(undefined, "Could not cancel."), "Could not cancel.");
});

test("a request that never reached the server is a readable network error", async () => {
  const { fetcher } = fakeFetcher(new TypeError("Failed to fetch"));
  const error = await createAdminApi({ fetcher })
    .listSessions()
    .catch((caught: unknown) => caught);

  assert.ok(error instanceof AdminApiError);
  assert.equal(error.status, 0);
  assert.equal(error.code, "NETWORK_ERROR");
  assert.match(error.message, /network/i);
});

test("the abort signal reaches the request, and a cancelled request is an abort, not a failure", async () => {
  const controller = new AbortController();
  const seen: Array<AbortSignal | null | undefined> = [];
  const fetcher = async (_url: string, init: RequestInit): Promise<Response> => {
    seen.push(init.signal);
    controller.abort();
    throw new DOMException("aborted", "AbortError");
  };

  await assert.rejects(createAdminApi({ fetcher }).searchTracks("abc", controller.signal), { name: "AbortError" });
  assert.equal(seen[0], controller.signal);
});

test("a host search shorter than two characters makes no request", async () => {
  const { fetcher, calls } = fakeFetcher(json(200, { success: true, hosts: [{ id: 5, name: "Ama", role: "admin" }] }));
  const api = createAdminApi({ fetcher });

  assert.equal(HOST_SEARCH_MIN_CHARS, 2);
  assert.deepEqual(await api.searchHosts(" a "), []);
  assert.deepEqual(await api.searchHosts(""), []);
  assert.equal(calls.length, 0);

  assert.deepEqual(await api.searchHosts("am"), [{ id: 5, name: "Ama", role: "admin" }]);
  assert.equal(queryOf(calls[0].url).get("q"), "am");
});

test("tracks, playlists and a playlist's tracks come from their own routes", async () => {
  const track = { id: 1, title: "One", artistName: "A", grade: null };
  const { fetcher, calls } = fakeFetcher(
    json(200, { success: true, tracks: [track] }),
    json(200, { success: true, playlists: [{ id: 8, name: "Warm up", trackCount: 4 }] }),
    json(200, { success: true, tracks: [track] }),
  );
  const api = createAdminApi({ fetcher });

  assert.deepEqual(await api.searchTracks("one"), [track]);
  assert.deepEqual(await api.searchPlaylists("warm"), [{ id: 8, name: "Warm up", trackCount: 4 }]);
  assert.deepEqual(await api.playlistTracks(8), [track]);
  assert.ok(calls[0].url.startsWith(`${ADMIN_API_BASE}/tracks?`));
  assert.ok(calls[1].url.startsWith(`${ADMIN_API_BASE}/playlists?`));
  assert.equal(calls[2].url, `${ADMIN_API_BASE}/playlists/8/tracks`);
});

test("creating posts the payload as JSON and returns the new session", async () => {
  const payload = {
    title: "Friday",
    startsAt: "2026-11-13T20:00:00.000Z",
    gapSeconds: 15,
    tracks: [{ trackId: 1, durationSec: 180 }],
  };
  const { fetcher, calls } = fakeFetcher(json(201, { success: true, session: { id: 9, tracks: [] } }));
  const session = await createAdminApi({ fetcher }).createSession(payload);

  assert.equal(session.id, 9);
  assert.equal(calls[0].url, ADMIN_API_BASE);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), payload);
});

test("editing patches the session and cancelling posts to its cancel route", async () => {
  const { fetcher, calls } = fakeFetcher(
    json(200, { success: true, session: { id: 9, tracks: [] } }),
    json(200, { success: true, id: 9, status: "cancelled", alreadyCancelled: true }),
  );
  const api = createAdminApi({ fetcher });

  await api.updateSession(9, { title: "Renamed" });
  assert.equal(calls[0].url, `${ADMIN_API_BASE}/9`);
  assert.equal(calls[0].init.method, "PATCH");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), { title: "Renamed" });

  assert.deepEqual(await api.cancelSession(9), { id: 9, alreadyCancelled: true });
  assert.equal(calls[1].url, `${ADMIN_API_BASE}/9/cancel`);
  assert.equal(calls[1].init.method, "POST");
  assert.equal(calls[1].init.body, undefined);
});

test("a rejected change shows the reason the server gave", async () => {
  const { fetcher } = fakeFetcher(
    json(409, failureBody("session_started", "The session has already started; its schedule can no longer change.")),
  );
  const error = await createAdminApi({ fetcher })
    .updateSession(9, { gapSeconds: 5 })
    .catch((caught: unknown) => caught);

  assert.ok(error instanceof AdminApiError);
  assert.equal(error.status, 409);
  assert.equal(error.code, "session_started");
  assert.match(error.message, /already started/);
});

test("readiness is read from the status body and from the HTTP errors the server uses", () => {
  const ok = (data: object) => ({ ok: true as const, status: 200, data });
  const failed = (status: number, message = "x") => ({ ok: false as const, status, code: null, message });

  assert.deepEqual(readinessFromStatus(ok({ enabled: true, schemaReady: true })), { state: "ready" });
  assert.deepEqual(readinessFromStatus(ok({ enabled: false, schemaReady: true })), { state: "off" });
  assert.deepEqual(readinessFromStatus(ok({ enabled: true, schemaReady: false })), { state: "not_ready" });
  assert.equal(readinessFromStatus(ok({})).state, "error");

  assert.deepEqual(readinessFromStatus(failed(404)), { state: "off" });
  assert.deepEqual(readinessFromStatus(failed(503)), { state: "not_ready" });
  assert.deepEqual(readinessFromStatus(failed(401, "Sign in again.")), { state: "access", message: "Sign in again." });
  assert.equal(readinessFromStatus(failed(403)).state, "access");
  assert.deepEqual(readinessFromStatus(failed(429, "Slow down.")), { state: "error", message: "Slow down." });
  assert.equal(readinessFromStatus(failed(0, "Network problem")).state, "error");
});

test("the status call maps a healthy server, a switched-off one and one still preparing", async () => {
  const { fetcher } = fakeFetcher(
    json(200, { success: true, enabled: true, schemaReady: true, serverTime: "2026-11-07T15:00:00.000Z" }),
    json(404, failureBody("not_found", "Not found")),
    json(503, failureBody("not_ready", "Listening sessions are not ready yet. Try again shortly.")),
  );
  const api = createAdminApi({ fetcher });

  assert.deepEqual(await api.fetchReadiness(), { state: "ready" });
  assert.deepEqual(await api.fetchReadiness(), { state: "off" });
  assert.deepEqual(await api.fetchReadiness(), { state: "not_ready" });
});

test("a clock a minute or more off the server's is reported, a close one is not", () => {
  const server = "2026-11-07T15:00:00.000Z";
  const serverMs = Date.parse(server);

  assert.equal(clockSkewNotice(server, serverMs + 59_000), null);
  assert.equal(clockSkewNotice(server, serverMs - 59_000), null);
  assert.match(clockSkewNotice(server, serverMs - 5 * 60_000) ?? "", /about 5 min behind the server/);
  assert.match(clockSkewNotice(server, serverMs + 12 * 60_000) ?? "", /about 12 min ahead of the server/);
  assert.equal(clockSkewNotice(null, serverMs), null);
  assert.equal(clockSkewNotice("not a date", serverMs), null);
});
