import assert from "node:assert/strict";
import test from "node:test";
import {
  GEOADMIN_ANNUAL_PRICES_XOF,
  GEOADMIN_OFFER_ORDER,
  GEOADMIN_OFFER_NAMES,
  GEOADMIN_OFFER_PRICES_XOF,
  GEOADMIN_PLAN_ORDER,
  GEOADMIN_PLAN_DETAILS,
  GEOADMIN_REFERENCE_NOTICE,
  convertUsdToCurrency,
  formatMarketXofPrice,
  formatXofPrice,
  getGeoAdminMarket,
  getMarketAvailability,
  getGeoAdminContact,
} from "./geoadmin-pricing.ts";
import { TIERS, TIER_ORDER, TIER_FEATURES } from "./tiers.ts";
import { getPublicCopyId } from "../../../shared/public-translations.ts";

test("six commercial offers preserve Standard as the only permanently free offer", () => {
  assert.deepEqual(GEOADMIN_OFFER_ORDER, ["free", "essential", "premium", "verified", "max", "enterprise"]);
  assert.deepEqual(GEOADMIN_OFFER_ORDER.map(key => GEOADMIN_OFFER_NAMES[key]),
    ["Standard", "Essentiel", "Premium", "Pro Vérifié", "Pro Max", "Enterprise"]);
  assert.deepEqual(GEOADMIN_OFFER_PRICES_XOF,
    { free: 0, essential: 180_000, premium: 300_000, verified: 400_000, max: 780_000, enterprise: null });
  assert.deepEqual(GEOADMIN_PLAN_ORDER, TIER_ORDER);
  assert.equal("premium" in TIERS, false);
  assert.equal("premium" in TIER_FEATURES, false);
  assert.equal("premium" in GEOADMIN_ANNUAL_PRICES_XOF, false);
});

test("Premium has concrete proposed services unlike Essentiel, and Enterprise is individually scoped", () => {
  assert.notDeepEqual(GEOADMIN_PLAN_DETAILS.premium.services, GEOADMIN_PLAN_DETAILS.essential.services);
  assert.equal(GEOADMIN_PLAN_DETAILS.premium.services.length, 5);
  assert.ok(GEOADMIN_PLAN_DETAILS.premium.services.includes("Preparation of five product or service sheets"));
  assert.ok(GEOADMIN_PLAN_DETAILS.premium.services.includes("One round of corrections"));
  assert.ok(GEOADMIN_PLAN_DETAILS.enterprise.services.includes("No automatic entitlement to every Pro Max service"));
  assert.match(GEOADMIN_REFERENCE_NOTICE, /Non-final annual reference/);
  assert.match(GEOADMIN_REFERENCE_NOTICE, /written offer/);
  assert.match(GEOADMIN_REFERENCE_NOTICE, /Standard is the only permanently free business plan, at 0 FCFA per year/);
  assert.match(GEOADMIN_REFERENCE_NOTICE, /duration and terms confirmed before activation/);
  assert.notEqual(getPublicCopyId(GEOADMIN_REFERENCE_NOTICE), undefined);
});

test("every proposed commercial benefit has a native translation", () => {
  for (const detail of Object.values(GEOADMIN_PLAN_DETAILS)) {
    for (const text of [detail.shortDescription, ...detail.platform, ...detail.services]) {
      assert.notEqual(getPublicCopyId(text), undefined, text);
    }
  }
});

test("Enterprise custom quote does not depend on exchange-rate availability", () => {
  assert.equal(formatMarketXofPrice(null, "CA", "CAD", null), "Custom quote");
  assert.equal(formatMarketXofPrice(null, "FR", "EUR", null), "Custom quote");
  assert.equal(formatMarketXofPrice(null, "SN", "XOF", null), "Coming soon");
});

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

test("market contacts use only published channels", () => {
  assert.equal(getGeoAdminContact("CA").href, "https://wa.me/14374359726");
  assert.equal(getGeoAdminContact(" ci ").href, "tel:+2252720212223");
  assert.equal(getGeoAdminContact("CI").whatsapp, false);
  for (const country of ["FR", "SN", "", null]) {
    assert.equal(getGeoAdminContact(country).href, "mailto:support@versoair.com");
  }
});
