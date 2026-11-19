import assert from "node:assert/strict";
import { once } from "node:events";
import test, { after } from "node:test";
import Stripe from "stripe";

const originalEnv = new Map(
  [
    "DATABASE_URL",
    "JWT_SECRET",
    "SESSION_SECRET",
    "NODE_ENV",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ].map((key) => [key, process.env[key]]),
);

process.env.DATABASE_URL =
  "postgresql://test:test@127.0.0.1:1/payments_webhook_integration";
process.env.JWT_SECRET = "local-webhook-integration-test-secret";
process.env.SESSION_SECRET = "local-webhook-integration-session-secret";
process.env.NODE_ENV = "test";
process.env.STRIPE_SECRET_KEY = `sk_test_${"x".repeat(24)}`;
const webhookSecret = `whsec_${"s".repeat(32)}`;
process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

const { app } = await import("../../index");
const paymentsRouter = (await import("./payments")).default;
const { pool } = await import("../../db");
app.use("/api/v1/payments", paymentsRouter);

after(async () => {
  await pool.end();
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("signed webhook traverses index raw-body parsing and the unauthenticated webhook allowlist", async () => {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");

    const payload = JSON.stringify({
      id: "evt_index_stack_test",
      object: "event",
      type: "product.created",
      data: { object: { id: "prod_index_stack_test", object: "product" } },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/payments/webhook`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "stripe-signature": signature,
        },
        body: payload,
        signal: AbortSignal.timeout(3000),
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
