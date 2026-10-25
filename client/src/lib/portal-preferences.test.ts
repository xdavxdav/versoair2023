import assert from "node:assert/strict";
import test from "node:test";
import {
  getEligiblePreferredPortal,
  getPortalPreferenceStorageKey,
  getRoleAwareRedirectPath,
  getRecommendedPortalId,
  sortPortalChoices,
  type PortalChoice,
} from "./portal-preferences";

const choices: PortalChoice[] = [
  { id: "general", name: "General", detail: "", path: "/dashboard" },
  { id: "artist", name: "Artist", detail: "", path: "/artist-portal/dashboard" },
  { id: "geo-admin", name: "GeoAdmin", detail: "", path: "/geo-admin" },
];

test("portal favorites are scoped to the account ID, not the displayed email", () => {
  const firstAccountKey = getPortalPreferenceStorageKey({
    id: 11,
    email: "first@example.test",
  });
  const sameAccountWithChangedEmailKey = getPortalPreferenceStorageKey({
    id: 11,
    email: "new@example.test",
  });
  const differentAccountKey = getPortalPreferenceStorageKey({
    id: 12,
    email: "new@example.test",
  });

  assert.equal(firstAccountKey, sameAccountWithChangedEmailKey);
  assert.notEqual(firstAccountKey, differentAccountKey);
});

test("only an eligible portal can be used as a saved favorite", () => {
  assert.equal(
    getEligiblePreferredPortal(choices, "artist")?.path,
    "/artist-portal/dashboard",
  );
  assert.equal(getEligiblePreferredPortal(choices, "admin"), null);
});

test("recommended destination follows the account family and orders first", () => {
  const user = {
    id: "1",
    email: "artist@example.test",
    role: "artist",
    portals: ["general", "artist", "streamer"],
  };
  const recommendedId = getRecommendedPortalId(user, choices);

  assert.equal(recommendedId, "artist");
  assert.deepEqual(
    sortPortalChoices(choices, recommendedId).map((portal) => portal.id),
    ["artist", "general", "geo-admin"],
  );
});

test("GeoAdmin subscriber recommendation uses the subscriber landing page", () => {
  const user = {
    id: "2",
    email: "subscriber@example.test",
    role: "user",
    portals: ["general", "geo-admin"],
    subscriptionTier: "essential",
  };

  assert.equal(getRecommendedPortalId(user, choices), "geo-admin");
});

test("staff go to their workspace instead of the general dashboard fallback", () => {
  const staff = {
    id: "3",
    email: "admin@example.test",
    role: "superuser",
  };

  assert.equal(getRoleAwareRedirectPath(staff, null), "/geo-admin/workspace");
  assert.equal(
    getRoleAwareRedirectPath(staff, "/dashboard"),
    "/geo-admin/workspace",
  );
  assert.equal(
    getRoleAwareRedirectPath(staff, "/admin/tickets"),
    "/admin/tickets",
  );
});

test("non-staff users are never redirected into the staff workspace", () => {
  const artist = {
    id: "4",
    email: "artist@example.test",
    role: "artist",
    portals: ["artist"],
  };

  assert.equal(
    getRoleAwareRedirectPath(artist, "/geo-admin/workspace"),
    "/artist-portal/dashboard",
  );
  assert.equal(
    getRoleAwareRedirectPath(artist, "/geo-admin/workspace?redirect=%2Fx"),
    "/artist-portal/dashboard",
  );
  assert.equal(getRoleAwareRedirectPath(artist, null), null);
});

test("non-staff users are kept out of all GeoAdmin and admin staff routes", () => {
  const contractor = {
    id: "5",
    email: "contractor@example.test",
    role: "contractor",
    portals: ["contractor"],
  };

  assert.equal(
    getRoleAwareRedirectPath(contractor, "/geo-admin/dashboard"),
    "/contracts",
  );
  assert.equal(
    getRoleAwareRedirectPath(contractor, "/admin/tickets"),
    "/contracts",
  );
});
