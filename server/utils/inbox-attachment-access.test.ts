import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  attachmentReadableBy,
  attachmentUploadedBy,
  inboxAttachmentUrl,
  legacyFileReadableBy,
  parseInboxAttachmentUrl,
} from "./inbox-attachment-access";

const dialect = new PgDialect();
type Condition = ReturnType<typeof sql>;
const compileForAttachments = (condition: Condition) =>
  dialect.sqlToQuery(sql`SELECT 1 FROM inbox_attachments WHERE ${condition}`);
const compileStandalone = (condition: Condition) =>
  dialect.sqlToQuery(sql`SELECT 1 WHERE ${condition}`);

test("only the canonical stored attachment URL parses", () => {
  assert.equal(parseInboxAttachmentUrl("/api/inbox/attachments/file/42"), 42);
  assert.equal(
    parseInboxAttachmentUrl(inboxAttachmentUrl(999999999)),
    999999999,
  );

  for (const rejected of [
    "",
    "42",
    "/api/inbox/attachments/file/",
    "/api/inbox/attachments/file/0",
    "/api/inbox/attachments/file/042",
    "/api/inbox/attachments/file/-1",
    "/api/inbox/attachments/file/1.5",
    "/api/inbox/attachments/file/1000000000",
    "/api/inbox/attachments/file/42?x=1",
    "/api/inbox/attachments/file/42#x",
    "/api/inbox/attachments/file/42/",
    "/api/inbox/attachments/file/42/../43",
    "/api/inbox/attachments/file/42\n",
    " /api/inbox/attachments/file/42",
    "/api/inbox/attachments/file/abc.png",
    "https://example.test/api/inbox/attachments/file/42",
    "//example.test/api/inbox/attachments/file/42",
  ]) {
    assert.equal(
      parseInboxAttachmentUrl(rejected),
      null,
      JSON.stringify(rejected),
    );
  }

  for (const notAString of [
    null,
    undefined,
    42,
    {},
    ["/api/inbox/attachments/file/42"],
  ]) {
    assert.equal(parseInboxAttachmentUrl(notAString), null);
  }
});

test("the read condition binds every value and matches the stored URL exactly", () => {
  const { sql: text, params } = compileForAttachments(
    attachmentReadableBy(7, 42),
  );

  assert.deepEqual(params, [
    42,
    7,
    7,
    "/api/inbox/attachments/file/42",
    "/api/inbox/attachments/file/42",
  ]);
  assert.match(text, /uploaded_by = \$\d/);
  assert.match(text, /attachment_url = \$\d/);
  assert.match(
    text,
    /m\.sender_id = COALESCE\(inbox_attachments\.uploaded_by::text/,
  );
  assert.doesNotMatch(text, /\bLIKE\b/i);
});

test("the attach condition needs the uploader and nothing else", () => {
  const { sql: text, params } = compileForAttachments(
    attachmentUploadedBy(7, 42),
  );

  assert.deepEqual(params, [42, 7]);
  assert.match(text, /uploaded_by = \$\d/);
  assert.doesNotMatch(text, /inbox_messages/);
});

test("a legacy file is granted by the exact URL in the user's own conversations", () => {
  const { sql: text, params } = compileStandalone(
    legacyFileReadableBy(7, "old-photo.png"),
  );

  assert.deepEqual(params, [
    7,
    "/api/inbox/attachments/file/old-photo.png",
    "/api/inbox/attachments/file/old-photo.png",
  ]);
  assert.match(text, /c\.user_id = \$\d/);
  assert.match(text, /m\.sender_id = \(/);
  assert.doesNotMatch(text, /\bLIKE\b/i);
});

// Runs the real conditions against PostgreSQL inside a rolled-back transaction.
// Only a local database is accepted, so it can never touch shared or production data.
const databaseUrl = process.env.INBOX_TEST_DATABASE_URL;
const isLocalDatabase =
  !!databaseUrl && /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);
const databaseTest = isLocalDatabase ? test : test.skip;

databaseTest(
  "attachments are readable by the uploader and message participants only",
  async () => {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query("BEGIN");
      const tag = `at${Date.now().toString(36)}`;
      const insertUser = async (suffix: string): Promise<number> => {
        const result = await client.query(
          "INSERT INTO users (username, email, password) VALUES ($1, $2, 'x') RETURNING id",
          [`${tag}_${suffix}`, `${tag}_${suffix}@example.test`],
        );
        return Number(result.rows[0].id);
      };
      const insertAttachment = async (
        uploadedBy: number | null,
      ): Promise<number> => {
        const result = await client.query(
          "INSERT INTO inbox_attachments (data, mime_type, uploaded_by) VALUES ($1, 'image/png', $2) RETURNING id",
          [Buffer.from("png"), uploadedBy],
        );
        return Number(result.rows[0].id);
      };
      const insertConversation = async (
        owner: number,
        other: number,
      ): Promise<number> => {
        const result = await client.query(
          "INSERT INTO inbox_conversations (user_id, type, participant_id, participant_name) VALUES ($1, 'business_network', $2, 'x') RETURNING id",
          [owner, String(other)],
        );
        return Number(result.rows[0].id);
      };
      const insertMessage = (
        conversationId: number,
        senderId: number,
        attachmentUrl: string,
      ) =>
        client.query(
          "INSERT INTO inbox_messages (conversation_id, sender_id, sender_name, content, attachment_url) VALUES ($1, $2, 'x', 'hi', $3)",
          [conversationId, String(senderId), attachmentUrl],
        );
      const matches = async (compiled: { sql: string; params: unknown[] }) =>
        (await client.query(compiled.sql, compiled.params)).rowCount === 1;
      const canRead = (userId: number, attachmentId: number) =>
        matches(
          compileForAttachments(attachmentReadableBy(userId, attachmentId)),
        );
      const canAttach = (userId: number, attachmentId: number) =>
        matches(
          compileForAttachments(attachmentUploadedBy(userId, attachmentId)),
        );
      const canReadLegacyFile = (userId: number, filename: string) =>
        matches(compileStandalone(legacyFileReadableBy(userId, filename)));

      const alice = await insertUser("alice");
      const bob = await insertUser("bob");
      const carol = await insertUser("carol");
      const aliceThread = await insertConversation(alice, bob);
      const bobThread = await insertConversation(bob, alice);
      const carolThread = await insertConversation(carol, alice);

      const sent = await insertAttachment(alice);
      const unsent = await insertAttachment(alice);
      const legacy = await insertAttachment(null);
      for (const attachmentId of [sent, legacy]) {
        await insertMessage(
          aliceThread,
          alice,
          inboxAttachmentUrl(attachmentId),
        );
        await insertMessage(bobThread, alice, inboxAttachmentUrl(attachmentId));
      }

      // A sent attachment: the sender and recipient read it, an outsider does not.
      assert.equal(await canRead(alice, sent), true);
      assert.equal(await canRead(bob, sent), true);
      assert.equal(await canRead(carol, sent), false);

      // An attachment that was never sent stays private to its uploader.
      assert.equal(await canRead(alice, unsent), true);
      assert.equal(await canRead(bob, unsent), false);
      assert.equal(await canRead(carol, unsent), false);

      // Uploads from before the uploader was recorded are reachable through
      // messages only, and nobody can attach them to a new message.
      assert.equal(await canRead(alice, legacy), true);
      assert.equal(await canRead(bob, legacy), true);
      assert.equal(await canRead(carol, legacy), false);
      assert.equal(await canAttach(alice, legacy), false);

      // Only the uploader may attach it, so a recipient or outsider cannot
      // re-post it into their own conversation and become a participant.
      assert.equal(await canAttach(alice, sent), true);
      assert.equal(await canAttach(bob, sent), false);
      assert.equal(await canAttach(carol, sent), false);

      // A message pointing near, but not exactly at, the URL grants nothing.
      for (const nearMiss of [
        `${inboxAttachmentUrl(sent)}0`,
        `${inboxAttachmentUrl(sent)}?x=1`,
        `${inboxAttachmentUrl(sent)}/`,
      ]) {
        await insertMessage(carolThread, carol, nearMiss);
      }
      assert.equal(await canRead(carol, sent), false);

      // A message written by someone who does not own the file grants nothing,
      // even if an older server accepted it into their own conversation.
      for (const attachmentId of [sent, legacy]) {
        await insertMessage(
          carolThread,
          carol,
          inboxAttachmentUrl(attachmentId),
        );
      }
      assert.equal(await canRead(carol, sent), false);
      assert.equal(await canRead(carol, legacy), false);
      assert.equal(await canRead(bob, sent), true);
      assert.equal(await canRead(bob, legacy), true);

      // Legacy disk files follow the same rules.
      const legacyUrl = "/api/inbox/attachments/file/old-photo.png";
      await insertMessage(aliceThread, alice, legacyUrl);
      await insertMessage(bobThread, alice, legacyUrl);
      await insertMessage(carolThread, carol, legacyUrl);
      assert.equal(await canReadLegacyFile(alice, "old-photo.png"), true);
      assert.equal(await canReadLegacyFile(bob, "old-photo.png"), true);
      assert.equal(await canReadLegacyFile(carol, "old-photo.png"), false);
      assert.equal(await canReadLegacyFile(bob, "old-photo.png.bak"), false);
    } finally {
      await client.query("ROLLBACK").catch(() => {});
      await client.end();
    }
  },
);
