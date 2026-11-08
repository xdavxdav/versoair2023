import assert from "node:assert/strict";
import test from "node:test";
import {
  hideEmailLike,
  resolveAuthorName,
  safePublicName,
  toPublicPost,
} from "./public-author-name";

test("safePublicName returns the first usable candidate", () => {
  assert.equal(safePublicName(["Luq", "luq_handle"], "Listener"), "Luq");
  assert.equal(safePublicName([null, undefined, "  Ama  "], "Listener"), "Ama");
});

test("safePublicName collapses inner whitespace", () => {
  assert.equal(safePublicName(["  Ama \n  K  "], "Listener"), "Ama K");
});

test("safePublicName never returns anything containing @", () => {
  assert.equal(safePublicName(["someone@example.com"], "Listener"), "Listener");
  assert.equal(safePublicName(["@handle"], "Listener"), "Listener");
  assert.equal(
    safePublicName(["someone@example.com", "someone"], "Listener"),
    "someone",
  );
});

test("safePublicName skips blanks, non-strings and over-long names", () => {
  assert.equal(safePublicName(["", "   ", 42, {}, null], "Anonymous"), "Anonymous");
  const longName = "x".repeat(61);
  assert.equal(safePublicName([longName], "Anonymous"), "Anonymous");
  assert.equal(safePublicName(["x".repeat(60)], "Anonymous"), "x".repeat(60));
  assert.equal(safePublicName([], "Anonymous"), "Anonymous");
});

test("hideEmailLike blanks only strings that contain @", () => {
  assert.equal(hideEmailLike("a@b.co"), null);
  assert.equal(hideEmailLike("Luq"), "Luq");
  assert.equal(hideEmailLike(null), null);
  assert.equal(hideEmailLike(undefined), undefined);
  assert.equal(hideEmailLike(7), 7);
});

test("resolveAuthorName prefers the display name, then the username", async () => {
  const seen: Array<{ text: string; values?: unknown[] }> = [];
  const db = {
    async query(text: string, values?: unknown[]) {
      seen.push({ text, values });
      return { rows: [{ display_name: "Ama K", username: "ama" }] };
    },
  };
  assert.equal(await resolveAuthorName(db, "12"), "Ama K");
  assert.deepEqual(seen.map((s) => s.values), [["12"]]);
  assert.match(seen[0].text, /FROM users WHERE id = \$1/);
  assert.doesNotMatch(seen[0].text, /email/i);
});

test("resolveAuthorName falls back to the username, then Anonymous", async () => {
  const withRow = (row: Record<string, unknown> | undefined) => ({
    async query() {
      return { rows: row ? [row] : [] };
    },
  });
  assert.equal(
    await resolveAuthorName(withRow({ display_name: null, username: "ama" }), 1),
    "ama",
  );
  assert.equal(
    await resolveAuthorName(withRow({ display_name: "", username: "" }), 1),
    "Anonymous",
  );
  assert.equal(await resolveAuthorName(withRow(undefined), 1), "Anonymous");
});

test("resolveAuthorName never returns an email even if the account holds one", async () => {
  const db = {
    async query() {
      return {
        rows: [{ display_name: "ama@example.com", username: "ama@example.com" }],
      };
    },
  };
  assert.equal(await resolveAuthorName(db, 1), "Anonymous");
});

test("toPublicPost blanks email-like names and keeps everything else", () => {
  const post = {
    id: 5,
    content: "hello",
    user_id: 9,
    author_avatar: null,
    created_at: "2026-11-07T12:00:00.000Z",
    author_name: "legacy@example.com",
    username: "ama",
    display_name: "ama@example.com",
  };
  assert.deepEqual(toPublicPost(post), {
    ...post,
    author_name: null,
    username: "ama",
    display_name: null,
  });
  assert.equal(post.author_name, "legacy@example.com", "input is not mutated");
});

test("toPublicPost keeps clean names untouched", () => {
  const post = {
    id: 1,
    author_name: "Ama K",
    username: "ama",
    display_name: "Ama K",
  };
  assert.deepEqual(toPublicPost(post), post);
});
