import assert from "node:assert/strict";
import test from "node:test";
import {
  appendMessageOnce,
  applyIncomingToConversations,
  applySentToConversations,
  buildSignInHref,
  confirmPendingMessage,
  fetchInboxContacts,
  fetchInboxConversations,
  fetchInboxThread,
  isTypingFromParticipant,
  keepConversationMessages,
  localFailure,
  markInboxConversationRead,
  mergeThreadReload,
  postInboxMessage,
  publishInboxMessage,
  removePendingMessage,
  restoreDraft,
  sortConversationsNewestFirst,
  startInboxConversation,
  uploadInboxAttachment,
  validateAttachment,
  type InboxFailure,
  type InboxFetcher,
} from "./inbox-api";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const replying =
  (response: Response | (() => Response)): InboxFetcher =>
  async () =>
    typeof response === "function" ? response() : response;

const failure = (result: { ok: boolean }): InboxFailure => {
  assert.equal(result.ok, false, "expected a failure");
  return result as InboxFailure;
};

/* ---------------------------- failure classes ----------------------------- */

test("a good list response returns the conversations", async () => {
  const result = await fetchInboxConversations<{ id: number }>(
    replying(json(200, { success: true, conversations: [{ id: 1 }] })),
  );
  assert.deepEqual(result, { ok: true, data: [{ id: 1 }] });
});

test("an empty inbox is a success, not a failure", async () => {
  const result = await fetchInboxConversations(
    replying(json(200, { success: true, conversations: [] })),
  );
  assert.deepEqual(result, { ok: true, data: [] });
});

test("401 tells the user to sign in and offers no retry", async () => {
  const result = failure(
    await fetchInboxConversations(
      replying(
        json(401, {
          success: false,
          status: 401,
          error: { code: "AUTH_REQUIRED", message: "Authentication required." },
        }),
      ),
    ),
  );
  assert.equal(result.kind, "unauthorized");
  assert.equal(result.retryable, false);
  assert.match(result.message, /sign in/i);
});

test("a rejected CSRF token is treated as an ended session", async () => {
  const result = failure(
    await postInboxMessage(
      replying(
        json(403, {
          success: false,
          error: { code: "CSRF_VALIDATION_FAILED", message: "Invalid token" },
        }),
      ),
      1,
      { content: "hi" },
    ),
  );
  assert.equal(result.kind, "unauthorized");
  assert.match(result.message, /sign in/i);
});

test("a 403 that is not about the session passes the server's reason through", async () => {
  const result = failure(
    await startInboxConversation(
      replying(
        json(403, {
          success: false,
          error: "Upgrade to message more people.",
          upgradeRequired: true,
        }),
      ),
      { participantId: 2, participantName: "Bo" },
    ),
  );
  assert.equal(result.kind, "client");
  assert.equal(result.message, "Upgrade to message more people.");
  assert.equal(result.retryable, false);
});

test("429 keeps the server's wording and can be retried later", async () => {
  const result = failure(
    await postInboxMessage(
      replying(
        json(429, {
          success: false,
          error: "You're sending messages too fast. Please slow down.",
        }),
      ),
      1,
      { content: "hi" },
    ),
  );
  assert.equal(result.kind, "rate_limited");
  assert.equal(result.message, "You're sending messages too fast. Please slow down.");
  assert.equal(result.retryable, true);
});

test("a plan limit (429 + upgradeRequired) is not worth retrying", async () => {
  const result = failure(
    await postInboxMessage(
      replying(
        json(429, {
          success: false,
          error: "Daily message limit reached.",
          upgradeRequired: true,
        }),
      ),
      1,
      { content: "hi" },
    ),
  );
  assert.equal(result.kind, "rate_limited");
  assert.equal(result.retryable, false);
});

test("5xx shows a generic message and never leaks server internals", async () => {
  const result = failure(
    await fetchInboxConversations(
      replying(json(500, { success: false, error: "ECONNREFUSED 10.0.0.4:5432" })),
    ),
  );
  assert.equal(result.kind, "server");
  assert.equal(result.retryable, true);
  assert.match(result.message, /conversations could not be loaded/i);
  assert.doesNotMatch(result.message, /ECONNREFUSED/);
});

test("an HTML error page from a proxy is a server failure", async () => {
  const result = failure(
    await fetchInboxThread(
      replying(new Response("<html>Bad gateway</html>", { status: 502 })),
      7,
    ),
  );
  assert.equal(result.kind, "server");
  assert.doesNotMatch(result.message, /html|gateway/i);
});

test("4xx surfaces the server message from a string or an error object", async () => {
  const asString = failure(
    await postInboxMessage(
      replying(json(400, { success: false, error: "Message is too long." })),
      1,
      { content: "x" },
    ),
  );
  assert.equal(asString.message, "Message is too long.");
  assert.equal(asString.retryable, false);

  const asObject = failure(
    await fetchInboxThread(
      replying(
        json(404, { success: false, error: { message: "Conversation not found" } }),
      ),
      9,
    ),
  );
  assert.equal(asObject.kind, "client");
  assert.equal(asObject.message, "Conversation not found");
});

test("a 4xx without a readable body falls back to a per-operation message", async () => {
  const result = failure(
    await uploadInboxAttachment(
      replying(new Response("", { status: 413 })),
      new Blob(["x"], { type: "image/png" }),
    ),
  );
  assert.equal(result.message, "The image could not be uploaded.");
});

test("very long server messages are capped", async () => {
  const result = failure(
    await postInboxMessage(
      replying(json(400, { success: false, error: "x".repeat(5000) })),
      1,
      { content: "x" },
    ),
  );
  assert.ok(result.message.length <= 240);
});

test("a dropped connection is a retryable network failure", async () => {
  const result = failure(
    await fetchInboxConversations(async () => {
      throw new TypeError("Failed to fetch");
    }),
  );
  assert.equal(result.kind, "network");
  assert.equal(result.retryable, true);
  assert.match(result.message, /connection/i);
});

test("an aborted request is reported as aborted, not as an error", async () => {
  const controller = new AbortController();
  const pending = fetchInboxConversations(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        );
      }),
    controller.signal,
  );
  controller.abort();
  assert.equal(failure(await pending).kind, "aborted");
});

test("an HTML page served with 200 is an invalid response", async () => {
  const result = failure(
    await fetchInboxConversations(
      replying(new Response("<!doctype html><title>Home</title>", { status: 200 })),
    ),
  );
  assert.equal(result.kind, "invalid_response");
  assert.equal(result.retryable, true);
});

test("success:false on a 200 is a failure and keeps the server's reason", async () => {
  const result = failure(
    await fetchInboxConversations(
      replying(json(200, { success: false, error: "Inbox is rebuilding." })),
    ),
  );
  assert.equal(result.kind, "invalid_response");
  assert.equal(result.message, "Inbox is rebuilding.");
});

test("a 200 without the expected field is an invalid response", async () => {
  assert.equal(
    failure(await fetchInboxConversations(replying(json(200, { success: true }))))
      .kind,
    "invalid_response",
  );
  assert.equal(
    failure(await postInboxMessage(replying(json(200, { success: true })), 1, { content: "x" }))
      .kind,
    "invalid_response",
  );
});

/* ------------------------------ request shape ----------------------------- */

test("sending posts JSON to the conversation and returns the stored message", async () => {
  let seen: { url: string; init?: RequestInit } | undefined;
  const result = await postInboxMessage<{ id: number }>(
    async (url, init) => {
      seen = { url, init };
      return json(200, { success: true, message: { id: 5 } });
    },
    12,
    { content: "hello", attachmentUrl: null },
  );
  assert.deepEqual(result, { ok: true, data: { id: 5 } });
  assert.equal(seen?.url, "/api/inbox/conversations/12/messages");
  assert.equal(seen?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(seen?.init?.body)), {
    content: "hello",
    attachmentUrl: null,
  });
  assert.deepEqual(seen?.init?.headers, { "Content-Type": "application/json" });
});

test("the thread loader returns messages and the conversation row", async () => {
  const result = await fetchInboxThread<{ id: number }, { participantName: string }>(
    replying(
      json(200, {
        success: true,
        messages: [{ id: 1 }],
        conversation: { participantName: "Ada" },
      }),
    ),
    3,
  );
  assert.deepEqual(result, {
    ok: true,
    data: { messages: [{ id: 1 }], conversation: { participantName: "Ada" } },
  });
});

test("contacts are searched with an encoded query and none when empty", async () => {
  const urls: string[] = [];
  const fetcher: InboxFetcher = async (url) => {
    urls.push(url);
    return json(200, { success: true, contacts: [] });
  };
  await fetchInboxContacts(fetcher);
  await fetchInboxContacts(fetcher, "a&b c");
  assert.deepEqual(urls, [
    "/api/inbox/contacts",
    "/api/inbox/contacts?q=a%26b%20c",
  ]);
});

test("starting a conversation reports whether it already existed", async () => {
  const result = await startInboxConversation<{ id: number }>(
    replying(json(200, { success: true, conversation: { id: 4 }, existing: true })),
    { participantId: 8, participantName: "Bo" },
  );
  assert.deepEqual(result, {
    ok: true,
    data: { conversation: { id: 4 }, existing: true },
  });
});

test("an upload sends multipart form data without forcing a content type", async () => {
  let init: RequestInit | undefined;
  const result = await uploadInboxAttachment(
    async (_url, options) => {
      init = options;
      return json(200, { success: true, url: "/api/inbox/attachments/file/a.png" });
    },
    new Blob(["png"], { type: "image/png" }),
  );
  assert.deepEqual(result, { ok: true, data: "/api/inbox/attachments/file/a.png" });
  assert.ok(init?.body instanceof FormData);
  assert.ok((init.body as FormData).get("file"));
  assert.equal(init.headers, undefined);
});

test("publishing succeeds only on an explicit success", async () => {
  assert.deepEqual(
    await publishInboxMessage(replying(json(200, { success: true })), 6),
    { ok: true, data: true },
  );
  assert.equal(
    failure(await publishInboxMessage(replying(json(200, {})), 6)).kind,
    "invalid_response",
  );
});

test("marking a thread read never throws, even when the request fails", async () => {
  const calls: string[] = [];
  markInboxConversationRead(async (url, init) => {
    calls.push(`${init?.method} ${url}`);
    throw new TypeError("offline");
  }, 4);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(calls, ["PATCH /api/inbox/conversations/4/read"]);
});

/* ------------------------------ message lists ----------------------------- */

type Msg = { id: number | string; conversationId: number; text: string; pending?: boolean };
const msg = (id: number | string, text = "", extra: Partial<Msg> = {}): Msg => ({
  id,
  conversationId: 1,
  text,
  ...extra,
});

test("a live message already in the thread is not appended again", () => {
  const list = [msg(1), msg(2)];
  assert.equal(appendMessageOnce(list, msg("2")), list);
  assert.deepEqual(appendMessageOnce(list, msg(3)).map((m) => m.id), [1, 2, 3]);
});

test("confirming swaps the optimistic bubble in place", () => {
  const list = [msg(1), msg(-100, "hi", { pending: true }), msg(2)];
  const next = confirmPendingMessage(list, -100, msg(9, "hi"));
  assert.deepEqual(next.map((m) => m.id), [1, 9, 2]);
});

test("a live copy that beat the response leaves a single bubble", () => {
  const list = [msg(1), msg(9, "hi"), msg(-100, "hi", { pending: true })];
  const next = confirmPendingMessage(list, -100, msg(9, "hi"));
  assert.deepEqual(next.map((m) => m.id), [1, 9]);
});

test("confirming after a reload dropped the bubble still shows the message once", () => {
  assert.deepEqual(confirmPendingMessage([msg(1)], -100, msg(9)).map((m) => m.id), [1, 9]);
  const already = [msg(1), msg(9)];
  assert.equal(confirmPendingMessage(already, -100, msg(9)), already);
});

test("a failed send removes only its own bubble", () => {
  const list = [msg(1), msg(-100, "a", { pending: true }), msg(-200, "b", { pending: true })];
  assert.deepEqual(removePendingMessage(list, -100).map((m) => m.id), [1, -200]);
});

test("opening another conversation drops the previous thread's messages", () => {
  const list = [msg(1), { ...msg(2), conversationId: 2 }];
  assert.deepEqual(keepConversationMessages(list, 2).map((m) => m.id), [2]);
  const same = [msg(1), msg(2)];
  assert.equal(keepConversationMessages(same, 1), same);
});

test("reloading a thread keeps messages that are still being sent", () => {
  const loaded = [msg(1), msg(2)];
  const current = [
    msg(1),
    msg(-5, "mine", { pending: true }),
    { ...msg(-6, "other thread", { pending: true }), conversationId: 2 },
  ];
  assert.deepEqual(mergeThreadReload(loaded, current, 1).map((m) => m.id), [1, 2, -5]);
  assert.equal(mergeThreadReload(loaded, [msg(1)], 1), loaded);
});

test("a message pushed live while the thread reloads is not lost", () => {
  const loaded = [msg(1), msg(2)];
  const current = [msg(1), msg(3, "pushed live"), { ...msg(4), conversationId: 2 }];
  assert.deepEqual(mergeThreadReload(loaded, current, 1).map((m) => m.id), [1, 2, 3]);
});

test("a message the reload already contains is shown once", () => {
  const loaded = [msg(1), msg(2, "from server")];
  const current = [msg(1), msg(2, "from live push")];
  const merged = mergeThreadReload(loaded, current, 1);
  assert.deepEqual(merged.map((m) => m.id), [1, 2]);
  assert.equal(merged[1].text, "from server");
});

test("a reload of a long thread does not put messages that left the newest page after the newest one", () => {
  // The server returns the newest page only: 51 has fallen out of it since the thread was opened.
  const loaded = [msg(52), msg(53), msg(101)];
  const current = [msg(51), msg(52), msg(53)];
  assert.deepEqual(mergeThreadReload(loaded, current, 1).map((m) => m.id), [52, 53, 101]);
  assert.equal(mergeThreadReload(loaded, current, 1), loaded);
});

test("a long thread's reload still keeps what is newer than its page", () => {
  const loaded = [msg(52), msg(53), msg(101)];
  const current = [msg(51), msg(53), msg(102, "pushed live"), msg(-7, "unsent", { pending: true })];
  assert.deepEqual(mergeThreadReload(loaded, current, 1).map((m) => m.id), [52, 53, 101, 102, -7]);
});

test("a message pushed live that the page missed is kept even when a later one was returned", () => {
  // Ids are handed out before commit, so a page can hold 101 yet not 100.
  const loaded = [msg(52), msg(53), msg(101)];
  const current = [msg(53), msg(100, "pushed live")];
  assert.deepEqual(mergeThreadReload(loaded, current, 1).map((m) => m.id), [52, 53, 101, 100]);
});

test("a reload that returns an empty page keeps every message on screen", () => {
  const current = [msg(5), msg(6), msg(-1, "unsent", { pending: true })];
  assert.deepEqual(mergeThreadReload([], current, 1).map((m) => m.id), [5, 6, -1]);
});

/* --------------------------- conversation lists --------------------------- */

type Conv = { id: number; lastMessage?: string | null; lastMessageAt?: string | null; unreadCount?: number | null };

test("a message in another thread bumps that conversation to the top and counts it unread", () => {
  const list: Conv[] = [
    { id: 1, lastMessage: "a", unreadCount: 0 },
    { id: 2, lastMessage: "b", unreadCount: 1 },
  ];
  const next = applyIncomingToConversations(list, "2", { content: "new", createdAt: "2025-01-02T00:00:00Z" }, false);
  assert.deepEqual(next.map((c) => c.id), [2, 1]);
  assert.equal(next[0].unreadCount, 2);
  assert.equal(next[0].lastMessage, "new");
  assert.equal(list[1].unreadCount, 1, "the input list must not be mutated");
});

test("a message in the open thread leaves nothing unread", () => {
  const next = applyIncomingToConversations(
    [{ id: 1, unreadCount: 3 } as Conv],
    1,
    { content: "x", createdAt: "2025-01-02T00:00:00Z" },
    true,
  );
  assert.equal(next[0].unreadCount, 0);
});

test("a message for a conversation we do not have changes nothing", () => {
  const list: Conv[] = [{ id: 1 }];
  assert.equal(
    applyIncomingToConversations(list, 99, { content: "x", createdAt: "2025-01-02T00:00:00Z" }, false),
    list,
  );
});

test("sending moves the conversation to the top without touching its unread count", () => {
  const list: Conv[] = [
    { id: 1, lastMessage: "a", unreadCount: 0 },
    { id: 2, lastMessage: "b", unreadCount: 4 },
  ];
  const next = applySentToConversations(list, 2, { content: "mine", createdAt: "2025-01-02T00:00:00Z" });
  assert.deepEqual(next.map((c) => c.id), [2, 1]);
  assert.equal(next[0].lastMessage, "mine");
  assert.equal(next[0].unreadCount, 4);
  assert.equal(list[1].lastMessage, "b", "the input list must not be mutated");
  assert.equal(applySentToConversations(list, 99, { content: "x", createdAt: "2025-01-02T00:00:00Z" }), list);
});

test("sorting is newest first and never reorders the source array", () => {
  const list: Conv[] = [
    { id: 1, lastMessageAt: "2025-01-01T00:00:00Z" },
    { id: 2, lastMessageAt: "2025-03-01T00:00:00Z" },
    { id: 3 },
  ];
  assert.deepEqual(sortConversationsNewestFirst(list).map((c) => c.id), [2, 1, 3]);
  assert.deepEqual(list.map((c) => c.id), [1, 2, 3]);
});

/* -------------------------------- composer -------------------------------- */

test("a failed message returns to an empty composer exactly as typed", () => {
  assert.equal(restoreDraft("", "  hello  "), "  hello  ");
  assert.equal(restoreDraft("   ", "hello"), "hello");
});

test("a failed message is put ahead of text typed while it was sending", () => {
  assert.equal(restoreDraft("next", "first"), "first next");
  assert.equal(restoreDraft("next", "first", "\n"), "first\nnext");
});

test("typing is matched on the person typing, not the conversation id", () => {
  // The sender's conversation row (id 1) differs from the recipient's (id 2).
  assert.equal(isTypingFromParticipant({ fromUserId: 41 }, "41"), true);
  assert.equal(isTypingFromParticipant({ fromUserId: 41 }, 41), true);
  assert.equal(isTypingFromParticipant({ fromUserId: 41 }, "42"), false);
  assert.equal(isTypingFromParticipant({ fromUserId: 41 }, undefined), false);
});

test("attachments are limited to the same images and size the server accepts", () => {
  assert.equal(validateAttachment({ type: "image/png", size: 1024 }), null);
  assert.equal(validateAttachment({ type: "image/gif", size: 8 * 1024 * 1024 }), null);
  assert.match(String(validateAttachment({ type: "text/plain", size: 10 })), /JPEG, PNG, WebP or GIF/);
  assert.match(String(validateAttachment({ type: "image/svg+xml", size: 10 })), /JPEG, PNG, WebP or GIF/);
  assert.match(String(validateAttachment({ type: "image/png", size: 8 * 1024 * 1024 + 1 })), /8 MB/);
});

test("a file refused before upload becomes a failure the notice can show", () => {
  const refused = localFailure("That image is larger than 8 MB.");
  assert.deepEqual(refused, {
    ok: false,
    kind: "client",
    status: 0,
    message: "That image is larger than 8 MB.",
    retryable: false,
  });
});

/* --------------------------------- sign-in -------------------------------- */

test("the sign-in link returns to the current page", () => {
  assert.equal(buildSignInHref("/messages"), "/auth/signin?redirect=%2Fmessages");
  assert.equal(
    buildSignInHref("/marketplace?item=4#chat"),
    "/auth/signin?redirect=%2Fmarketplace%3Fitem%3D4%23chat",
  );
});

test("the sign-in link never redirects off site", () => {
  const fallback = "/auth/signin?redirect=%2Fmessages";
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", ""]) {
    assert.equal(buildSignInHref(bad), fallback, bad);
  }
});
