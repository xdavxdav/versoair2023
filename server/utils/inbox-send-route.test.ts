import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import test, { after } from "node:test";

process.env.DATABASE_URL ||= "postgres://x@127.0.0.1:1/x";
process.env.JWT_SECRET ||= "test-secret-test-secret-test-secret-1";

const inbox = (await import("../routes/inbox")).default;
const { pool } = await import("../db");

async function withServer(fn: (origin: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = {
      userId: 7,
      email: "sender@example.test",
      subscriptionTier: "free",
    };
    next();
  });
  app.use("/api/inbox", inbox);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
}

const send = (origin: string, body: unknown) =>
  fetch(`${origin}/api/inbox/conversations/3/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  });

// The database is unreachable here, so a 400 proves the key was rejected
// before anything was read or written.
test("a malformed message key is refused before the database is touched", async () => {
  await withServer(async (origin) => {
    for (const clientMessageId of [
      "",
      "short",
      "a".repeat(65),
      "has spaces in the key!!",
      12345678901234567890,
      true,
      {},
      ["3f2b8c1e-9a4d-4c57-8e0b-6d1f5a7c9e21"],
    ]) {
      const res = await send(origin, { content: "hello", clientMessageId });
      assert.equal(res.status, 400, JSON.stringify(clientMessageId));
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.error, /clientMessageId/);
    }
  });
});

test("the existing input checks still answer first", async () => {
  await withServer(async (origin) => {
    const empty = await send(origin, {
      clientMessageId: "3f2b8c1e-9a4d-4c57-8e0b-6d1f5a7c9e21",
    });
    assert.equal(empty.status, 400);
    assert.equal((await empty.json()).error, "Message content is required");

    const tooLong = await send(origin, {
      content: "x".repeat(10001),
      clientMessageId: "bad",
    });
    assert.equal(tooLong.status, 400);
    assert.equal((await tooLong.json()).error, "Message content is too long");
  });
});

test("a valid key, or none, goes on to the database exactly as before", async () => {
  await withServer(async (origin) => {
    for (const body of [
      { content: "hello" },
      { content: "hello", clientMessageId: null },
      { content: "hello", clientMessageId: "3f2b8c1e-9a4d-4c57-8e0b-6d1f5a7c9e21" },
    ]) {
      const res = await send(origin, body);
      assert.equal(res.status, 503, JSON.stringify(body));
      assert.deepEqual(await res.json(), {
        success: false,
        error: "Message could not be saved. Please try again.",
      });
    }
  });
});

after(async () => {
  await pool.end().catch(() => {});
  setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref();
});
