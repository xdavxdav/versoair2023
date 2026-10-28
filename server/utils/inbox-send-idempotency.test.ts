import test from "node:test";
import assert from "node:assert/strict";
import {
  CLIENT_MESSAGE_ID_PATTERN,
  IDEMPOTENCY_KEY_REUSED,
  normalizeSendPayload,
  parseClientMessageId,
  replyForStoredSend,
  sameSendPayload,
  sentReply,
} from "./inbox-send-idempotency";

const UUID = "3f2b8c1e-9a4d-4c57-8e0b-6d1f5a7c9e21";

test("a request without a key is a legacy send", () => {
  assert.deepEqual(parseClientMessageId(undefined), { ok: true, key: null });
  assert.deepEqual(parseClientMessageId(null), { ok: true, key: null });
});

test("accepts a UUID and other keys of 16 to 64 safe characters", () => {
  for (const key of [
    UUID,
    "a".repeat(16),
    "A".repeat(64),
    "msg_2026-10-25_abcdef0123456789",
    "0123456789abcdef",
  ]) {
    assert.deepEqual(parseClientMessageId(key), { ok: true, key }, key);
  }
});

test("rejects keys outside the allowed shape", () => {
  for (const key of [
    "",
    "a".repeat(15),
    "a".repeat(65),
    `${UUID} `,
    ` ${UUID}`,
    `${UUID}\n`,
    "has space in it 123456",
    "dots.are.not.allowed.1",
    "slash/not/allowed/12345",
    "caf\u00e9-caf\u00e9-caf\u00e9-caf\u00e9",
    "x".repeat(15) + "\u0000",
    "x".repeat(16) + "%",
  ]) {
    const result = parseClientMessageId(key);
    assert.equal(result.ok, false, JSON.stringify(key));
  }
});

test("rejects keys that are not strings", () => {
  for (const key of [
    123456789012345678,
    true,
    false,
    0,
    {},
    [],
    [UUID],
    { toString: () => UUID },
  ]) {
    assert.equal(parseClientMessageId(key).ok, false, JSON.stringify(key));
  }
});

test("the key pattern is anchored so partial matches do not pass", () => {
  assert.equal(CLIENT_MESSAGE_ID_PATTERN.test(`${UUID}!`), false);
  assert.equal(CLIENT_MESSAGE_ID_PATTERN.test(`!${UUID}`), false);
  assert.equal(CLIENT_MESSAGE_ID_PATTERN.test(UUID), true);
});

test("the payload is normalised the way the send route stores it", () => {
  assert.deepEqual(normalizeSendPayload("  hello  ", undefined), {
    content: "hello",
    attachmentUrl: null,
  });
  assert.deepEqual(
    normalizeSendPayload(undefined, " /api/inbox/attachments/7 "),
    { content: "", attachmentUrl: "/api/inbox/attachments/7" },
  );
  assert.deepEqual(normalizeSendPayload(42, 42), {
    content: "",
    attachmentUrl: null,
  });
});

test("the same text and attachment are the same payload", () => {
  const stored = { content: "hello", attachmentUrl: null };
  assert.equal(sameSendPayload(stored, normalizeSendPayload("hello", null)), true);
  assert.equal(sameSendPayload(stored, normalizeSendPayload(" hello\n", undefined)), true);

  const withImage = { content: "", attachmentUrl: "/api/inbox/attachments/7" };
  assert.equal(
    sameSendPayload(withImage, normalizeSendPayload("", "/api/inbox/attachments/7")),
    true,
  );
});

test("different text or a different attachment is a different payload", () => {
  const stored = { content: "hello", attachmentUrl: null };
  assert.equal(sameSendPayload(stored, normalizeSendPayload("hello!", null)), false);
  assert.equal(sameSendPayload(stored, normalizeSendPayload("Hello", null)), false);
  assert.equal(
    sameSendPayload(stored, normalizeSendPayload("hello", "/api/inbox/attachments/7")),
    false,
  );

  const withImage = { content: "look", attachmentUrl: "/api/inbox/attachments/7" };
  assert.equal(
    sameSendPayload(withImage, normalizeSendPayload("look", "/api/inbox/attachments/8")),
    false,
  );
  assert.equal(sameSendPayload(withImage, normalizeSendPayload("look", null)), false);
});

test("an empty stored attachment counts as no attachment", () => {
  assert.equal(
    sameSendPayload(
      { content: "hi", attachmentUrl: "" },
      normalizeSendPayload("hi", null),
    ),
    true,
  );
  assert.equal(
    sameSendPayload(
      { content: "hi", attachmentUrl: null },
      normalizeSendPayload("hi", "   "),
    ),
    true,
  );
});

test("text the database cannot hold verbatim still matches its stored form", () => {
  // A lone surrogate is stored as U+FFFD, so the original must still match it.
  const stored = { content: "tail \uFFFD", attachmentUrl: null };
  assert.equal(
    sameSendPayload(stored, normalizeSendPayload("tail \uD83D", null)),
    true,
  );
});

test("a fresh send answers exactly as it did before keys existed", () => {
  const message = { id: 5, content: "hello" };
  assert.deepEqual(sentReply(message), {
    status: 200,
    body: { success: true, message },
  });
  assert.equal("replayed" in sentReply(message).body, false);
});

test("a replay of the same payload returns the original row marked replayed", () => {
  const original = {
    id: 5,
    conversationId: 9,
    senderId: "11",
    content: "hello",
    attachmentUrl: null,
    clientMessageId: UUID,
  };
  const reply = replyForStoredSend(original, normalizeSendPayload("hello", null));
  assert.equal(reply.status, 200);
  assert.deepEqual(reply.body, { success: true, message: original, replayed: true });
  assert.strictEqual((reply.body as { message: unknown }).message, original);
});

test("the same key with a different payload is a conflict that stores nothing", () => {
  const original = {
    id: 5,
    content: "hello",
    attachmentUrl: null,
    clientMessageId: UUID,
  };
  const reply = replyForStoredSend(original, normalizeSendPayload("goodbye", null));
  assert.equal(reply.status, 409);
  assert.equal((reply.body as { success: boolean }).success, false);
  assert.equal((reply.body as { code: string }).code, IDEMPOTENCY_KEY_REUSED);
  assert.equal(IDEMPOTENCY_KEY_REUSED, "IDEMPOTENCY_KEY_REUSED");
  assert.equal(typeof (reply.body as { error: unknown }).error, "string");
  assert.equal("message" in reply.body, false);
  assert.equal(JSON.stringify(reply.body).includes("hello"), false);
});
