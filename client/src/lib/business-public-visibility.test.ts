import assert from "node:assert/strict";
import test from "node:test";
import { getBusinessPublicVisibilityLabel } from "./business-public-visibility";

test("labels a verified active Canadian business as public", () => {
  assert.equal(
    getBusinessPublicVisibilityLabel({
      countryCode: "CA",
      isActive: true,
      isVerified: true,
    }),
    "Public",
  );
});

test("lists the country and verification blockers for a non-public business", () => {
  assert.equal(
    getBusinessPublicVisibilityLabel({
      country_code: "CI",
      is_active: true,
      is_verified: false,
    }),
    "Not public — country CI (directory is Canada-only); not verified",
  );
});

test("explains inactive and internal placeholder data blockers", () => {
  assert.equal(
    getBusinessPublicVisibilityLabel({
      countryCode: "CA",
      isActive: false,
      isVerified: true,
      email: "fixture@versoair.local",
      website: "https://demo.example.com",
    }),
    "Not public — inactive; internal test email; example website",
  );
});
