import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import music from "../routes/music";
import translations from "../routes/translations";

test("anonymous public reads work through the global auth gate without exposing protected routes", async () => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  const { globalAuthGate } = await import("./auth");
  const { pool } = await import("../db");
  const app = express();
  app.use(globalAuthGate);
  app.use("/api/translations", translations);
  app.use("/api/music", music);
  app.get("/auth/oauth/providers", (_req, res) => res.json({ providers: [] }));
  app.get("/api/page-readiness", (_req, res) =>
    res.json({ blockedPaths: ["/get-involved"] }),
  );
  app.get("/api/page-readiness/admin", (_req, res) =>
    res.json({ eligiblePaths: ["/get-involved"] }),
  );
  app.post("/api/page-readiness", (_req, res) => res.sendStatus(204));
  app.post("/auth/verify-login-otp", (_req, res) =>
    res.status(400).json({ success: false, message: "Missing code or token" }),
  );
  app.use((_req, res) => res.sendStatus(404));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${origin}/api/translations/en`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).language, "en");
    assert.equal((await fetch(`${origin}/api/translations/not-a-language`)).status, 400);
    assert.equal((await fetch(`${origin}/api/translations/en?text=private`)).status, 400);
    assert.equal((await fetch(`${origin}/api/music/analytics`)).status, 401);
    assert.equal((await fetch(`${origin}/auth/oauth/providers`)).status, 200);
    const pageReadiness = await fetch(`${origin}/api/page-readiness`);
    assert.equal(pageReadiness.status, 200);
    assert.deepEqual(await pageReadiness.json(), { blockedPaths: ["/get-involved"] });
    assert.equal((await fetch(`${origin}/api/page-readiness/admin`)).status, 401);
    assert.equal(
      (await fetch(`${origin}/api/page-readiness`, { method: "POST" })).status,
      401,
    );
    assert.equal((await fetch(`${origin}/api/translations/en`, { method: "POST" })).status, 401);
    assert.equal((await fetch(`${origin}/auth/oauth/providers`, { method: "POST" })).status, 404);
    assert.equal((await fetch(`${origin}/api/v1/admin/users`)).status, 401);
    // OTP completion happens before any session exists, so the gate must let the route answer
    const otpVerification = await fetch(`${origin}/auth/verify-login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(otpVerification.status, 400);
    assert.equal((await otpVerification.json()).message, "Missing code or token");
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  }
});
