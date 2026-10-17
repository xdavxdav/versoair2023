import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getAdminGateLockout,
  getAdminGatePostPasswordDenial,
  type AdminGateAccount,
} from "./admin-gate-policy";

const base: AdminGateAccount = {
  email: "staff@example.com",
  role: "admin",
  isVerified: true,
  lockedUntil: null,
  mustChangePassword: false,
};
const opts = { isSuperadminEmail: false };

test("lockout applies only while lockedUntil is in the future", () => {
  const now = new Date("2025-01-01T00:00:00Z");
  assert.equal(getAdminGateLockout({ lockedUntil: null }, now), null);
  assert.equal(
    getAdminGateLockout({ lockedUntil: new Date(now.getTime() - 1) }, now),
    null,
  );
  const locked = getAdminGateLockout(
    { lockedUntil: new Date(now.getTime() + 90_000).toISOString() },
    now,
  );
  assert.equal(locked?.status, 423);
  assert.equal(locked?.code, "ACCOUNT_LOCKED");
  assert.match(locked!.message, /2 minute/);
});

test("invitation-issued admin and moderator roles (and superuser) are allowed", () => {
  for (const role of ["admin", "moderator", "superuser"]) {
    assert.equal(getAdminGatePostPasswordDenial({ ...base, role }, opts), null);
  }
});

test("non-staff roles are denied", () => {
  for (const role of ["user", "artist", "Admin", "", null]) {
    const d = getAdminGatePostPasswordDenial({ ...base, role }, opts);
    assert.equal(d?.status, 403);
    assert.equal(d?.code, "INSUFFICIENT_PERMISSIONS");
  }
});

test("unverified accounts are denied unless the configured superadmin", () => {
  const acct = { ...base, isVerified: false };
  assert.equal(getAdminGatePostPasswordDenial(acct, opts)?.code, "EMAIL_NOT_VERIFIED");
  assert.equal(
    getAdminGatePostPasswordDenial(acct, { isSuperadminEmail: true }),
    null,
  );
});

test("forced password change cannot be bypassed through the gate", () => {
  for (const role of ["admin", "moderator", "superuser"]) {
    const d = getAdminGatePostPasswordDenial(
      { ...base, role, mustChangePassword: true },
      { isSuperadminEmail: true },
    );
    assert.equal(d?.code, "PASSWORD_CHANGE_REQUIRED");
  }
});
