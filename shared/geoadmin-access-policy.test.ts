import assert from "node:assert/strict";
import test from "node:test";
import {
  isGeoAdminStaff,
  isReadOnlyGeoAdminSubscriber,
} from "./geoadmin-access-policy";

test("active GeoAdmin subscribers are read-only, not staff", () => {
  assert.equal(
    isReadOnlyGeoAdminSubscriber({ role: "user", tier: "max", subscriptionStatus: "active" }),
    true,
  );
  assert.equal(
    isReadOnlyGeoAdminSubscriber({ role: "user", tier: "enterprise", subscriptionStatus: "trialing" }),
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
});
