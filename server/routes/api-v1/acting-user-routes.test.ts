import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import test, { after } from "node:test";

process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
process.env.JWT_SECRET = "x".repeat(40);

const cards = (await import("./cards")).default;
const payments = (await import("./payments")).default;
const subscription = (await import("./subscription")).default;
const emailSubscriptions = (await import("./email-subscriptions")).default;
const settings = (await import("../settings")).default;
const purgatoire = (await import("../purgatoire")).default;
const contracts = (await import("../artist-contracts")).default;
const { pool } = await import("../../db");

const ROUTES: Array<{
  method: "GET" | "POST" | "PUT";
  path: string;
  body?: Record<string, unknown>;
}> = [
  { method: "POST", path: "/api/v1/cards/cardholder", body: { userId: 2 } },
  {
    method: "POST",
    path: "/api/v1/cards/issue",
    body: { userId: 2, cardholderId: "ich_foreign" },
  },
  {
    method: "POST",
    path: "/api/v1/cards/points/redeem",
    body: { userId: 2, rewardId: 1 },
  },
  {
    method: "POST",
    path: "/api/v1/payments/setup-intent",
    body: { userId: 2 },
  },
  {
    method: "POST",
    path: "/api/v1/payments/save-card",
    body: { userId: 2, paymentMethodId: "pm_foreign" },
  },
  {
    method: "POST",
    path: "/api/v1/subscription/downgrade",
    body: { userId: 2, targetTier: "free" },
  },
  {
    method: "GET",
    path: "/api/v1/subscription/feature-check?userId=2&feature=keywordTracking",
  },
  {
    method: "POST",
    path: "/api/v1/subscription/cancel-trial",
    body: { userId: 2 },
  },
  {
    method: "POST",
    path: "/api/v1/email-subscriptions/subscribe",
    body: { userId: 2, type: "business_updates" },
  },
  { method: "GET", path: "/api/v1/email-subscriptions/stats" },
  { method: "GET", path: "/api/purgatoire/queue" },
  { method: "GET", path: "/api/purgatoire/stats" },
  { method: "GET", path: "/api/settings/commerce" },
  {
    method: "POST",
    path: "/api/settings/commerce",
    body: { settings: { show_in_search: false } },
  },
  { method: "GET", path: "/api/contracts/status/someone@example.com" },
  { method: "GET", path: "/api/contracts/my-contract" },
  { method: "GET", path: "/api/contracts/admin/applications" },
  { method: "GET", path: "/api/contracts/admin/applications/1" },
  {
    method: "PUT",
    path: "/api/contracts/admin/review/1",
    body: { status: "approved", grade: "S" },
  },
  {
    method: "PUT",
    path: "/api/contracts/admin/upgrade/1",
    body: { grade: "S" },
  },
  { method: "GET", path: "/api/contracts/admin/stats" },
];

test("sensitive cards, payment-method, and subscription routes require authentication", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/cards", cards);
  app.use("/api/v1/payments", payments);
  app.use("/api/v1/subscription", subscription);
  app.use("/api/v1/email-subscriptions", emailSubscriptions);
  app.use("/api/settings", settings);
  app.use("/api/purgatoire", purgatoire);
  app.use("/api/contracts", contracts);

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    for (const route of ROUTES) {
      const response = await fetch(origin + route.path, {
        method: route.method,
        headers: { "Content-Type": "application/json" },
        body: route.body ? JSON.stringify(route.body) : undefined,
        signal: AbortSignal.timeout(3000),
      });
      assert.equal(
        response.status,
        401,
        `${route.method} ${route.path} must reject before touching Stripe or the database`,
      );
    }
  } finally {
    server.closeAllConnections?.();
    server.close();
    await pool.end().catch(() => {});
  }
});

after(() => {
  setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref();
});
