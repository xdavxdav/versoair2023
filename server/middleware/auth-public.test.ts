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
  // Stands in for the listening-sessions router: only the gate's decision is under test here.
  app.use("/api/listening-sessions", (_req, res) => res.json({ reached: true }));
  // Stands in for the business-logo router: only the gate's decision is under test here.
  app.use("/api/business-logo", (_req, res) => res.json({ reached: true }));
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
    // Listening sessions: only the read-only listener endpoints are public.
    for (const path of [
      "/api/listening-sessions",
      "/api/listening-sessions/",
      "/api/listening-sessions/42",
      "/api/listening-sessions/42/now-playing",
      "/api/listening-sessions/42/chat?afterId=5&limit=20",
    ]) {
      assert.equal((await fetch(`${origin}${path}`)).status, 200, `GET ${path} is public`);
    }
    for (const path of [
      "/api/listening-sessions/admin",
      "/api/listening-sessions/admin/status",
      "/api/listening-sessions/admin/list",
      "/api/listening-sessions/admin/tracks?q=a",
      "/api/listening-sessions/42/admin",
      "/api/listening-sessions/42/cancel",
      "/api/listening-sessions/abc",
      "/api/listening-sessions/42/now-playing/extra",
    ]) {
      assert.equal((await fetch(`${origin}${path}`)).status, 401, `GET ${path} is not public`);
    }
    for (const [method, path] of [
      ["POST", "/api/listening-sessions/admin"],
      ["PATCH", "/api/listening-sessions/admin/42"],
      ["POST", "/api/listening-sessions/admin/42/cancel"],
      ["POST", "/api/listening-sessions/42/chat"],
      ["DELETE", "/api/listening-sessions/42"],
    ]) {
      assert.equal(
        (await fetch(`${origin}${path}`, { method })).status,
        401,
        `${method} ${path} needs a session`,
      );
    }
    // Business logos: a visitor can load a stored logo by numeric id, nothing else.
    for (const path of [
      "/api/business-logo/file/7",
      "/api/business-logo/file/7?v=1700000000000",
    ]) {
      assert.equal((await fetch(`${origin}${path}`)).status, 200, `GET ${path} is public`);
    }
    for (const path of [
      "/api/business-logo/file/logo.png",
      "/api/business-logo/file/7/extra",
      "/api/business-logo/file/",
      "/api/business-logo/7",
    ]) {
      assert.equal((await fetch(`${origin}${path}`)).status, 401, `GET ${path} is not public`);
    }
    for (const [method, path] of [
      ["POST", "/api/business-logo/upload"],
      ["DELETE", "/api/business-logo/7"],
      ["POST", "/api/business-logo/file/7"],
    ]) {
      assert.equal(
        (await fetch(`${origin}${path}`, { method })).status,
        401,
        `${method} ${path} needs a session`,
      );
    }
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
