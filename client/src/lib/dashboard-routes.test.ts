import assert from "node:assert/strict";
import test from "node:test";
import {
  getDashboardDestination,
  getDashboardAccountOptions,
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
  assert.equal(
    getDashboardDestination({
      id: "11",
      email: "basic@example.test",
      role: "user",
      portals: ["geo-admin"],
      subscriptionTier: "free",
    }).path,
    "/dashboard?account=geo-admin&from=geoadmin",
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
