import assert from "node:assert/strict";
import test from "node:test";
import { getBusinessPublicVisibilityLabel } from "./business-public-visibility";

test("labels an eligible business as public in any country", () => {
  for (const countryCode of ["CA", "CI", "FR"]) {
    assert.equal(
      getBusinessPublicVisibilityLabel({
        countryCode,
        isActive: true,
        isVerified: true,
      }),
      "Public",
    );
  }
});

test("explains all blockers that keep a business out of the public directory", () => {
  assert.equal(
    getBusinessPublicVisibilityLabel({
      is_active: false,
      is_verified: false,
      email: "fixture@versoair.local",
      website: "https://demo.example.com",
    }),
    "Not public — country not set; not verified; inactive; internal test email; example website",
  );
});

test("treats missing active and verification values as ineligible", () => {
  assert.equal(
    getBusinessPublicVisibilityLabel({ countryCode: "CI" }),
    "Not public — not verified; inactive",
  );
});
