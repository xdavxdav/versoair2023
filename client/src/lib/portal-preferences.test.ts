import assert from "node:assert/strict";
import test from "node:test";
import {
  getDefaultLandingPath,
  getEligiblePreferredPortal,
  getPortalPreferenceStorageKey,
  getRoleAwareRedirectPath,
  getRecommendedPortalId,
  isAutomaticPortalChoice,
  shouldOfferPortalChoice,
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

// What every free account is offered after signing in (see computeUserCapabilities).
const everyoneChoices: PortalChoice[] = [
  { id: "general", name: "General", detail: "", path: "/dashboard" },
  { id: "streamer", name: "Musical Universe", detail: "", path: "/stream" },
  {
    id: "geo-admin",
    name: "GeoAdmin",
    detail: "",
    path: "/dashboard?account=geo-admin&from=geoadmin",
  },
];

test("portals every account already has are not a reason to ask where to go", () => {
  assert.deepEqual(
    everyoneChoices.map((portal) => isAutomaticPortalChoice(portal)),
    [true, true, true],
  );
  assert.equal(shouldOfferPortalChoice(everyoneChoices), false);
  assert.equal(shouldOfferPortalChoice([]), false);
});

test("an unlocked portal brings the choice back, and the automatic ones stay labelled", () => {
  const artist: PortalChoice = {
    id: "artist",
    name: "Artist",
    detail: "",
    path: "/artist-portal/dashboard",
  };
  const paidGeoAdmin: PortalChoice = {
    id: "geo-admin",
    name: "GeoAdmin",
    detail: "",
    path: "/geo-admin",
  };
  const community: PortalChoice = {
    id: "community",
    name: "Community",
    detail: "",
    path: "/blog",
  };

  assert.equal(isAutomaticPortalChoice(artist), false);
  assert.equal(isAutomaticPortalChoice(paidGeoAdmin), false);
  assert.equal(shouldOfferPortalChoice([...everyoneChoices, artist]), true);
  assert.equal(shouldOfferPortalChoice([...everyoneChoices, community]), true);
  assert.equal(
    shouldOfferPortalChoice([everyoneChoices[0], everyoneChoices[1], paidGeoAdmin]),
    true,
  );
});

test("an account with nothing unlocked lands on its own dashboard, never on Stream", () => {
  const freeAccount = {
    id: "6",
    email: "member@example.test",
    role: "user",
    portals: ["general", "geo-admin", "streamer"],
    subscriptionTier: "free",
  };

  // The read-only GeoAdmin view is every account's perk: offered, not imposed.
  assert.equal(getDefaultLandingPath(freeAccount), "/dashboard");
  assert.equal(
    getDefaultLandingPath({ ...freeAccount, portals: ["general", "streamer"] }),
    "/dashboard",
  );
});

test("a free artist is recommended the artist portal, not the GeoAdmin view every account has", () => {
  const artist = {
    id: "9",
    email: "artist@example.test",
    role: "artist",
    hasArtistProfile: true,
    portals: ["artist", "general", "geo-admin", "streamer"],
    subscriptionTier: "free",
  };
  const choices: PortalChoice[] = [
    ...everyoneChoices,
    {
      id: "artist",
      name: "Artist",
      detail: "",
      path: "/artist-portal/dashboard",
    },
  ];

  assert.equal(getDefaultLandingPath(artist), "/artist-portal/dashboard");
  assert.equal(getRecommendedPortalId(artist, choices), "artist");
});

test("default landing keeps the community blog and the paid GeoAdmin page", () => {
  const community = {
    id: "7",
    email: "community@example.test",
    role: "user",
    portals: ["general", "community", "streamer"],
  };

  assert.equal(getDefaultLandingPath(community), "/blog");
  assert.equal(
    getDefaultLandingPath({ ...community, portals: ["general", "community", "artist"] }),
    "/artist-portal/dashboard",
  );
  assert.equal(
    getDefaultLandingPath({
      id: "8",
      email: "subscriber@example.test",
      role: "user",
      portals: ["general", "geo-admin", "streamer"],
      subscriptionTier: "essential",
    }),
    "/geo-admin",
  );
});
