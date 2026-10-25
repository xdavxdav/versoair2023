/**
 * Pure helpers shared by the inbox UIs (the slide-in MessengerPanel and the
 * /messages page). Nothing here touches React or "@/" modules, so every
 * function runs under `node --test`.
 *
 * Every request resolves to an InboxResult instead of throwing, and a failure
 * always says what went wrong in words that are safe to show to the user.
 */

export type IdLike = string | number;

export type InboxFailureKind =
  | "unauthorized"
  | "rate_limited"
  | "server"
  | "network"
  | "client"
  | "invalid_response"
  | "aborted";

export interface InboxFailure {
  ok: false;
  kind: InboxFailureKind;
  /** HTTP status, or 0 when no response arrived. */
  status: number;
  /** Safe to show to the user. */
  message: string;
  /** Whether repeating the same request can plausibly succeed. */
  retryable: boolean;
}

export type InboxResult<T> = { ok: true; data: T } | InboxFailure;

export type InboxFetcher = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

type InboxOperation =
  | "conversations"
  | "thread"
  | "send"
  | "contacts"
  | "start"
  | "upload"
  | "publish";

const FAILED: Record<InboxOperation, string> = {
  conversations: "Your conversations could not be loaded.",
  thread: "This conversation could not be loaded.",
  send: "Your message could not be sent.",
  contacts: "Contacts could not be loaded.",
  start: "The conversation could not be started.",
  upload: "The image could not be uploaded.",
  publish: "The message could not be published.",
};

const SIGN_IN_AGAIN = "Your session has ended. Sign in again to continue.";
const MAX_SERVER_MESSAGE = 240;

export const sameId = (
  a: IdLike | null | undefined,
  b: IdLike | null | undefined,
): boolean => a != null && b != null && String(a) === String(b);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function fail(
  kind: InboxFailureKind,
  status: number,
  message: string,
  retryable: boolean,
): InboxFailure {
  return { ok: false, kind, status, message, retryable };
}

async function readJson(
  response: Response,
): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed: unknown = JSON.parse(await response.text());
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** The server reports errors as "msg", { message } or { code, message }. */
function serverMessage(body: Record<string, unknown> | undefined) {
  if (!body) return undefined;
  const candidates = [
    body.error,
    isRecord(body.error) ? body.error.message : undefined,
    body.message,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().slice(0, MAX_SERVER_MESSAGE);
    }
  }
  return undefined;
}

const errorCode = (body: Record<string, unknown> | undefined) =>
  body && isRecord(body.error) ? body.error.code : undefined;

const isAbort = (error: unknown, signal?: AbortSignal | null) =>
  !!signal?.aborted || (isRecord(error) && error.name === "AbortError");

async function requestInbox<T>(
  fetcher: InboxFetcher,
  operation: InboxOperation,
  url: string,
  init: RequestInit | undefined,
  extract: (body: Record<string, unknown>) => T | undefined,
): Promise<InboxResult<T>> {
  const failed = FAILED[operation];

  let response: Response;
  try {
    response = await fetcher(url, init);
  } catch (error) {
    if (isAbort(error, init?.signal)) return fail("aborted", 0, "", false);
    return fail(
      "network",
      0,
      `${failed} Check your connection and try again.`,
      true,
    );
  }

  const body = await readJson(response);
  if (init?.signal?.aborted) return fail("aborted", 0, "", false);

  const { status } = response;
  const detail = serverMessage(body);

  if (
    status === 401 ||
    (status === 403 && errorCode(body) === "CSRF_VALIDATION_FAILED")
  ) {
    return fail("unauthorized", status, SIGN_IN_AGAIN, false);
  }
  if (status === 429) {
    return fail(
      "rate_limited",
      status,
      detail ?? "You're doing that too fast. Please wait a moment.",
      body?.upgradeRequired !== true,
    );
  }
  if (status >= 500) {
    return fail(
      "server",
      status,
      `${failed} Please try again in a moment.`,
      true,
    );
  }
  if (status >= 400) {
    return fail("client", status, detail ?? failed, status === 408);
  }

  const unexpected = `${failed} The server sent an unexpected response.`;
  if (!response.ok || !body) {
    return fail("invalid_response", status, unexpected, true);
  }
  if (body.success === false) {
    return fail("invalid_response", status, detail ?? unexpected, true);
  }
  const data = extract(body);
  return data === undefined
    ? fail("invalid_response", status, unexpected, true)
    : { ok: true, data };
}

const conversationUrl = (id: IdLike) =>
  `/api/inbox/conversations/${encodeURIComponent(String(id))}`;

export function fetchInboxConversations<C>(
  fetcher: InboxFetcher,
  signal?: AbortSignal,
) {
  return requestInbox<C[]>(
    fetcher,
    "conversations",
    "/api/inbox/conversations",
    { signal },
    (body) =>
      Array.isArray(body.conversations)
        ? (body.conversations as C[])
        : undefined,
  );
}

export interface InboxThread<M, C> {
  messages: M[];
  conversation?: C;
}

export function fetchInboxThread<M, C>(
  fetcher: InboxFetcher,
  conversationId: IdLike,
  signal?: AbortSignal,
) {
  return requestInbox<InboxThread<M, C>>(
    fetcher,
    "thread",
    `${conversationUrl(conversationId)}/messages`,
    { signal },
    (body) =>
      Array.isArray(body.messages)
        ? {
            messages: body.messages as M[],
            conversation: isRecord(body.conversation)
              ? (body.conversation as C)
              : undefined,
          }
        : undefined,
  );
}

export function postInboxMessage<M>(
  fetcher: InboxFetcher,
  conversationId: IdLike,
  payload: { content: string; attachmentUrl?: string | null },
) {
  return requestInbox<M>(
    fetcher,
    "send",
    `${conversationUrl(conversationId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    (body) => (isRecord(body.message) ? (body.message as M) : undefined),
  );
}

export function fetchInboxContacts<K>(
  fetcher: InboxFetcher,
  query = "",
  signal?: AbortSignal,
) {
  const search = query ? `?q=${encodeURIComponent(query)}` : "";
  return requestInbox<K[]>(
    fetcher,
    "contacts",
    `/api/inbox/contacts${search}`,
    { signal },
    (body) =>
      Array.isArray(body.contacts) ? (body.contacts as K[]) : undefined,
  );
}

export function startInboxConversation<C>(
  fetcher: InboxFetcher,
  payload: {
    participantId: IdLike;
    participantName: string;
    participantAvatar?: string | null;
    type?: string;
  },
) {
  return requestInbox<{ conversation: C; existing: boolean }>(
    fetcher,
    "start",
    "/api/inbox/conversations",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "direct", ...payload }),
    },
    (body) =>
      isRecord(body.conversation)
        ? {
            conversation: body.conversation as C,
            existing: body.existing === true,
          }
        : undefined,
  );
}

/** The browser sets the multipart boundary, so no Content-Type is passed. */
export function uploadInboxAttachment(fetcher: InboxFetcher, file: Blob) {
  const form = new FormData();
  form.append("file", file);
  return requestInbox<string>(
    fetcher,
    "upload",
    "/api/inbox/attachments",
    { method: "POST", body: form },
    (body) => (typeof body.url === "string" && body.url ? body.url : undefined),
  );
}

export function publishInboxMessage(fetcher: InboxFetcher, messageId: IdLike) {
  return requestInbox<true>(
    fetcher,
    "publish",
    `/api/inbox/messages/${encodeURIComponent(String(messageId))}/publish`,
    { method: "POST" },
    (body) => (body.success === true ? true : undefined),
  );
}

/** Best effort: a missed read marker only leaves the unread badge a little stale. */
export function markInboxConversationRead(
  fetcher: InboxFetcher,
  conversationId: IdLike,
): void {
  Promise.resolve()
    .then(() =>
      fetcher(`${conversationUrl(conversationId)}/read`, { method: "PATCH" }),
    )
    .catch(() => {});
}

/* -------------------------------------------------------------------------- */
/* Message list helpers                                                       */
/* -------------------------------------------------------------------------- */

export function appendMessageOnce<M extends { id: IdLike }>(
  list: M[],
  message: M,
): M[] {
  return list.some((m) => sameId(m.id, message.id)) ? list : [...list, message];
}

/**
 * Swaps the optimistic bubble for the server's copy. A live socket event can
 * deliver that same copy first, so any other row with the confirmed id is
 * dropped instead of being shown twice.
 */
export function confirmPendingMessage<M extends { id: IdLike }>(
  list: M[],
  tempId: IdLike,
  confirmed: M,
): M[] {
  if (!list.some((m) => sameId(m.id, tempId))) {
    return appendMessageOnce(list, confirmed);
  }
  return list.flatMap((m) => {
    if (sameId(m.id, tempId)) return [confirmed];
    if (sameId(m.id, confirmed.id)) return [];
    return [m];
  });
}

export function removePendingMessage<M extends { id: IdLike }>(
  list: M[],
  tempId: IdLike,
): M[] {
  return list.filter((m) => !sameId(m.id, tempId));
}

export function keepConversationMessages<M extends { conversationId: IdLike }>(
  list: M[],
  conversationId: IdLike,
): M[] {
  return list.every((m) => sameId(m.conversationId, conversationId))
    ? list
    : list.filter((m) => sameId(m.conversationId, conversationId));
}

/**
 * A reload must not wipe a message that reached the screen after the request
 * left: one still on its way to the server, one the server just confirmed, or
 * one pushed live. When both lists hold a message, the server's copy wins.
 *
 * The server only returns the newest page of a thread, so a message that is on
 * screen but older than that whole page has simply fallen out of it. It is
 * dropped: appended after the page it would show below the newest message.
 */
export function mergeThreadReload<
  M extends { id: IdLike; conversationId: IdLike },
>(loaded: M[], current: M[], conversationId: IdLike): M[] {
  // With nothing loaded there is no page to have fallen out of, so nothing is old.
  let oldestLoaded = -Infinity;
  let seen = false;
  for (const m of loaded) {
    const id = Number(m.id);
    if (!Number.isFinite(id)) continue;
    if (!seen || id < oldestLoaded) oldestLoaded = id;
    seen = true;
  }
  const newer = current.filter((m) => {
    if (!sameId(m.conversationId, conversationId)) return false;
    if (loaded.some((l) => sameId(l.id, m.id))) return false;
    const id = Number(m.id);
    // An unsent message carries a temporary negative id, and one whose id
    // cannot be compared is kept rather than lose something the visitor saw.
    return !Number.isFinite(id) || id < 0 || id > oldestLoaded;
  });
  return newer.length ? [...loaded, ...newer] : loaded;
}

/* -------------------------------------------------------------------------- */
/* Conversation list helpers                                                  */
/* -------------------------------------------------------------------------- */

interface ConversationPreview {
  id: IdLike;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number | null;
}

/** Moves the conversation to the top with its new preview; unknown ids are left alone. */
function moveToTop<C extends ConversationPreview>(
  list: C[],
  conversationId: IdLike,
  change: (current: C) => C,
): C[] {
  const index = list.findIndex((c) => sameId(c.id, conversationId));
  if (index === -1) return list;
  return [
    change(list[index]),
    ...list.slice(0, index),
    ...list.slice(index + 1),
  ];
}

export function applyIncomingToConversations<C extends ConversationPreview>(
  list: C[],
  conversationId: IdLike,
  message: { content: string; createdAt: string },
  isActive: boolean,
): C[] {
  return moveToTop(list, conversationId, (current) => ({
    ...current,
    lastMessage: message.content,
    lastMessageAt: message.createdAt,
    unreadCount: isActive ? 0 : (current.unreadCount ?? 0) + 1,
  }));
}

/** The user's own message: new preview and position, but the unread count is not theirs to change. */
export function applySentToConversations<C extends ConversationPreview>(
  list: C[],
  conversationId: IdLike,
  message: { content: string; createdAt: string },
): C[] {
  return moveToTop(list, conversationId, (current) => ({
    ...current,
    lastMessage: message.content,
    lastMessageAt: message.createdAt,
  }));
}

export function sortConversationsNewestFirst<
  C extends { lastMessageAt?: string | null },
>(list: C[]): C[] {
  const time = (c: C) => new Date(c.lastMessageAt || 0).getTime() || 0;
  return [...list].sort((a, b) => time(b) - time(a));
}

/* -------------------------------------------------------------------------- */
/* Composer helpers                                                           */
/* -------------------------------------------------------------------------- */

/** Puts a message that failed to send back, ahead of anything typed since. */
export function restoreDraft(
  current: string,
  failed: string,
  separator = " ",
): string {
  return current.trim() ? `${failed}${separator}${current}` : failed;
}

/**
 * The server relays typing events with the sender's conversation id, which is
 * a different row from the recipient's own conversation with that person, so
 * the only reliable match is the person typing.
 */
export function isTypingFromParticipant(
  event: { fromUserId: IdLike },
  participantId: IdLike | null | undefined,
): boolean {
  return sameId(event.fromUserId, participantId);
}

// Mirrors server/utils/inbox-upload.ts so a bad file is refused before upload.
export const INBOX_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
export const INBOX_ATTACHMENT_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function validateAttachment(file: {
  type: string;
  size: number;
}): string | null {
  if (!INBOX_ATTACHMENT_TYPES.includes(file.type)) {
    return "Only JPEG, PNG, WebP or GIF images can be attached.";
  }
  if (file.size > INBOX_ATTACHMENT_MAX_BYTES) {
    return "That image is larger than 8 MB.";
  }
  return null;
}

/** A failure found before any request is made, e.g. a file the server would refuse. */
export function localFailure(message: string): InboxFailure {
  return fail("client", 0, message, false);
}

/** Sign-in link that returns to a same-site path; anything else falls back to /messages. */
export function buildSignInHref(returnTo: string): string {
  const safe =
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.includes("\\")
      ? returnTo
      : "/messages";
  return `/auth/signin?redirect=${encodeURIComponent(safe)}`;
}
