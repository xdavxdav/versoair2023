import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeBase32Secret,
  generateTotpCode,
  isValidTotpSecret,
  verifyTotpCode,
} from "./totp";

const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

test("generates RFC 6238 SHA-1 TOTP vectors", () => {
  assert.equal(generateTotpCode(RFC_SECRET, 59_000), "287082");
  assert.equal(generateTotpCode(RFC_SECRET, 1_111_111_109_000), "081804");
});

test("accepts codes only in the configured adjacent time window", () => {
  const now = 1_700_000_000_000;
  const previousCode = generateTotpCode(RFC_SECRET, now - 30_000);
  assert.notEqual(verifyTotpCode(RFC_SECRET, previousCode, now), null);
  assert.equal(verifyTotpCode(RFC_SECRET, "not-a-code", now), null);
  assert.equal(verifyTotpCode(RFC_SECRET, "000000", now), null);
});

test("rejects invalid or short Base32 secrets", () => {
  assert.throws(() => decodeBase32Secret("NOT*A*SECRET"));
  assert.throws(() => decodeBase32Secret("ABC"));
  assert.equal(isValidTotpSecret(""), false);
  assert.equal(isValidTotpSecret(RFC_SECRET), true);
});
