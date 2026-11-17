import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { raisePaymentAlert } from "./payment-alerts";

function silence() {
  const errors: string[] = [];
  const warnings: string[] = [];
  mock.method(console, "error", (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });
  mock.method(console, "warn", (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  });
  return { errors, warnings };
}

test("logs the alert first, then emails the admin with escaped, redacted details", async () => {
  const { errors } = silence();
  const sent: { to: string; subject: string; html: string }[] = [];

  await raisePaymentAlert(
    {
      kind: "ngo_charge_not_recorded",
      summary: "Charge pi_1 was not recorded <b>",
      details: {
        paymentIntentId: "pi_1",
        note: "<script>alert(1)</script> sk_live_abcdef1234567890",
        skipped: undefined,
        alsoSkipped: null,
        cardId: 5,
      },
    },
    {
      recipient: () => "owner@example.com",
      send: async (to, subject, html) => {
        sent.push({ to, subject, html });
        return true;
      },
    },
  );

  assert.equal(errors.length, 1);
  assert.match(errors[0], /^\[PAYMENT-ALERT\] ngo_charge_not_recorded: /);
  assert.doesNotMatch(errors[0], /sk_live_abcdef/);
  assert.match(errors[0], /"cardId":"5"/);
  assert.doesNotMatch(errors[0], /skipped/i);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "owner@example.com");
  assert.match(sent[0].subject, /Payment needs attention: ngo_charge_not_recorded/);
  assert.match(sent[0].html, /pi_1/);
  assert.doesNotMatch(sent[0].html, /<script>/);
  assert.match(sent[0].html, /&lt;script&gt;/);
  assert.doesNotMatch(sent[0].html, /sk_live_abcdef/);
  assert.match(sent[0].html, /Charge pi_1 was not recorded &lt;b&gt;/);
});

test("with no admin email configured the alert is logged only", async () => {
  const { errors, warnings } = silence();
  let called = false;

  await raisePaymentAlert(
    { kind: "k", summary: "s" },
    {
      recipient: () => "",
      send: async () => {
        called = true;
        return true;
      },
    },
  );

  assert.equal(called, false);
  assert.equal(errors.length, 1);
  assert.match(warnings.join("\n"), /logged only/);
});

test("a failing or throwing mail transport never escapes", async () => {
  const { errors, warnings } = silence();

  await raisePaymentAlert(
    { kind: "k", summary: "s" },
    { recipient: () => "owner@example.com", send: async () => false },
  );
  assert.match(warnings.join("\n"), /could not be sent/);

  await raisePaymentAlert(
    { kind: "k", summary: "s" },
    {
      recipient: () => "owner@example.com",
      send: async () => {
        throw new Error("SMTP down for sk_test_abc123DEF456");
      },
    },
  );
  const joined = errors.join("\n");
  assert.match(joined, /Could not send the alert email/);
  assert.doesNotMatch(joined, /sk_test_abc123/);
});

test("a throwing recipient lookup never escapes", async () => {
  silence();
  await raisePaymentAlert(
    { kind: "k", summary: "s" },
    {
      recipient: () => {
        throw new Error("boom");
      },
    },
  );
});
