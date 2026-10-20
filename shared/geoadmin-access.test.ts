import assert from "node:assert/strict";
import test from "node:test";
import { hasGeoAdminAccess } from "./geoadmin-access";

const now = new Date("2026-01-01T00:00:00.000Z");
const eligibleCustomer = {
  role: "user",
  subscriptionTier: "essential",
  subscriptionStatus: "active",
  subscriptionExpiresAt: "2026-12-31T00:00:00.000Z",
  addonStatus: "active",
  addonBaseTier: "essential",
  addonExpiresAt: "2026-12-31T00:00:00.000Z",
};

test("grants an active paid subscriber access to an approved unexpired add-on", () => {
  assert.equal(hasGeoAdminAccess(eligibleCustomer, now), true);
});

test("denies access when the base subscription is inactive or expired", () => {
  assert.equal(
    hasGeoAdminAccess(
      { ...eligibleCustomer, subscriptionStatus: "cancelled" },
      now,
    ),
    false,
  );
  assert.equal(
    hasGeoAdminAccess(
      { ...eligibleCustomer, subscriptionExpiresAt: "2025-12-31T00:00:00Z" },
      now,
    ),
    false,
  );
});

test("denies access for missing, mismatched, pending, or expired add-ons", () => {
  assert.equal(hasGeoAdminAccess({ ...eligibleCustomer, addonStatus: null }, now), false);
  assert.equal(
    hasGeoAdminAccess({ ...eligibleCustomer, addonBaseTier: "max" }, now),
    false,
  );
  assert.equal(
    hasGeoAdminAccess({ ...eligibleCustomer, addonStatus: "pending" }, now),
    false,
  );
  assert.equal(
    hasGeoAdminAccess({ ...eligibleCustomer, addonExpiresAt: null }, now),
    false,
  );
  assert.equal(
    hasGeoAdminAccess(
      { ...eligibleCustomer, addonExpiresAt: "2025-12-31T00:00:00Z" },
      now,
    ),
    false,
  );
});

test("preserves authorized staff access without a subscriber add-on", () => {
  assert.equal(
    hasGeoAdminAccess(
      { ...eligibleCustomer, role: "admin", addonStatus: null },
      now,
    ),
    true,
  );
});
