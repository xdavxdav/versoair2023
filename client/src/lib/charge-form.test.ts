import assert from "node:assert/strict";
import test from "node:test";
import {
  isZeroDecimalCurrency,
  parseChargeAmount,
  SUPPORTED_CHARGE_CURRENCIES,
} from "../../../server/utils/stripe-amount";
import {
  CHARGE_CURRENCIES,
  amountInputProps,
  attemptFor,
  checkChargeAmount,
  formatMoney,
  interpretChargeResponse,
  interpretRefundResponse,
  isWholeUnitCurrency,
  newIdempotencyKey,
  quickAmountsFor,
  type ChargeRequest,
} from "./charge-form";

const SERVER_KEY_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

// ─── Parity with the server ───────────────────────────────────────────────────

test("offers exactly the currencies the server accepts", () => {
  assert.deepEqual(
    CHARGE_CURRENCIES.map((c) => c.code).sort(),
    [...SUPPORTED_CHARGE_CURRENCIES].sort(),
  );
});

test("whole-unit currencies match the server's zero-decimal list", () => {
  for (const { code } of CHARGE_CURRENCIES) {
    assert.equal(
      isWholeUnitCurrency(code),
      isZeroDecimalCurrency(code),
      code,
    );
  }
});

test("accepts and rejects the same amounts as the server", () => {
  const amounts = [
    "",
    " ",
    "0",
    "0.00",
    "0.001",
    "0.005",
    "0.50",
    "1",
    "1.",
    ".5",
    "5",
    "05",
    "25.5",
    "25.50",
    "25.500",
    "25.505",
    "19.99",
    "5000",
    "5000.00",
    "5000.5",
    "1e3",
    "-5",
    "+5",
    "abc",
    "1,000",
    "999999.99",
    "1000000",
    "999999999999999",
    "9999999999999999",
    " 12.30 ",
  ];
  for (const { code } of CHARGE_CURRENCIES) {
    for (const amount of amounts) {
      assert.equal(
        checkChargeAmount(amount, code).ok,
        parseChargeAmount(amount, code).ok,
        `${code} ${JSON.stringify(amount)}`,
      );
    }
  }
  assert.equal(checkChargeAmount("5", "JPY").ok, false);
  assert.equal(parseChargeAmount("5", "JPY").ok, false);
});

test("the minor units it reports match the server's", () => {
  for (const [amount, code] of [
    ["19.99", "USD"],
    ["25", "EUR"],
    ["0.50", "CAD"],
    ["5000", "XOF"],
    ["120000", "XAF"],
  ] as const) {
    const mine = checkChargeAmount(amount, code);
    const theirs = parseChargeAmount(amount, code);
    assert.ok(mine.ok && theirs.ok, `${code} ${amount}`);
    if (mine.ok && theirs.ok) {
      assert.equal(mine.minorUnits, theirs.minorUnits);
    }
  }
});

// ─── Amounts ──────────────────────────────────────────────────────────────────

test("an accepted amount is sent exactly as typed, trimmed", () => {
  const result = checkChargeAmount("  19.99 ", "usd");
  assert.deepEqual(result, { ok: true, amount: "19.99", minorUnits: 1999 });
});

test("francs are whole numbers and are not scaled by 100", () => {
  assert.deepEqual(checkChargeAmount("5000", "XOF"), {
    ok: true,
    amount: "5000",
    minorUnits: 5000,
  });
  assert.deepEqual(checkChargeAmount("5000.00", "XAF"), {
    ok: true,
    amount: "5000.00",
    minorUnits: 5000,
  });
  const decimals = checkChargeAmount("5000.50", "XOF");
  assert.equal(decimals.ok, false);
  if (!decimals.ok) assert.match(decimals.error, /whole numbers/);
});

test("rejects a third decimal place, zero, junk and oversize amounts", () => {
  const cases: Array<[string, RegExp]> = [
    ["25.505", /2 decimal places/],
    ["0", /greater than zero/],
    ["0.00", /greater than zero/],
    ["abc", /plain number/],
    ["", /plain number/],
    ["1000000", /maximum/],
    ["9999999999999999", /plain number/],
  ];
  for (const [text, expected] of cases) {
    const result = checkChargeAmount(text, "USD");
    assert.equal(result.ok, false, text);
    if (!result.ok) assert.match(result.error, expected, text);
  }
  assert.equal(checkChargeAmount("999999.99", "USD").ok, true);
});

test("a trailing zero past the second decimal is still the same amount", () => {
  assert.equal(checkChargeAmount("25.500", "USD").ok, true);
});

test("input hints follow the currency", () => {
  assert.deepEqual(amountInputProps("USD"), {
    step: "0.01",
    min: "0.50",
    placeholder: "0.00",
  });
  assert.deepEqual(amountInputProps("xof"), {
    step: "1",
    min: "1",
    placeholder: "0",
  });
});

test("quick amounts are meaningful in the selected currency", () => {
  assert.deepEqual(quickAmountsFor("USD"), [5, 10, 20, 25, 50, 100, 200, 500]);
  assert.deepEqual(
    quickAmountsFor("XOF"),
    [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000],
  );
  for (const { code } of CHARGE_CURRENCIES) {
    for (const amount of quickAmountsFor(code)) {
      assert.equal(checkChargeAmount(String(amount), code).ok, true, code);
    }
  }
});

test("money always names its currency and never assumes dollars", () => {
  assert.equal(formatMoney("25", "USD", "en-US"), "USD 25.00");
  assert.equal(formatMoney("19.9", "cad", "en-US"), "CAD 19.90");
  assert.equal(formatMoney("1234.5", "EUR", "en-US"), "EUR 1,234.50");
  assert.equal(formatMoney("5000.00", "XOF", "en-US"), "XOF 5,000");
  assert.equal(formatMoney(120000, "XAF", "en-US"), "XAF 120,000");
  for (const value of [
    formatMoney("25", "USD", "en-US"),
    formatMoney("5000", "XOF", "en-US"),
  ]) {
    assert.ok(!value.includes("$"));
  }
});

test("money that cannot be read is shown as it came, not as zero", () => {
  assert.equal(formatMoney("abc", "USD"), "USD abc");
  assert.equal(formatMoney("", "USD"), "USD");
  assert.equal(formatMoney(null, "usd"), "USD");
  assert.equal(formatMoney(undefined, "USD"), "USD");
  assert.equal(formatMoney(Number.NaN, "USD"), "USD NaN");
});

// ─── Idempotency keys and attempts ────────────────────────────────────────────

const request: ChargeRequest = {
  cardId: 7,
  amount: "25.00",
  currency: "USD",
  description: "Monthly fee",
  category: "admin_charge",
};

test("generated keys satisfy the server's pattern and differ every time", () => {
  const keys = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const key = newIdempotencyKey();
    assert.match(key, SERVER_KEY_PATTERN);
    keys.add(key);
  }
  assert.equal(keys.size, 50);
});

test("keys are still valid where crypto.randomUUID is unavailable", () => {
  const keys = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const key = newIdempotencyKey({});
    assert.match(key, SERVER_KEY_PATTERN);
    keys.add(key);
  }
  assert.equal(keys.size, 20);
  assert.match(newIdempotencyKey(undefined), SERVER_KEY_PATTERN);
});

test("an unresolved attempt is retried with its own key and request", () => {
  let count = 0;
  const makeKey = () => `key-${++count}`;
  const first = attemptFor(null, request, makeKey);
  assert.equal(first.key, "key-1");

  const again = attemptFor(first, { ...request }, makeKey);
  assert.equal(again, first);
  assert.equal(count, 1);
});

test("the same amount written differently is still the same charge", () => {
  let count = 0;
  const makeKey = () => `key-${++count}`;
  const first = attemptFor(null, request, makeKey);
  for (const amount of ["25", "25.0", "025.00", " 25.00 "]) {
    const retry = attemptFor(first, { ...request, amount }, makeKey);
    assert.equal(retry.key, first.key, amount);
    assert.equal(retry.request.amount, "25.00");
  }
  assert.equal(count, 1);
});

test("editing the description does not change the key or the request sent", () => {
  const first = attemptFor(null, request, () => "key-1");
  const retry = attemptFor(
    first,
    { ...request, description: "Corrected wording", category: "donation" },
    () => "key-2",
  );
  assert.equal(retry.key, "key-1");
  assert.equal(retry.request.description, "Monthly fee");
  assert.equal(retry.request.category, "admin_charge");
});

test("a different card, amount or currency starts a new attempt", () => {
  const first = attemptFor(null, request, () => "key-1");
  const changes: Array<Partial<ChargeRequest>> = [
    { cardId: 8 },
    { amount: "25.01" },
    { amount: "250.00" },
    { currency: "EUR" },
  ];
  for (const change of changes) {
    const next = attemptFor(first, { ...request, ...change }, () => "key-2");
    assert.equal(next.key, "key-2", JSON.stringify(change));
    assert.notEqual(next, first);
  }
});

test("currency case does not make a new attempt", () => {
  const first = attemptFor(null, request, () => "key-1");
  const retry = attemptFor(first, { ...request, currency: "usd" }, () => "key-2");
  assert.equal(retry, first);
});

// ─── Charge replies ───────────────────────────────────────────────────────────

test("a recorded charge is a success and releases the attempt", () => {
  const outcome = interpretChargeResponse(200, {
    success: true,
    data: {
      charge: { id: "c1" },
      paymentIntent: { id: "pi_123", status: "succeeded" },
      replayed: false,
    },
  });
  assert.deepEqual(outcome, {
    ok: true,
    keepAttempt: false,
    replayed: false,
    paymentIntentId: "pi_123",
    message: "",
  });
});

test("a replayed charge is reported as already processed", () => {
  const outcome = interpretChargeResponse(200, {
    success: true,
    data: { paymentIntent: { id: "pi_9" }, replayed: true },
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.replayed, true);
  assert.equal(outcome.keepAttempt, false);
});

test("a declined card is final: the next try is a new attempt", () => {
  const outcome = interpretChargeResponse(402, {
    success: false,
    error: "Card declined: Your card has insufficient funds.",
    code: "card_declined",
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.keepAttempt, false);
  assert.equal(outcome.message, "Card declined: Your card has insufficient funds.");
});

test("validation and permission failures are final", () => {
  for (const [status, code] of [
    [400, "INVALID_AMOUNT"],
    [400, "INVALID_CURRENCY"],
    [400, "INVALID_IDEMPOTENCY_KEY"],
    [401, undefined],
    [403, undefined],
    [404, undefined],
    [402, "authentication_required"],
  ] as const) {
    const outcome = interpretChargeResponse(status, {
      success: false,
      error: "Nope",
      code,
    });
    assert.equal(outcome.ok, false, `${status} ${code}`);
    assert.equal(outcome.keepAttempt, false, `${status} ${code}`);
    assert.equal(outcome.message, "Nope");
  }
  assert.equal(interpretChargeResponse(400, {}).message, "Charge failed");
});

test("when it is not known whether the card was charged, the attempt is kept", () => {
  const unknown: Array<[number | null, unknown]> = [
    [null, null],
    [500, { success: false, error: "Something broke" }],
    [502, { success: false, error: "Bad gateway", code: "STRIPE_CONNECTION_ERROR" }],
    [502, null],
    [503, "<html>Service unavailable</html>"],
    [504, undefined],
    [409, { success: false, error: "in progress", code: "IDEMPOTENCY_CONFLICT" }],
    [200, { unexpected: true }],
    [200, null],
  ];
  for (const [status, body] of unknown) {
    const outcome = interpretChargeResponse(status, body);
    assert.equal(outcome.ok, false, String(status));
    assert.equal(outcome.keepAttempt, true, `${status} ${JSON.stringify(body)}`);
    assert.ok(outcome.message.length > 0);
  }
});

test("a lost connection tells staff to retry, not that nothing happened", () => {
  const { message } = interpretChargeResponse(null, null);
  assert.match(message, /can't tell whether the card was charged/);
  assert.match(message, /will not be charged twice/);
  assert.doesNotMatch(message, /not charged\b(?! twice)/);
});

test("a charge that reached Stripe but was not saved quotes the reference", () => {
  const outcome = interpretChargeResponse(500, {
    success: false,
    error:
      "The card was charged but the charge could not be recorded. Retry the same request to record it without charging again.",
    code: "CHARGE_NOT_RECORDED",
    paymentIntentId: "pi_abc",
  });
  assert.equal(outcome.keepAttempt, true);
  assert.match(outcome.message, /was charged but the charge could not be recorded/);
  assert.match(outcome.message, /Payment reference: pi_abc\./);
});

test("a charge that is still in flight says to wait, not that it failed", () => {
  const outcome = interpretChargeResponse(409, {
    success: false,
    error: "already in progress or used with different details",
    code: "IDEMPOTENCY_CONFLICT",
  });
  assert.equal(outcome.keepAttempt, true);
  assert.match(outcome.message, /still being processed/);
});

test("charging switched off means nothing was sent, so the attempt is released", () => {
  const outcome = interpretChargeResponse(503, {
    success: false,
    error: "Online payments are not available. Contact the team to confirm current options.",
    code: "ONLINE_PAYMENTS_UNAVAILABLE",
  });
  assert.equal(outcome.keepAttempt, false);
  assert.match(outcome.message, /Online payments are not available/);
  assert.doesNotMatch(outcome.message, /Press Charge again/);
});

test("server errors add the retry advice, connection errors keep the server's own", () => {
  const serverError = interpretChargeResponse(500, {
    success: false,
    error: "Boom",
  });
  assert.match(serverError.message, /^Boom /);
  assert.match(serverError.message, /Press Charge again/);

  const connection = interpretChargeResponse(502, {
    success: false,
    error: "Could not reach Stripe. Retry the same request; it will not be charged twice.",
    code: "STRIPE_CONNECTION_ERROR",
  });
  assert.equal(
    connection.message,
    "Could not reach Stripe. Retry the same request; it will not be charged twice.",
  );
});

test("a gateway page with no JSON is reported with its status", () => {
  const outcome = interpretChargeResponse(502, null);
  assert.match(outcome.message, /HTTP 502/);
  assert.equal(outcome.keepAttempt, true);
});

// ─── Refund replies ───────────────────────────────────────────────────────────

test("a refund that is recorded is a success", () => {
  assert.deepEqual(
    interpretRefundResponse(200, {
      success: true,
      data: { refundId: "re_1", status: "succeeded", amount: "25.00" },
    }),
    { ok: true, alreadyRefunded: false, message: "" },
  );
});

test("an already refunded charge is not an error to retry", () => {
  const outcome = interpretRefundResponse(400, {
    success: false,
    error: "Charge already refunded",
    code: "ALREADY_REFUNDED",
  });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.alreadyRefunded, true);
  assert.match(outcome.message, /already been refunded/);
});

test("a refund issued but not saved quotes the reference and says retry is safe", () => {
  const outcome = interpretRefundResponse(500, {
    success: false,
    error:
      "The refund was issued but could not be recorded. Retry the refund to record it; it will not be issued twice.",
    code: "REFUND_NOT_RECORDED",
    refundId: "re_77",
  });
  assert.equal(outcome.ok, false);
  assert.match(outcome.message, /Refund reference: re_77\./);
  assert.match(outcome.message, /will not be issued twice/);
});

test("refund failures with no certain outcome say a retry is safe", () => {
  for (const [status, body] of [
    [null, null],
    [500, { success: false, error: "Boom" }],
    [503, null],
  ] as const) {
    const outcome = interpretRefundResponse(status, body);
    assert.equal(outcome.ok, false);
    assert.equal(outcome.alreadyRefunded, false);
    assert.match(outcome.message, /never be issued twice|will not be issued twice/);
  }
  const connection = interpretRefundResponse(502, {
    success: false,
    error: "Could not reach Stripe. Retry the refund; it will not be issued twice.",
    code: "STRIPE_CONNECTION_ERROR",
  });
  assert.equal(
    connection.message,
    "Could not reach Stripe. Retry the refund; it will not be issued twice.",
  );
});

test("a refund already in progress says to wait", () => {
  const outcome = interpretRefundResponse(409, {
    success: false,
    error: "A refund for this charge is already in progress",
    code: "IDEMPOTENCY_CONFLICT",
  });
  assert.match(outcome.message, /already in progress/);
  assert.equal(outcome.alreadyRefunded, false);
});

test("ordinary refund rejections show the server's reason", () => {
  assert.equal(
    interpretRefundResponse(404, { success: false, error: "Charge not found" })
      .message,
    "Charge not found",
  );
  assert.equal(interpretRefundResponse(400, {}).message, "Refund failed");
});
