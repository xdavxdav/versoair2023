import assert from "node:assert/strict";
import test from "node:test";

import type { SessionChatMessage, SessionStatus, SessionTrackView } from "@shared/listening-session";
import {
  CHAT_MAX_CHARS,
  CHAT_PAGE,
  CHAT_POLL_HIDDEN_MS,
  CHAT_POLL_LIMIT,
  CHAT_POLL_MAX_MS,
  CHAT_POLL_VISIBLE_MS,
  EMPTY_CHAT,
  applyChatPage,
  authState,
  cardActionKey,
  checkChatDraft,
  chatPanelState,
  chatPollDelayMs,
  chatUrl,
  classifyChatPostFailure,
  composerFor,
  composerNotice,
  countdownSec,
  detailView,
  earlierChatRequest,
  formatChatTime,
  listenMode,
  nextChatRequest,
  nowPlayingNote,
  nowPlayingView,
  parseChatMessages,
  parseSessionList,
  replayTracks,
  showsOfflineBanner,
  signInPath,
  statusLabelKey,
  trackRowStates,
  type ChatState,
  type DetailView,
} from "./listening-session-page-state";
import { CHAT_KEEP, planPlayback } from "./listening-session-sync";

const T0 = Date.parse("2026-11-08T20:00:00.000Z");

function track(trackId: number, durationSec: number, overrides: Partial<SessionTrackView> = {}): SessionTrackView {
  return {
    position: 0,
    trackId,
    title: `Track ${trackId}`,
    artistName: "Ada",
    durationSec,
    startOffsetSec: 0,
    grade: null,
    available: true,
    ...overrides,
  };
}

// Three tracks of 200, 100 and 150 s with a 10 s pause between them: 0-200, 210-310, 320-470.
const TRACKS = [track(101, 200, { grade: "S" }), track(102, 100), track(103, 150)];

function planAt(offsetSec: number, tracks: readonly SessionTrackView[] = TRACKS, status: SessionStatus = "live") {
  return planPlayback({
    status,
    schedule: { startsAt: new Date(T0).toISOString(), gapSeconds: 10, tracks },
    serverNowMs: T0 + offsetSec * 1000,
  });
}

function message(id: number, overrides: Partial<SessionChatMessage> = {}): SessionChatMessage {
  return { id, body: `Message ${id}`, createdAt: new Date(T0 + id * 1000).toISOString(), author: "Ada", isHost: false, ...overrides };
}

const messageRange = (from: number, to: number): SessionChatMessage[] =>
  Array.from({ length: to - from + 1 }, (_, index) => message(from + index));

const ids = (state: ChatState): number[] => state.messages.map((item) => item.id);

// ─── the main view ───────────────────────────────────────────────────────

test("the load phase decides first; a loaded session is the page for its status", () => {
  assert.equal(detailView({ phase: "loading", status: null }), "loading");
  assert.equal(detailView({ phase: "notfound", status: null }), "notfound");
  assert.equal(detailView({ phase: "error", status: null }), "error");
  for (const status of ["scheduled", "live", "ended", "cancelled"] as const) {
    assert.equal(detailView({ phase: "ready", status }), status);
  }
  assert.equal(detailView({ phase: "ready", status: null }), "loading");
});

test("the reconnecting banner shows only while a scheduled or live session is being followed", () => {
  assert.equal(showsOfflineBanner("live", true), true);
  assert.equal(showsOfflineBanner("scheduled", true), true);
  assert.equal(showsOfflineBanner("live", false), false);
  for (const view of ["loading", "notfound", "error", "ended", "cancelled"] as const) {
    assert.equal(showsOfflineBanner(view, true), false, view);
  }
});

test("a status is named by its own label, and a card invites the visitor to the matching action", () => {
  assert.deepEqual(
    (["live", "scheduled", "ended", "cancelled"] as const).map((status) => [statusLabelKey(status), cardActionKey(status)]),
    [
      ["pillLive", "cardJoin"],
      ["sectionUpcoming", "cardDetails"],
      ["pillEnded", "cardReplay"],
      ["pillCancelled", "cardDetails"],
    ],
  );
});

test("a live session offers Join, then the tap button or the controls once joined", () => {
  assert.equal(listenMode({ view: "live", joined: false, needsTap: false }), "join");
  assert.equal(listenMode({ view: "live", joined: false, needsTap: true }), "join");
  assert.equal(listenMode({ view: "live", joined: true, needsTap: true }), "tap");
  assert.equal(listenMode({ view: "live", joined: true, needsTap: false }), "listening");
});

test("someone who joined before the start waits; every other view has nothing to listen to", () => {
  assert.equal(listenMode({ view: "scheduled", joined: true, needsTap: false }), "waiting");
  assert.equal(listenMode({ view: "scheduled", joined: false, needsTap: false }), "none");
  const quiet: DetailView[] = ["loading", "notfound", "error", "ended", "cancelled"];
  for (const view of quiet) {
    assert.equal(listenMode({ view, joined: true, needsTap: true }), "none", view);
  }
});

test("the countdown is read from a scheduled plan and from nothing else", () => {
  assert.equal(countdownSec(planAt(-90, TRACKS, "scheduled")), 90);
  assert.equal(countdownSec(planAt(10)), null);
  assert.equal(countdownSec(planAt(205)), null);
  assert.equal(countdownSec(planAt(500, TRACKS, "ended")), null);
  assert.equal(countdownSec(planAt(-90, TRACKS, "cancelled")), null);
});

// ─── now playing and the tracklist ───────────────────────────────────────

test("now playing names the slot, how far along it is, and what comes next", () => {
  const view = nowPlayingView(planAt(65), TRACKS, null);
  assert.equal(view.kind, "track");
  assert.equal(view.track?.trackId, 101);
  assert.equal(view.elapsedSec, 65);
  assert.ok(Math.abs(view.progress - 0.325) < 1e-9);
  assert.equal(view.failed, false);
  assert.equal(view.next?.trackId, 102);
});

test("the last track has nothing after it", () => {
  const view = nowPlayingView(planAt(400), TRACKS, null);
  assert.equal(view.kind, "track");
  assert.equal(view.track?.trackId, 103);
  assert.equal(view.next, null);
});

test("a track the engine gave up on is flagged while the clock keeps going", () => {
  assert.equal(nowPlayingView(planAt(65), TRACKS, 101).failed, true);
  assert.equal(nowPlayingView(planAt(65), TRACKS, 102).failed, false);
  const later = nowPlayingView(planAt(120), TRACKS, 101);
  assert.equal(later.failed, true);
  assert.equal(later.elapsedSec, 120);
});

test("an unpublished track keeps its slot: the clock runs and the next one is still announced", () => {
  const gone = [TRACKS[0], track(102, 100, { available: false, title: "", artistName: null }), TRACKS[2]];
  const view = nowPlayingView(planAt(250, gone), gone, null);
  assert.equal(view.kind, "unavailable");
  assert.equal(view.track?.trackId, 102);
  assert.equal(view.elapsedSec, 40);
  assert.ok(Math.abs(view.progress - 0.4) < 1e-9);
  assert.equal(view.next?.trackId, 103);
});

test("between two tracks it is a break that points at the next one", () => {
  const view = nowPlayingView(planAt(205), TRACKS, null);
  assert.equal(view.kind, "break");
  assert.equal(view.track, null);
  assert.equal(view.next?.trackId, 102);
});

test("before the start and after the end there is nothing playing", () => {
  assert.equal(nowPlayingView(planAt(-5, TRACKS, "scheduled"), TRACKS, null).kind, "idle");
  assert.equal(nowPlayingView(planAt(500, TRACKS, "ended"), TRACKS, null).kind, "idle");
  assert.equal(nowPlayingView(planAt(10, TRACKS, "cancelled"), TRACKS, null).kind, "idle");
});

test("the note says what is wrong or what is coming, and is empty while a track simply plays", () => {
  const gone = [TRACKS[0], track(102, 100, { available: false, title: "", artistName: null }), TRACKS[2]];
  assert.equal(nowPlayingNote(nowPlayingView(planAt(65), TRACKS, null)), null);
  assert.equal(nowPlayingNote(nowPlayingView(planAt(65), TRACKS, 101)), "unavailable");
  assert.equal(nowPlayingNote(nowPlayingView(planAt(250, gone), gone, null)), "unavailable");
  assert.equal(nowPlayingNote(nowPlayingView(planAt(205), TRACKS, null)), "breakThenNext");
  assert.equal(nowPlayingNote(nowPlayingView(planAt(205, gone), gone, null)), "break");
  assert.equal(nowPlayingNote(nowPlayingView(planAt(-5, TRACKS, "scheduled"), TRACKS, null)), "syncing");
  assert.equal(nowPlayingNote(nowPlayingView(planAt(500, TRACKS, "ended"), TRACKS, null)), "syncing");
});

test("rows before the current one are past, the current one is marked, and the next one is announced", () => {
  const rows = trackRowStates(planAt(250), TRACKS);
  assert.deepEqual(
    rows.map((row) => [row.past, row.current, row.next]),
    [
      [true, false, false],
      [false, true, false],
      [false, false, true],
    ],
  );
});

test("in a break the track before it is past and the one after it is next", () => {
  const rows = trackRowStates(planAt(205), TRACKS);
  assert.deepEqual(
    rows.map((row) => [row.past, row.current, row.next]),
    [
      [true, false, false],
      [false, false, true],
      [false, false, false],
    ],
  );
});

test("on the last track nothing is next", () => {
  const rows = trackRowStates(planAt(400), TRACKS);
  assert.deepEqual(
    rows.map((row) => [row.past, row.current, row.next]),
    [
      [true, false, false],
      [true, false, false],
      [false, true, false],
    ],
  );
});

test("before the start and after the end no row is highlighted or dimmed", () => {
  for (const plan of [planAt(-30, TRACKS, "scheduled"), planAt(600, TRACKS, "ended")]) {
    for (const row of trackRowStates(plan, TRACKS)) {
      assert.deepEqual([row.past, row.current, row.next], [false, false, false]);
    }
  }
});

test("an unpublished track is flagged in every state, and can be the current row", () => {
  const gone = [TRACKS[0], track(102, 100, { available: false, title: "", artistName: null }), TRACKS[2]];
  assert.deepEqual(trackRowStates(planAt(-30, gone, "scheduled"), gone).map((row) => row.unavailable), [false, true, false]);
  const live = trackRowStates(planAt(250, gone), gone);
  assert.equal(live[1].unavailable, true);
  assert.equal(live[1].current, true);
  assert.equal(live[2].next, true);
});

test("the replay plays the tracks that can be heard, in set order", () => {
  const set = [
    track(101, 200, { title: "One", artistName: "Ada" }),
    track(102, 100, { available: false, title: "", artistName: null }),
    track(103, 150, { title: "Three", artistName: null }),
  ];
  assert.deepEqual(replayTracks(set), [
    { id: 101, title: "One", duration: 200, artist_name: "Ada" },
    { id: 103, title: "Three", duration: 150 },
  ]);
  assert.deepEqual(replayTracks([set[1]]), []);
});

// ─── the chat panel ──────────────────────────────────────────────────────

test("signed in beats everything; otherwise the account check decides between waiting and anonymous", () => {
  assert.equal(authState({ signedIn: true, checking: true }), "signedIn");
  assert.equal(authState({ signedIn: true, checking: false }), "signedIn");
  assert.equal(authState({ signedIn: false, checking: true }), "checking");
  assert.equal(authState({ signedIn: false, checking: false }), "anonymous");
});

test("a live chat loads, polls, and lets only signed-in people write", () => {
  const signedIn = chatPanelState("live", "signedIn");
  assert.deepEqual(signedIn, { visible: true, loads: true, polls: true, composer: "compose", note: null });
  assert.equal(chatPanelState("live", "anonymous").composer, "signIn");
  assert.equal(chatPanelState("live", "checking").composer, "checking");
});

test("the chat of a finished session is a read-only archive that loads once", () => {
  for (const auth of ["signedIn", "anonymous", "checking"] as const) {
    assert.deepEqual(chatPanelState("ended", auth), {
      visible: true,
      loads: true,
      polls: false,
      composer: "none",
      note: "ended",
    });
  }
});

test("before the start the chat is closed and asks for nothing", () => {
  for (const auth of ["signedIn", "anonymous", "checking"] as const) {
    assert.deepEqual(chatPanelState("scheduled", auth), {
      visible: true,
      loads: false,
      polls: false,
      composer: "none",
      note: "beforeStart",
    });
  }
});

test("there is no chat panel for a session that is cancelled, missing, or not loaded", () => {
  for (const view of ["cancelled", "notfound", "error", "loading"] as const) {
    const panel = chatPanelState(view, "signedIn");
    assert.equal(panel.visible, false, view);
    assert.equal(panel.loads, false, view);
    assert.equal(panel.polls, false, view);
    assert.equal(panel.composer, "none", view);
  }
});

test("the chat is polled every 4 s in a visible tab and every 15 s in a hidden one", () => {
  assert.equal(CHAT_POLL_VISIBLE_MS, 4_000);
  assert.equal(CHAT_POLL_HIDDEN_MS, 15_000);
  assert.equal(chatPollDelayMs({ tabVisible: true, failures: 0 }), 4_000);
  assert.equal(chatPollDelayMs({ tabVisible: false, failures: 0 }), 15_000);
});

test("failed polls back off and are capped at 30 s", () => {
  const visible = [1, 2, 3, 4, 9].map((failures) => chatPollDelayMs({ tabVisible: true, failures }));
  assert.deepEqual(visible, [8_000, 16_000, CHAT_POLL_MAX_MS, CHAT_POLL_MAX_MS, CHAT_POLL_MAX_MS]);
  assert.equal(chatPollDelayMs({ tabVisible: false, failures: 1 }), CHAT_POLL_MAX_MS);
  assert.equal(chatPollDelayMs({ tabVisible: true, failures: -3 }), 4_000);
  assert.equal(chatPollDelayMs({ tabVisible: true, failures: Number.NaN }), 4_000);
});

// ─── the chat messages on screen ─────────────────────────────────────────

test("an empty chat asks for the latest page; a chat with messages asks for what came after the newest", () => {
  assert.deepEqual(nextChatRequest([]), { afterId: null, beforeId: null, limit: CHAT_PAGE });
  assert.deepEqual(nextChatRequest([message(4), message(9)]), { afterId: 9, beforeId: null, limit: CHAT_POLL_LIMIT });
});

test("earlier messages are asked for before the oldest one on screen, and only when there is one", () => {
  assert.equal(earlierChatRequest([]), null);
  assert.deepEqual(earlierChatRequest([message(4), message(9)]), { afterId: null, beforeId: 4, limit: CHAT_PAGE });
});

test("the chat address carries the cursor and the page size", () => {
  assert.equal(chatUrl(12, { afterId: null, beforeId: null, limit: 50 }), "/api/listening-sessions/12/chat?limit=50");
  assert.equal(chatUrl(12, { afterId: 77, beforeId: null, limit: 100 }), "/api/listening-sessions/12/chat?limit=100&afterId=77");
  assert.equal(chatUrl(12, { afterId: null, beforeId: 31, limit: 50 }), "/api/listening-sessions/12/chat?limit=50&beforeId=31");
});

test("a chat answer is read message by message and a bad message is left out", () => {
  const parsed = parseChatMessages({
    success: true,
    messages: [
      { id: 3, body: "Hello <b>there</b>", createdAt: "2026-11-08T20:01:00.000Z", author: "Ada", isHost: true },
      { id: 0, body: "bad id", createdAt: "", author: "Ben", isHost: false },
      { id: 4.5, body: "bad id", createdAt: "", author: "Ben", isHost: false },
      { id: 5, body: 42, createdAt: "", author: "Ben", isHost: false },
      { id: 6, body: "no author", createdAt: "" },
      "nope",
      null,
      { id: 7, body: "plain", createdAt: 12, author: "Cy", isHost: "yes" },
    ],
  });
  assert.deepEqual(parsed, [
    { id: 3, body: "Hello <b>there</b>", createdAt: "2026-11-08T20:01:00.000Z", author: "Ada", isHost: true },
    { id: 7, body: "plain", createdAt: "", author: "Cy", isHost: false },
  ]);
});

test("an answer that is not a list of messages is not a chat answer", () => {
  assert.equal(parseChatMessages(null), null);
  assert.equal(parseChatMessages("<html>"), null);
  assert.equal(parseChatMessages([]), null);
  assert.equal(parseChatMessages({ success: true }), null);
  assert.equal(parseChatMessages({ messages: "none" }), null);
  assert.deepEqual(parseChatMessages({ messages: [] }), []);
});

test("the first page fills the chat, and a full page says there may be earlier messages", () => {
  const full = applyChatPage(EMPTY_CHAT, nextChatRequest([]), messageRange(51, 100));
  assert.equal(full.messages.length, 50);
  assert.equal(full.earlier, true);
  const short = applyChatPage(EMPTY_CHAT, nextChatRequest([]), messageRange(1, 3));
  assert.deepEqual(ids(short), [1, 2, 3]);
  assert.equal(short.earlier, false);
});

test("an answer with nothing new leaves the chat object alone, so nothing redraws", () => {
  assert.equal(applyChatPage(EMPTY_CHAT, nextChatRequest([]), []), EMPTY_CHAT);
  const state: ChatState = { messages: messageRange(1, 3), earlier: false };
  assert.equal(applyChatPage(state, nextChatRequest(state.messages), []), state);
});

test("new messages are added after the newest, in order and without duplicates", () => {
  const state: ChatState = { messages: messageRange(1, 3), earlier: false };
  const next = applyChatPage(state, nextChatRequest(state.messages), [message(3), message(5), message(4)]);
  assert.deepEqual(ids(next), [1, 2, 3, 4, 5]);
  assert.equal(next.earlier, false);
});

test("the chat keeps the newest 300 messages, and the cut says earlier ones exist", () => {
  const state: ChatState = { messages: messageRange(1, CHAT_KEEP), earlier: false };
  const next = applyChatPage(state, nextChatRequest(state.messages), [message(301), message(302)]);
  assert.equal(next.messages.length, CHAT_KEEP);
  assert.equal(next.messages[0].id, 3);
  assert.equal(next.messages[CHAT_KEEP - 1].id, 302);
  assert.equal(next.earlier, true);
});

test("earlier messages are put before the oldest, and a short page says the start has been reached", () => {
  const state: ChatState = { messages: messageRange(41, 90), earlier: true };
  const request = earlierChatRequest(state.messages);
  assert.ok(request);
  const short = applyChatPage(state, request, messageRange(1, 40));
  assert.equal(short.messages.length, 90);
  assert.equal(short.messages[0].id, 1);
  assert.equal(short.earlier, false, "a page of 40 is short of the 50 asked for");
});

test("a full page of earlier messages says there may be more behind it", () => {
  const state: ChatState = { messages: messageRange(61, 110), earlier: true };
  const request = earlierChatRequest(state.messages);
  assert.ok(request);
  const full = applyChatPage(state, request, messageRange(11, 60));
  assert.equal(full.messages.length, 100);
  assert.equal(full.messages[0].id, 11);
  assert.equal(full.earlier, true);
});

test("paging back is never cut to 300, and the cap then follows what the reader loaded", () => {
  const state: ChatState = { messages: messageRange(101, 400), earlier: true };
  const request = earlierChatRequest(state.messages);
  assert.ok(request);
  const paged = applyChatPage(state, request, messageRange(51, 100));
  assert.equal(paged.messages.length, 350);

  const grown = applyChatPage(paged, nextChatRequest(paged.messages), [message(401)]);
  assert.equal(grown.messages.length, 350);
  assert.equal(grown.messages[0].id, 52);
  assert.equal(grown.earlier, true);
});

test("a message time reads as the time of day in the reader's language", () => {
  const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");
  assert.equal(plain(formatChatTime("2026-11-08T20:05:00.000Z", "en", "UTC")), "8:05 PM");
  assert.equal(plain(formatChatTime("2026-11-08T20:05:00.000Z", "fr", "UTC")), "20:05");
  assert.equal(formatChatTime("not a date", "en", "UTC"), "");
});

// ─── writing a message ───────────────────────────────────────────────────

test("a draft is trimmed, and an empty or over-long one is refused before it is sent", () => {
  assert.deepEqual(checkChatDraft("  hello  "), { ok: true, content: "hello" });
  assert.deepEqual(checkChatDraft("   \n "), { ok: false, reason: "empty" });
  assert.deepEqual(checkChatDraft(""), { ok: false, reason: "empty" });
  assert.deepEqual(checkChatDraft("a".repeat(CHAT_MAX_CHARS)), { ok: true, content: "a".repeat(CHAT_MAX_CHARS) });
  assert.deepEqual(checkChatDraft("a".repeat(CHAT_MAX_CHARS + 1)), { ok: false, reason: "tooLong" });
  assert.deepEqual(checkChatDraft(` ${"a".repeat(CHAT_MAX_CHARS)} `), { ok: true, content: "a".repeat(CHAT_MAX_CHARS) });
});

test("slow mode and rate limits read as slow mode, a lost login asks to sign in, the rest is a plain failure", () => {
  assert.equal(classifyChatPostFailure(429, { error: "Slow mode: wait", slowMode: true }), "slowMode");
  assert.equal(classifyChatPostFailure(429, null), "slowMode");
  assert.equal(classifyChatPostFailure(403, { slowMode: true }), "slowMode");
  assert.equal(classifyChatPostFailure(401, { success: false, error: { code: "unauthorized" } }), "signIn");
  assert.equal(classifyChatPostFailure(400, { success: false, error: "Message too long (2000 chars max)" }), "failed");
  assert.equal(classifyChatPostFailure(403, { code: "CSRF_VALIDATION_FAILED" }), "failed");
  assert.equal(classifyChatPostFailure(500, { success: false, error: "Failed to publish message" }), "failed");
  assert.equal(classifyChatPostFailure(500, "<html>"), "failed");
});

test("a refused login turns the message box into the sign-in prompt, and nothing else does", () => {
  const signedIn = chatPanelState("live", "signedIn");
  assert.equal(composerFor(signedIn, null), "compose");
  assert.equal(composerFor(signedIn, "slowMode"), "compose");
  assert.equal(composerFor(signedIn, "failed"), "compose");
  assert.equal(composerFor(signedIn, "signIn"), "signIn");
  assert.equal(composerFor(chatPanelState("live", "anonymous"), null), "signIn");
  assert.equal(composerFor(chatPanelState("live", "signedIn"), null), "compose");
  assert.equal(composerFor(chatPanelState("ended", "signedIn"), "signIn"), "none");
});

test("the note under the message box puts a too-long draft before the last refusal", () => {
  const ok = checkChatDraft("hello");
  const empty = checkChatDraft("   ");
  const long = checkChatDraft("x".repeat(CHAT_MAX_CHARS + 1));
  assert.equal(composerNotice(ok, null), null);
  assert.equal(composerNotice(empty, null), null);
  assert.equal(composerNotice(long, null), "tooLong");
  assert.equal(composerNotice(long, "slowMode"), "tooLong");
  assert.equal(composerNotice(ok, "slowMode"), "slowMode");
  assert.equal(composerNotice(empty, "failed"), "failed");
  assert.equal(composerNotice(ok, "signIn"), null);
});

test("the sign-in link returns to the page it came from", () => {
  assert.equal(signInPath("/sessions/12"), "/auth/signin?redirect=%2Fsessions%2F12");
});

// ─── the list page ───────────────────────────────────────────────────────

function summaryJson(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    title: "Friday listening session",
    description: "Slow records.",
    hostName: "Luq",
    startsAt: new Date(T0).toISOString(),
    endsAt: new Date(T0 + 470_000).toISOString(),
    status: "scheduled",
    gapSeconds: 10,
    trackCount: 3,
    totalDurationSec: 470,
    ...overrides,
  };
}

test("a list answer gives its sessions and the server clock", () => {
  const parsed = parseSessionList({ success: true, serverTime: "2026-11-08T19:00:00.000Z", sessions: [summaryJson()] });
  assert.deepEqual(parsed, {
    serverTime: "2026-11-08T19:00:00.000Z",
    sessions: [summaryJson()],
  });
});

test("missing optional fields are filled in, not refused", () => {
  const parsed = parseSessionList({
    serverTime: "2026-11-08T19:00:00.000Z",
    sessions: [summaryJson({ title: undefined, description: "", hostName: null, gapSeconds: "x", trackCount: undefined })],
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.sessions[0], summaryJson({ title: "", description: null, hostName: null, gapSeconds: 0, trackCount: 0 }));
});

test("a session whose id, times or status make no sense is left out of the list", () => {
  const parsed = parseSessionList({
    serverTime: "2026-11-08T19:00:00.000Z",
    sessions: [
      summaryJson({ id: 1 }),
      summaryJson({ id: "2" }),
      summaryJson({ id: 0 }),
      summaryJson({ id: 4, startsAt: "soon" }),
      summaryJson({ id: 5, endsAt: new Date(T0).toISOString() }),
      summaryJson({ id: 6, status: "paused" }),
      summaryJson({ id: 7, startsAt: 12 }),
      null,
      summaryJson({ id: 8, status: "live" }),
    ],
  });
  assert.deepEqual(parsed?.sessions.map((session) => session.id), [1, 8]);
});

test("an answer that is not a session list is refused", () => {
  assert.equal(parseSessionList(null), null);
  assert.equal(parseSessionList({ sessions: [] }), null);
  assert.equal(parseSessionList({ serverTime: "2026-11-08T19:00:00.000Z" }), null);
  assert.equal(parseSessionList({ serverTime: 5, sessions: [] }), null);
  assert.deepEqual(parseSessionList({ serverTime: "2026-11-08T19:00:00.000Z", sessions: [] }), {
    serverTime: "2026-11-08T19:00:00.000Z",
    sessions: [],
  });
});
