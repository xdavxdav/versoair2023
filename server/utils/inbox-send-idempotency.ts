/**
 * Idempotent message sends.
 *
 * The client puts one UUID on every send attempt (`clientMessageId`). The
 * server keeps it on the sender's own copy of the message, so a retry of a send
 * whose response was lost gets the stored message back instead of a second
 * copy. Everything here is pure; the send route does the database work.
 */

export const CLIENT_MESSAGE_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
export const IDEMPOTENCY_KEY_REUSED = "IDEMPOTENCY_KEY_REUSED";

const KEY_REUSED_MESSAGE =
  "This message could not be confirmed against an earlier attempt. Please send it again.";

export type ClientMessageIdCheck =
  | { ok: true; key: string | null }
  | { ok: false; message: string };

/** A missing key is a legacy send; a key that is present must have the right shape. */
export function parseClientMessageId(value: unknown): ClientMessageIdCheck {
  if (value === undefined || value === null) return { ok: true, key: null };
  if (typeof value !== "string" || !CLIENT_MESSAGE_ID_PATTERN.test(value)) {
    return {
      ok: false,
      message: "clientMessageId must be 16 to 64 letters, digits, - or _",
    };
  }
  return { ok: true, key: value };
}

export type SendPayload = { content: string; attachmentUrl: string | null };

/** What the route stores: trimmed text and a trimmed attachment url (or null). */
export function normalizeSendPayload(
  content: unknown,
  attachmentUrl: unknown,
): SendPayload {
  return {
    content: typeof content === "string" ? content.trim() : "",
    attachmentUrl:
      typeof attachmentUrl === "string" ? attachmentUrl.trim() : null,
  };
}

// Postgres keeps UTF-8, so a lone surrogate comes back as U+FFFD.
const asStored = (text: string) => Buffer.from(text, "utf8").toString("utf8");

export type StoredSend = {
  content: string | null;
  attachmentUrl: string | null;
};

export function sameSendPayload(
  stored: StoredSend,
  incoming: SendPayload,
): boolean {
  return (
    asStored(stored.content ?? "") === asStored(incoming.content) &&
    (stored.attachmentUrl || null) ===
      (asStored(incoming.attachmentUrl ?? "") || null)
  );
}

export type SendReply = { status: number; body: Record<string, unknown> };

/** A new send, or a send without a key: the same answer as before keys existed. */
export function sentReply(message: unknown): SendReply {
  return { status: 200, body: { success: true, message } };
}

/**
 * The answer for a key that already has a stored message. The same payload is
 * a replay and returns the original row; a different payload is a conflict,
 * and nothing is stored either way.
 */
export function replyForStoredSend(
  stored: StoredSend,
  incoming: SendPayload,
): SendReply {
  if (sameSendPayload(stored, incoming)) {
    return {
      status: 200,
      body: { success: true, message: stored, replayed: true },
    };
  }
  return {
    status: 409,
    body: {
      success: false,
      error: KEY_REUSED_MESSAGE,
      code: IDEMPOTENCY_KEY_REUSED,
    },
  };
}
