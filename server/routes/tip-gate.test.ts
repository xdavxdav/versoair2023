import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import test, { after } from "node:test";

process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.JWT_SECRET = "x".repeat(40);

const streamroyale = (await import("./streamroyale")).default;
const { pool } = await import("../db");

async function withServer(fn: (origin: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use("/api/streamroyale", streamroyale);
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

const tip = (origin: string) =>
  fetch(`${origin}/api/streamroyale/tip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "probe-key-123456",
    },
    body: JSON.stringify({ artistProfileId: 1, amount: 5 }),
    signal: AbortSignal.timeout(3000),
  });

test("tips are closed with 503 and no writes while online payments are off", async () => {
  delete process.env.ONLINE_PAYMENTS_ENABLED;
  await withServer(async (origin) => {
    const res = await tip(origin);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).code, "TIPS_UNAVAILABLE");
  });
});

test("tips require sign-in once online payments are on", async () => {
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
  try {
    await withServer(async (origin) => {
      assert.equal((await tip(origin)).status, 401);
    });
  } finally {
    delete process.env.ONLINE_PAYMENTS_ENABLED;
  }
});

after(async () => {
  await pool.end().catch(() => {});
  setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref();
});
