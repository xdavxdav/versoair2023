import assert from "node:assert/strict";
import test from "node:test";
import {
  getAccountFamily,
  getDashboardDestination,
  getDashboardAccountOptions,
  getGeoAdminDestination,
  getSelectedDashboardAccount,
  normalizeAccountRoleFromEmail,
} from "./dashboard-routes";
import { getRoleAwareRedirectPath } from "./portal-preferences";

test("email patterns cannot grant staff roles", () => {
  for (const email of [
    "someone@versoair-superadmin.com",
    "someone@versoair-admin.com",
    "someone@versoair-moderator.com",
    "someone@versoair-tsr.com",
  ]) {
    assert.equal(normalizeAccountRoleFromEmail(email), "user");
    assert.equal(normalizeAccountRoleFromEmail(email, "user"), "user");
  }
});

test("stored staff roles remain valid regardless of email", () => {
  for (const role of ["admin", "moderator", "superuser", "tsr"]) {
    assert.equal(normalizeAccountRoleFromEmail("user@example.test", role), role);
  }
});

test("dashboard account choices follow the user's available accounts", () => {
  const user = {
    id: "42",
    email: "user@example.test",
    role: "user",
    hasArtistProfile: true,
    isContractor: true,
  };

  assert.deepEqual(
    getDashboardAccountOptions(user, false, false).map((account) => account.id),
    ["general", "artist", "streamer", "contractor"],
  );
  assert.deepEqual(
    getDashboardAccountOptions(
      { ...user, portals: ["general", "streamer", "geo-admin"] },
      true,
    ).map((account) => account.id),
    ["general", "business", "geo-admin", "artist", "streamer", "contractor"],
  );
});

test("dashboard account selection follows granted portals, not URL hints", () => {
  const user = {
    id: "42",
    email: "user@example.test",
    role: "user",
    portals: ["general", "streamer"],
  };
  const options = getDashboardAccountOptions(user, false);

  assert.equal(getSelectedDashboardAccount(user, options, "geo-admin"), "general");
  assert.equal(getSelectedDashboardAccount(user, options, "artist"), "general");
});

test("staff retain their staff dashboard while allowing account switching", () => {
  const user = {
    id: "1",
    email: "admin@example.test",
    role: "admin",
  };
  const options = getDashboardAccountOptions(user, false, false);

  assert.ok(options.some((account) => account.id === "artist"));
  assert.equal(getSelectedDashboardAccount(user, options, null), "staff");
  assert.equal(
    getDashboardDestination({ ...user, portals: ["geo-admin"] }).path,
    "/geo-admin/workspace",
  );
});

test("GeoAdmin subscribers and free accounts use their correct destinations", () => {
  assert.equal(
    getDashboardDestination({
      id: "10",
      email: "subscriber@example.test",
      role: "user",
      portals: ["geo-admin"],
      subscriptionTier: "essential",
    }).path,
    "/geo-admin",
  );
  // An account that holds the geo-admin role keeps the read-only dashboard.
  assert.equal(
    getDashboardDestination({
      id: "11",
      email: "basic@example.test",
      role: "geo-admin",
      portals: ["geo-admin"],
      subscriptionTier: "free",
    }).path,
    "/dashboard?account=geo-admin&from=geoadmin",
  );
});

// What computeUserCapabilities returns: every free account lists "geo-admin"
// next to general and streamer, whatever else it unlocked.
const withEveryAccountPortals = (
  extra: Record<string, unknown> & { portals?: string[] } = {},
) => ({
  id: "20",
  email: "member@example.test",
  role: "user",
  subscriptionTier: "free",
  ...extra,
  portals: ["general", "geo-admin", "streamer", ...(extra.portals ?? [])],
});

test("the free GeoAdmin view every account has never outranks the portal it unlocked", () => {
  const cases: Array<{
    name: string;
    user: ReturnType<typeof withEveryAccountPortals>;
    path: string;
    family: string;
    selected: string;
  }> = [
    {
      name: "artist",
      user: withEveryAccountPortals({
        role: "artist",
        hasArtistProfile: true,
        portals: ["artist"],
      }),
      path: "/artist-portal/dashboard",
      family: "artist",
      selected: "artist",
    },
    {
      name: "contractor",
      user: withEveryAccountPortals({
        isContractor: true,
        portals: ["contractor"],
      }),
      path: "/contracts",
      family: "contractor",
      selected: "contractor",
    },
    {
      name: "artisan",
      user: withEveryAccountPortals({ role: "artisan", portals: ["artisan"] }),
      path: "/artisans-portal",
      family: "artisan",
      selected: "general",
    },
    {
      name: "business owner",
      user: withEveryAccountPortals({
        role: "business_owner",
        portals: ["careers"],
      }),
      path: "/services/careers/dashboard",
      family: "general",
      selected: "general",
    },
    {
      name: "plain member",
      user: withEveryAccountPortals(),
      path: "/dashboard",
      family: "general",
      selected: "general",
    },
  ];

  for (const { name, user, path, family, selected } of cases) {
    assert.equal(getDashboardDestination(user).path, path, `${name} lands`);
    assert.equal(getAccountFamily(user), family, `${name} family`);
    assert.equal(
      getSelectedDashboardAccount(
        user,
        getDashboardAccountOptions(user, false),
        null,
      ),
      selected,
      `${name} default dashboard`,
    );
  }
});

test("a member who owns a business opens the business dashboard, and GeoAdmin stays one choice away", () => {
  const member = withEveryAccountPortals();
  const options = getDashboardAccountOptions(member, true);

  assert.equal(getSelectedDashboardAccount(member, options, null), "business");
  assert.ok(options.some((account) => account.id === "geo-admin"));
  assert.equal(
    getSelectedDashboardAccount(member, options, "geo-admin"),
    "geo-admin",
  );
});

test("a paid GeoAdmin plan still takes the account to GeoAdmin first", () => {
  const subscriber = withEveryAccountPortals({
    subscriptionTier: "essential",
    role: "artist",
    hasArtistProfile: true,
    portals: ["artist"],
  });

  assert.equal(getAccountFamily(subscriber), "geo-admin");
  assert.equal(getDashboardDestination(subscriber).path, "/geo-admin");
  assert.equal(
    getSelectedDashboardAccount(
      subscriber,
      getDashboardAccountOptions(subscriber, false),
      null,
    ),
    "geo-admin",
  );
});

test("the GeoAdmin entry depends on the plan and role, not on what else the account unlocked", () => {
  assert.equal(
    getGeoAdminDestination(
      withEveryAccountPortals({ role: "artist", portals: ["artist"] }),
    ).path,
    "/dashboard?account=geo-admin&from=geoadmin",
  );
  assert.equal(
    getGeoAdminDestination(withEveryAccountPortals({ subscriptionTier: "max" }))
      .path,
    "/geo-admin",
  );
  assert.equal(
    getGeoAdminDestination(withEveryAccountPortals({ role: "admin" })).path,
    "/geo-admin/workspace",
  );
});

test("non-staff roles cannot be sent to staff-only GeoAdmin routes", () => {
  const subscriber = {
    id: "12",
    email: "subscriber@example.test",
    role: "user",
    portals: ["geo-admin"],
    subscriptionTier: "essential",
  };

  assert.equal(
    getDashboardDestination(subscriber).path,
    "/geo-admin",
  );
  assert.equal(
    getRoleAwareRedirectPath(subscriber, "/geo-admin/dashboard"),
    "/geo-admin",
  );
  assert.equal(
    getRoleAwareRedirectPath(subscriber, "/geo-admin/workspace"),
    "/geo-admin",
  );
  assert.equal(
    getRoleAwareRedirectPath(subscriber, "/admin/tickets"),
    "/geo-admin",
  );
});

test("artisan, contractor, and careers-only accounts reach their own portals", () => {
  assert.equal(
    getDashboardDestination({
      id: "13",
      email: "artisan@example.test",
      role: "artisan",
      portals: ["artisan"],
    }).path,
    "/artisans-portal",
  );
  assert.equal(
    getDashboardDestination({
      id: "14",
      email: "contractor@example.test",
      role: "user",
      portals: ["contractor"],
    }).path,
    "/contracts",
  );
  for (const user of [
    {
      id: "15",
      email: "jobseeker@example.test",
      role: "job-seeker",
    },
    {
      id: "16",
      email: "careers@example.test",
      role: "user",
      portals: ["careers"],
    },
    {
      id: "17",
      email: "employer@example.test",
      role: "employer",
    },
  ]) {
    assert.equal(
      getDashboardDestination(user).path,
      "/services/careers/dashboard",
    );
  }
});
