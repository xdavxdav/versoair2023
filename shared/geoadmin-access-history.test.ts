import assert from "node:assert/strict";
import test from "node:test";
import {
  geoAdminHistoryQuerySchema,
  toGeoAdminHistoryEntry,
} from "./geoadmin-access-history";

const base = {
  id: "a1",
  action: "GEOADMIN_INVITATION_ACCEPTED",
  createdAt: new Date("2026-10-29T12:00:00.000Z"),
  actorEmail: "staff@example.com",
};

test("history entries expose only whitelisted fields", () => {
  const entry = toGeoAdminHistoryEntry({
    ...base,
    changes: {
      email: "staff@example.com",
      role: "admin",
      gateUsername: "staff1",
      accessCodeIssued: true,
      geoAdminAccessCode: "ABC-123-DEF",
      codeHash: "f".repeat(64),
      token: "secret-token",
    },
  });
  assert.deepEqual(entry, {
    id: "a1",
    action: "GEOADMIN_INVITATION_ACCEPTED",
    createdAt: "2026-10-29T12:00:00.000Z",
    actorEmail: "staff@example.com",
    accountEmail: "staff@example.com",
    role: "admin",
    gateUsername: "staff1",
    codeIssued: true,
    credentialKind: null,
  });
  const serialized = JSON.stringify(entry);
  for (const secret of ["ABC-123-DEF", "f".repeat(64), "secret-token"]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("revocations fall back to previous role and drafts keep only the kind", () => {
  const revoked = toGeoAdminHistoryEntry({
    ...base,
    action: "GEOADMIN_ACCESS_REVOKED",
    changes: { email: "mod@example.com", before: { role: "moderator", gateUsername: "mod1" } },
  });
  assert.equal(revoked.role, "moderator");
  assert.equal(revoked.gateUsername, "mod1");
  assert.equal(revoked.codeIssued, false);

  const draft = toGeoAdminHistoryEntry({
    ...base,
    action: "GEOADMIN_OWNER_CREDENTIAL_DRAFT_GENERATED",
    changes: { kind: "authenticator", activated: false, secret: "NOPE" },
  });
  assert.equal(draft.credentialKind, "authenticator");
  assert.equal(JSON.stringify(draft).includes("NOPE"), false);

  const malformed = toGeoAdminHistoryEntry({ ...base, createdAt: null, changes: ["x"] });
  assert.equal(malformed.createdAt, null);
  assert.equal(malformed.accountEmail, null);
});

test("history query accepts only a bounded offset", () => {
  assert.deepEqual(geoAdminHistoryQuerySchema.parse({}), { offset: 0 });
  assert.deepEqual(geoAdminHistoryQuerySchema.parse({ offset: "50" }), { offset: 50 });
  assert.equal(geoAdminHistoryQuerySchema.safeParse({ offset: "-1" }).success, false);
  assert.equal(geoAdminHistoryQuerySchema.safeParse({ limit: "999" }).success, false);
});
