import assert from "node:assert/strict";
import test from "node:test";
import {
  GEOADMIN_ANNUAL_PRICES_XOF,
  convertUsdToCurrency,
  formatXofPrice,
  getMarketAvailability,
} from "./geoadmin-pricing.ts";

test("uses the approved annual FCFA price schedule", () => {
  assert.deepEqual(GEOADMIN_ANNUAL_PRICES_XOF, {
    free: 0,
    essential: 180_000,
    verified: 400_000,
    max: 780_000,
    enterprise: null,
  });
});

test("uses the configured GeoAdmin market list", () => {
  assert.equal(getMarketAvailability("CA"), true);
  assert.equal(getMarketAvailability("ci"), true);
  assert.equal(getMarketAvailability("SN"), false);
  assert.equal(getMarketAvailability(""), null);
});

test("formats the FCFA base price when local exchange rates are unavailable", () => {
  assert.equal(formatXofPrice(180_000, "CAD", null, "en-CA"), "180,000 FCFA");
  assert.equal(formatXofPrice(null, "CAD", null), "Custom quote");
});

test("converts annual FCFA prices using the supplied currency rate", () => {
  const rates = { XOF: 1, CAD: 0.002428, USD: 0.001706 };
  assert.match(formatXofPrice(180_000, "CAD", rates, "en-CA"), /CAD/);
});

test("converts simulated USD amounts into the selected local currency", () => {
  const converted = convertUsdToCurrency(100, "CAD", {
    XOF: 1,
    CAD: 0.002428,
    USD: 0.001706,
  });
  assert.ok(converted !== null);
  assert.equal(Math.round(converted * 100) / 100, 142.32);
});

test("does not attempt conversion if either currency rate is missing", () => {
  assert.equal(convertUsdToCurrency(100, "CAD", null), null);
});
