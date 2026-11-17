import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_CHARGE_MINOR_UNITS,
  SUPPORTED_CHARGE_CURRENCIES,
  isZeroDecimalCurrency,
  parseChargeAmount,
} from "./stripe-amount";

function ok(amount: unknown, currency: unknown) {
  const parsed = parseChargeAmount(amount, currency);
  assert.equal(parsed.ok, true, JSON.stringify(parsed));
  if (!parsed.ok) throw new Error("unreachable");
  return parsed;
}

function bad(amount: unknown, currency: unknown) {
  const parsed = parseChargeAmount(amount, currency);
  assert.equal(parsed.ok, false, `expected rejection of ${String(amount)} ${String(currency)}`);
  if (parsed.ok) throw new Error("unreachable");
  return parsed;
}

test("two-decimal currencies are scaled to minor units exactly", () => {
  assert.deepEqual(ok("19.99", "USD"), {
    ok: true,
    currency: "USD",
    minorUnits: 1999,
    major: "19.99",
  });
  assert.equal(ok(10, "EUR").minorUnits, 1000);
  assert.equal(ok("0.01", "CAD").minorUnits, 1);
  assert.equal(ok("7.5", "GBP").minorUnits, 750);
  assert.equal(ok("7.5", "GBP").major, "7.50");
});

test("decimals are converted from text, without floating-point drift", () => {
  // 8.2 * 100 === 819.9999999999999 and 0.29 * 100 === 28.999999999999996.
  assert.equal(ok("8.2", "USD").minorUnits, 820);
  assert.equal(ok(8.2, "USD").minorUnits, 820);
  assert.equal(ok("0.29", "USD").minorUnits, 29);
  assert.equal(ok("1.10", "USD").minorUnits, 110);
});

test("zero-decimal currencies are NOT multiplied by 100", () => {
  assert.equal(isZeroDecimalCurrency("XOF"), true);
  assert.equal(isZeroDecimalCurrency("XAF"), true);
  assert.equal(isZeroDecimalCurrency("USD"), false);

  const xof = ok("5000", "XOF");
  assert.equal(xof.minorUnits, 5000);
  assert.equal(xof.major, "5000.00");
  assert.equal(ok(25000, "xaf").minorUnits, 25000);
});

test("zero-decimal currencies reject real fractions but tolerate a trailing .0", () => {
  assert.equal(bad("5000.50", "XOF").code, "INVALID_AMOUNT");
  assert.match(bad("1.5", "XAF").error, /whole numbers/);
  assert.equal(ok("5000.00", "XOF").minorUnits, 5000);
});

test("more than two decimals is rejected, trailing zeros are fine", () => {
  assert.match(bad("1.999", "USD").error, /2 decimal/);
  assert.equal(ok("1.500", "USD").minorUnits, 150);
});

test("currency is case-insensitive and must be on the allow-list", () => {
  assert.equal(ok("1", " usd ").currency, "USD");
  assert.equal(bad("1", "JPY").code, "INVALID_CURRENCY");
  assert.equal(bad("1", "").code, "INVALID_CURRENCY");
  assert.equal(bad("1", undefined).code, "INVALID_CURRENCY");
  assert.equal(bad("1", 840).code, "INVALID_CURRENCY");
  assert.equal(bad("1", { toUpperCase: () => "USD" }).code, "INVALID_CURRENCY");
});

test("the allow-list covers every currency either charge UI offers", () => {
  for (const code of [
    "USD",
    "EUR",
    "GBP",
    "CAD",
    "CHF",
    "XOF",
    "XAF",
    "NGN",
    "KES",
    "ZAR",
    "GHS",
    "MAD",
  ]) {
    assert.ok(SUPPORTED_CHARGE_CURRENCIES.includes(code), code);
  }
});

test("garbage amounts are rejected", () => {
  for (const value of [
    "",
    " ",
    "abc",
    "12abc",
    "1e3",
    "0x10",
    "-5",
    "+5",
    ".5",
    "5.",
    "1,000",
    "Infinity",
    Infinity,
    NaN,
    null,
    undefined,
    {},
    [],
    true,
  ]) {
    assert.equal(bad(value, "USD").code, "INVALID_AMOUNT", String(value));
  }
});

test("zero is rejected, the smallest positive amount is accepted", () => {
  assert.match(bad("0", "USD").error, /greater than zero/);
  assert.match(bad("0.00", "USD").error, /greater than zero/);
  assert.match(bad(0, "XOF").error, /greater than zero/);
  assert.equal(ok("0.01", "USD").minorUnits, 1);
  assert.equal(ok("1", "XOF").minorUnits, 1);
});

test("the Stripe ceiling is enforced in minor units", () => {
  assert.equal(MAX_CHARGE_MINOR_UNITS, 99_999_999);
  assert.equal(ok("999999.99", "USD").minorUnits, MAX_CHARGE_MINOR_UNITS);
  assert.match(bad("1000000.00", "USD").error, /maximum/);
  assert.equal(ok("99999999", "XOF").minorUnits, MAX_CHARGE_MINOR_UNITS);
  assert.match(bad("100000000", "XOF").error, /maximum/);
  assert.equal(bad("9".repeat(16), "USD").code, "INVALID_AMOUNT");
});
