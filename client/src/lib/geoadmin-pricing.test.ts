import assert from "node:assert/strict";
import test from "node:test";
import {
  GEOADMIN_ANNUAL_PRICES_XOF,
  convertUsdToCurrency,
  formatMarketXofPrice,
  formatXofPrice,
  getGeoAdminMarket,
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
  assert.deepEqual(getGeoAdminMarket("CA"), {
    currency: "CAD",
    locale: "en-US",
  });
  assert.deepEqual(getGeoAdminMarket("FR"), {
    currency: "EUR",
    locale: "fr-FR",
  });
  assert.deepEqual(getGeoAdminMarket("CI"), {
    currency: "XOF",
    locale: "fr-CI",
  });
  assert.equal(getMarketAvailability("CA"), true);
  assert.equal(getMarketAvailability("FR"), true);
  assert.equal(getMarketAvailability("ci"), true);
  assert.equal(getMarketAvailability("SN"), false);
  assert.equal(getMarketAvailability(""), null);
});

test("formats FCFA when local exchange rates are unavailable", () => {
  assert.equal(formatXofPrice(180_000, "CAD", null, "en-CA"), "180,000 FCFA");
  assert.equal(formatXofPrice(null, "CAD", null), "Custom quote");
});

test("converts annual FCFA prices using the supplied currency rate", () => {
  const rates = { XOF: 1, CAD: 0.002428, USD: 0.001706 };
  assert.equal(formatXofPrice(180_000, "CAD", rates), "CA$437");
  assert.equal(formatMarketXofPrice(180_000, "CA", "XOF", rates), "CA$437");
  assert.equal(
    formatXofPrice(180_000, "EUR", { XOF: 1, EUR: 0.0015 }),
    "270 €",
  );
  assert.equal(
    formatMarketXofPrice(180_000, "FR", "XOF", { XOF: 1, EUR: 0.0015 }),
    "270 €",
  );
  assert.equal(
    formatMarketXofPrice(180_000, "CI", "XOF", rates),
    "180 000 FCFA",
  );
});

test("does not quote local pricing in an unavailable market", () => {
  assert.equal(formatMarketXofPrice(180_000, "SN", "XOF", null), "Coming soon");
});

test("does not show FCFA as Canadian or euro pricing when rates are missing", () => {
  assert.equal(
    formatMarketXofPrice(180_000, "CA", "CAD", null),
    "Rate unavailable",
  );
  assert.equal(
    formatMarketXofPrice(180_000, "FR", "EUR", { XOF: 1 }),
    "Rate unavailable",
  );
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
