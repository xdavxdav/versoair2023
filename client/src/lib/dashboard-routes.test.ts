import assert from "node:assert/strict";
import test from "node:test";
import {
  getDashboardAccountOptions,
  getSelectedDashboardAccount,
  normalizeAccountRoleFromEmail,
} from "./dashboard-routes";

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
});
