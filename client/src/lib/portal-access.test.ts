import assert from "node:assert/strict";
import test from "node:test";
import { getAccessiblePortalIds, getPortalAccess } from "./portal-access";

test("server portal grants are authoritative and have a stable display order", () => {
  const user = {
    id: "1",
    email: "user@example.test",
    role: "user",
    hasArtistProfile: true,
    isContractor: true,
    canAccessBlog: true,
    subscriptionTier: "enterprise",
  };
  const capabilities = {
    portals: ["contractor", "geo-admin", "artist", "general", "streamer"],
    role: "user",
    subscriptionTier: "enterprise",
    subscriptionStatus: "active",
    isTrialing: false,
    trialExpiresAt: null,
    hasArtistProfile: false,
    artistStageName: null,
    isContractor: false,
    hasOAuthAccount: false,
    oauthProvider: null,
    canAccessBlog: false,
  };

  assert.deepEqual(getAccessiblePortalIds(capabilities, user), [
    "general",
    "artist",
    "geo-admin",
    "streamer",
    "contractor",
  ]);
  assert.equal(getPortalAccess(capabilities, user).community, false);
});

test("fallback access does not infer paid GeoAdmin eligibility or moderator Admin Panel access", () => {
  const paidUser = {
    id: "2",
    email: "user@example.test",
    role: "user",
    subscriptionTier: "enterprise",
  };
  const moderator = {
    id: "3",
    email: "moderator@example.test",
    role: "moderator",
  };

  assert.equal(getPortalAccess(null, paidUser)["geo-admin"], false);
  assert.equal(getPortalAccess(null, moderator).admin, false);
  assert.equal(getPortalAccess(null, moderator)["geo-admin"], true);
});

test("free accounts keep basic GeoAdmin eligibility and Admin Panel remains staff-only", () => {
  const freeUser = {
    id: "4",
    email: "user@example.test",
    role: "user",
    subscriptionTier: "free",
  };
  const admin = {
    id: "5",
    email: "admin@example.test",
    role: "admin",
  };

  assert.equal(getPortalAccess(null, freeUser)["geo-admin"], true);
  assert.equal(getPortalAccess(null, freeUser).admin, false);
  assert.equal(getPortalAccess(null, admin).admin, true);
});
