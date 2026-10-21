import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { matchGeoAdminStaffCode } from "./geoadmin-staff-codes";

function hash(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

test("matches a configured unique code to each staff username", () => {
  const environment = {
    GEOADMIN_STAFF_CODE_HASHES: JSON.stringify({
      ops_lead: hash("ABC-123-XYZ"),
      regional_admin: hash("DEF-456-UVW"),
    }),
  };

  assert.equal(matchGeoAdminStaffCode("abc-123-xyz", environment), "ops_lead");
  assert.equal(
    matchGeoAdminStaffCode("DEF-456-UVW", environment),
    "regional_admin",
  );
  assert.equal(matchGeoAdminStaffCode("GHI-789-RST", environment), null);
});

test("keeps configured owner code separate from staff codes", () => {
  assert.equal(
    matchGeoAdminStaffCode("ABC-123-XYZ", {
      SUPERADMIN_GEOADMIN_CODE_HASH: hash("ABC-123-XYZ"),
    }),
    "superadmin",
  );
});

test("rejects a shared code hash for multiple GeoAdmin identities", () => {
  const sharedHash = hash("ABC-123-XYZ");
  assert.throws(
    () =>
      matchGeoAdminStaffCode("ABC-123-XYZ", {
        GEOADMIN_STAFF_CODE_HASHES: JSON.stringify({
          ops_lead: sharedHash,
          regional_admin: sharedHash,
        }),
      }),
    /different access code/,
  );
  assert.throws(
    () =>
      matchGeoAdminStaffCode("ABC-123-XYZ", {
        GEOADMIN_STAFF_CODE_HASHES: JSON.stringify({ ops_lead: sharedHash }),
        SUPERADMIN_GEOADMIN_CODE_HASH: sharedHash,
      }),
    /unique to the owner/,
  );
});

test("rejects malformed code configuration rather than ignoring it", () => {
  assert.throws(
    () =>
      matchGeoAdminStaffCode("ABC-123-XYZ", {
        GEOADMIN_STAFF_CODE_HASHES: "not-json",
      }),
    /must be a JSON object/,
  );
  assert.throws(
    () =>
      matchGeoAdminStaffCode("ABC-123-XYZ", {
        GEOADMIN_STAFF_CODE_HASHES: JSON.stringify({ ops_lead: "bad-hash" }),
      }),
    /invalid SHA-256 hash/,
  );
});
