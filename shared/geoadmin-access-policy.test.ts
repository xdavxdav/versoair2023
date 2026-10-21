import assert from "node:assert/strict";
import test from "node:test";
import {
  isGeoAdminStaff,
  isReadOnlyGeoAdminSubscriber,
} from "./geoadmin-access-policy";

test("all active paid GeoAdmin subscribers are read-only, not staff", () => {
  for (const tier of ["essential", "verified", "max", "enterprise"]) {
    assert.equal(
      isReadOnlyGeoAdminSubscriber({
        role: "user",
        tier,
        subscriptionStatus: "active",
      }),
      true,
      `${tier} subscribers should have read-only access`,
    );
  }
  assert.equal(
    isReadOnlyGeoAdminSubscriber({
      role: "user",
      tier: "enterprise",
      subscriptionStatus: "trialing",
    }),
    true,
  );
  assert.equal(isGeoAdminStaff({ role: "user", tier: "max" }), false);
});

test("staff bypass subscriber read-only policy and inactive tiers are not treated as subscribers", () => {
  for (const role of ["admin", "moderator", "superuser", "tsr"]) {
    assert.equal(isGeoAdminStaff({ role }), true);
    assert.equal(
      isReadOnlyGeoAdminSubscriber({ role, tier: "enterprise", subscriptionStatus: "active" }),
      false,
    );
  }
  assert.equal(isGeoAdminStaff({ isAdmin: true }), true);
  assert.equal(
    isReadOnlyGeoAdminSubscriber({ role: "user", tier: "max", subscriptionStatus: "canceled" }),
    false,
  );
  assert.equal(
    isReadOnlyGeoAdminSubscriber({ role: "user", tier: "free", subscriptionStatus: "active" }),
    false,
  );
  assert.equal(
    isReadOnlyGeoAdminSubscriber({
      role: "user",
      tier: "essential",
      subscriptionStatus: "active",
      subscriptionExpiresAt: "2025-12-31T00:00:00Z",
    }, new Date("2026-01-01T00:00:00Z")),
    false,
  );
});
