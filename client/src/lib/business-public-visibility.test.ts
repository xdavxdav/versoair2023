import assert from "node:assert/strict";
import test from "node:test";
import { getBusinessPublicVisibilityLabel } from "./business-public-visibility";

test("labels an eligible Canadian business as public", () => {
  assert.equal(
    getBusinessPublicVisibilityLabel({
      countryCode: "CA",
      isActive: true,
      isVerified: true,
    }),
    "Public",
  );
});

test("explains all blockers that keep a business out of the public directory", () => {
  assert.equal(
    getBusinessPublicVisibilityLabel({
      country_code: "CI",
      is_active: false,
      is_verified: false,
      email: "fixture@versoair.local",
      website: "https://demo.example.com",
    }),
    "Not public — country CI (directory is Canada-only); not verified; inactive; internal test email; example website",
  );
});

test("treats missing active and verification values as ineligible", () => {
  assert.equal(
    getBusinessPublicVisibilityLabel({ countryCode: "CA" }),
    "Not public — not verified; inactive",
  );
});

test("uses a configured directory country", () => {
  assert.equal(
    getBusinessPublicVisibilityLabel(
      { countryCode: "FR", isActive: true, isVerified: true },
      "fr",
    ),
    "Public",
  );
});
