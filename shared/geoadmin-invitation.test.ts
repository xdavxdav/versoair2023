import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptGeoAdminInvitationSchema,
  acceptExistingGeoAdminInvitationSchema,
  buildGeoAdminInvitationUrl,
  buildGeoAdminRevocationUpdate,
  canLinkExistingUserToGeoAdmin,
  createGeoAdminInvitationSchema,
  formatGeoAdminAccessId,
  getGeoAdminManagedRevocationBlocker,
  getGeoAdminManagedStaffRole,
  getGeoAdminRevocationBlocker,
  getInvitationClaimFailure,
  isInvitationLinkedGeoAdmin,
  getUndeliverableEmailReason,
  parseGeoAdminAccessId,
} from "./geoadmin-invitation";

const valid = {
  email: "Jane.Doe@Gmail.com",
  gateUsername: "  Jane_Ops ",
  role: "moderator",
};

test("invite input is normalized", () => {
  const parsed = createGeoAdminInvitationSchema.parse(valid);
  assert.equal(parsed.email, "jane.doe@gmail.com");
  assert.equal(parsed.gateUsername, "jane_ops");
  assert.equal(parsed.role, "moderator");
});

test("invite rejects undeliverable and reserved email domains", () => {
  for (const email of [
    "ops@agency.test",
    "ops@example.com",
    "ops@foo.example",
    "ops@localhost",
    "ops@internal.invalid",
    "ops@[127.0.0.1]",
    "ops@nodot",
    "not-an-email",
  ]) {
    assert.equal(
      createGeoAdminInvitationSchema.safeParse({ ...valid, email }).success,
      false,
      email,
    );
  }
  assert.ok(getUndeliverableEmailReason("ops@agency.test"));
  assert.equal(getUndeliverableEmailReason("ops@company.co.uk"), null);
});

test("invite only allows admin or moderator roles and no extra fields", () => {
  for (const role of ["superuser", "superadmin", "user", "artist", "", undefined]) {
    assert.equal(
      createGeoAdminInvitationSchema.safeParse({ ...valid, role }).success,
      false,
      String(role),
    );
  }
  assert.equal(
    createGeoAdminInvitationSchema.safeParse({ ...valid, role: "admin" }).success,
    true,
  );
  assert.equal(
    createGeoAdminInvitationSchema.safeParse({
      ...valid,
      permissions: ["*"],
    }).success,
    false,
  );
});

test("gate usernames are validated", () => {
  for (const gateUsername of ["ab", "bad-name", "has space", "root", "joel_007", "x".repeat(51)]) {
    assert.equal(
      createGeoAdminInvitationSchema.safeParse({ ...valid, gateUsername }).success,
      false,
      gateUsername,
    );
  }
});

test("acceptance enforces the strong password policy", () => {
  const token = "gai_" + "a".repeat(43);
  for (const password of ["Short1Aa", "alllowercase123", "ALLUPPERCASE123", "NoDigitsHereAtAll"]) {
    assert.equal(
      acceptGeoAdminInvitationSchema.safeParse({ token, password }).success,
      false,
      password,
    );
  }
  assert.equal(
    acceptGeoAdminInvitationSchema.safeParse({ token, password: "Str0ngPassword" }).success,
    true,
  );
  assert.equal(
    acceptGeoAdminInvitationSchema.safeParse({
      token,
      password: "Str0ngPassword",
      role: "superuser",
    }).success,
    false,
  );
});

test("access ids round-trip and reject garbage", () => {
  assert.deepEqual(parseGeoAdminAccessId("inv_12"), { kind: "invitation", id: 12 });
  assert.deepEqual(parseGeoAdminAccessId("user_7"), { kind: "user", id: 7 });
  assert.equal(formatGeoAdminAccessId({ kind: "user", id: 7 }), "user_7");
  for (const id of ["7", "inv_0", "user_-1", "inv_01", "usr_1", "user_99999999999", "inv_1;drop"]) {
    assert.equal(parseGeoAdminAccessId(id), null, id);
  }
});

test("invitation URL points at the client accept page", () => {
  assert.equal(
    buildGeoAdminInvitationUrl("https://versoair.com/", "gai_abc"),
    "https://versoair.com/geo-admin/accept-invitation?token=gai_abc",
  );
});

test("claim failures cover single-use, revocation and expiry", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  const future = new Date("2030-01-02T00:00:00Z");
  const past = new Date("2029-12-31T00:00:00Z");
  assert.equal(getInvitationClaimFailure(null, now), "not_found");
  assert.equal(getInvitationClaimFailure({ status: "pending", expiresAt: future }, now), null);
  assert.equal(getInvitationClaimFailure({ status: "pending", expiresAt: past }, now), "expired");
  assert.equal(getInvitationClaimFailure({ status: "pending", expiresAt: now }, now), "expired");
  assert.equal(getInvitationClaimFailure({ status: "accepted", expiresAt: future }, now), "already_used");
  assert.equal(getInvitationClaimFailure({ status: "revoked", expiresAt: future }, now), "revoked");
  assert.equal(getInvitationClaimFailure({ status: "delivery_failed", expiresAt: future }, now), "not_found");
});

const staff = {
  id: 10,
  email: "ops@company.com",
  username: "ops",
  role: "admin",
  previousRole: null,
  gateUsername: "ops",
  portalAccess: ["general", "geo-admin", "community"],
};

test("revocation is blocked for self, owner and superusers", () => {
  assert.equal(getGeoAdminRevocationBlocker(staff, { id: 10 })?.code, "SELF_REVOCATION_FORBIDDEN");
  assert.equal(
    getGeoAdminRevocationBlocker({ ...staff, role: "superuser" }, { id: 1 })?.code,
    "PROTECTED_ACCOUNT",
  );
  assert.equal(
    getGeoAdminRevocationBlocker({ ...staff, role: "artist", previousRole: "superuser" }, { id: 1 })?.code,
    "PROTECTED_ACCOUNT",
  );
  assert.equal(
    getGeoAdminRevocationBlocker(staff, { id: 1 }, "OPS@company.com")?.code,
    "PROTECTED_ACCOUNT",
  );
  assert.equal(
    getGeoAdminRevocationBlocker({ ...staff, gateUsername: "joel_007" }, { id: 1 })?.code,
    "PROTECTED_ACCOUNT",
  );
  assert.equal(
    getGeoAdminRevocationBlocker({ ...staff, role: "user", gateUsername: null }, { id: 1 })?.code,
    "GEOADMIN_ACCESS_NOT_FOUND",
  );
  assert.equal(getGeoAdminRevocationBlocker(staff, { id: 1 }), null);
  assert.equal(getGeoAdminRevocationBlocker({ ...staff, role: "moderator" }, { id: 1 }), null);
});

test("revocation strips staff access and preserves other portal access", () => {
  assert.deepEqual(buildGeoAdminRevocationUpdate(staff), {
    role: "user",
    previousRole: null,
    gateUsername: null,
    geoAdminCodeHash: null,
    portalAccess: ["general", "community"],
  });
  const artistMode = buildGeoAdminRevocationUpdate({
    ...staff,
    role: "artist",
    previousRole: "moderator",
    portalAccess: ["artist", "geo-admin"],
  });
  assert.equal(artistMode.role, "artist");
  assert.equal(artistMode.previousRole, null);
  assert.deepEqual(artistMode.portalAccess, ["artist"]);

  const existingAccount = buildGeoAdminRevocationUpdate({
    ...staff,
    role: "admin",
    previousRole: "business_owner",
    portalAccess: ["general", "business", "geo-admin"],
  });
  assert.deepEqual(existingAccount, {
    role: "business_owner",
    previousRole: null,
    gateUsername: null,
    geoAdminCodeHash: null,
    portalAccess: ["general", "business"],
  });
});

test("existing-account invitations require verified, non-staff users", () => {
  const eligible = {
    role: "business_owner",
    previousRole: null,
    gateUsername: null,
    portalAccess: ["general", "business"],
    isVerified: true,
  };
  assert.equal(canLinkExistingUserToGeoAdmin(eligible), true);
  assert.equal(canLinkExistingUserToGeoAdmin({ ...eligible, isVerified: false }), false);
  assert.equal(canLinkExistingUserToGeoAdmin({ ...eligible, role: "superuser" }), false);
  assert.equal(canLinkExistingUserToGeoAdmin({ ...eligible, role: "admin" }), false);
  assert.equal(canLinkExistingUserToGeoAdmin({ ...eligible, gateUsername: "already_staff" }), false);
  assert.equal(canLinkExistingUserToGeoAdmin({ ...eligible, portalAccess: ["general", "geo-admin"] }), false);
});

test("existing-account acceptance payload requires only a token", () => {
  assert.equal(
    acceptExistingGeoAdminInvitationSchema.safeParse({ token: "gai_token" }).success,
    true,
  );
  assert.equal(
    acceptExistingGeoAdminInvitationSchema.safeParse({
      token: "gai_token",
      password: "anything",
    }).success,
    false,
  );
});

const acceptedInvite = {
  status: "accepted",
  acceptedUserId: 10,
  email: "OPS@company.com",
  role: "admin",
};

test("managed staff role includes artist-mode staff only", () => {
  assert.equal(getGeoAdminManagedStaffRole({ role: "moderator" }), "moderator");
  assert.equal(
    getGeoAdminManagedStaffRole({ role: "artist", previousRole: "admin" }),
    "admin",
  );
  assert.equal(getGeoAdminManagedStaffRole({ role: "user", previousRole: "admin" }), null);
  assert.equal(getGeoAdminManagedStaffRole({ role: "superuser" }), null);
});

test("only accounts created by a matching accepted invitation are managed", () => {
  assert.equal(isInvitationLinkedGeoAdmin(staff, acceptedInvite), true);
  assert.equal(
    isInvitationLinkedGeoAdmin(
      { ...staff, role: "artist", previousRole: "admin" },
      acceptedInvite,
    ),
    true,
  );
  // Pre-existing admin/moderator with no invitation.
  assert.equal(isInvitationLinkedGeoAdmin(staff, null), false);
  assert.equal(isInvitationLinkedGeoAdmin(staff, undefined), false);
  // Invitation not accepted, already revoked, or for another account.
  for (const status of ["pending", "revoked", "expired", "delivery_failed"]) {
    assert.equal(isInvitationLinkedGeoAdmin(staff, { ...acceptedInvite, status }), false);
  }
  assert.equal(
    isInvitationLinkedGeoAdmin(staff, { ...acceptedInvite, acceptedUserId: 11 }),
    false,
  );
  assert.equal(
    isInvitationLinkedGeoAdmin(staff, { ...acceptedInvite, acceptedUserId: null }),
    false,
  );
  // Email or role drifted from what the invitation granted.
  assert.equal(
    isInvitationLinkedGeoAdmin(staff, { ...acceptedInvite, email: "other@company.com" }),
    false,
  );
  assert.equal(
    isInvitationLinkedGeoAdmin(staff, { ...acceptedInvite, role: "moderator" }),
    false,
  );
});

test("managed revocation blocks unlinked admins and keeps protected-account checks", () => {
  assert.equal(getGeoAdminManagedRevocationBlocker(staff, acceptedInvite, { id: 1 }), null);
  assert.equal(
    getGeoAdminManagedRevocationBlocker(staff, null, { id: 1 })?.code,
    "GEOADMIN_ACCESS_NOT_FOUND",
  );
  assert.equal(
    getGeoAdminManagedRevocationBlocker(staff, { ...acceptedInvite, role: "moderator" }, { id: 1 })
      ?.status,
    404,
  );
  assert.equal(
    getGeoAdminManagedRevocationBlocker(staff, acceptedInvite, { id: 10 })?.code,
    "SELF_REVOCATION_FORBIDDEN",
  );
  assert.equal(
    getGeoAdminManagedRevocationBlocker(
      { ...staff, role: "superuser" },
      { ...acceptedInvite, role: "superuser" },
      { id: 1 },
    )?.code,
    "PROTECTED_ACCOUNT",
  );
  assert.equal(
    getGeoAdminManagedRevocationBlocker(staff, acceptedInvite, { id: 1 }, "ops@company.com")?.code,
    "PROTECTED_ACCOUNT",
  );
});
