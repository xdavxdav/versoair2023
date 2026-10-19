import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAccountRoleFromEmail } from "./dashboard-routes";

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
