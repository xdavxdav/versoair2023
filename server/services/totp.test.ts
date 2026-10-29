import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTotpUri,
  decodeBase32Secret,
  generateTotpCode,
  generateTotpSecret,
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

test("generates authenticator-ready secrets and URIs", () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]{52}$/);
  assert.equal(decodeBase32Secret(secret).length, 32);
  assert.equal(isValidTotpSecret(secret), true);
  assert.notEqual(generateTotpSecret(), secret);

  const now = 1_700_000_000_000;
  assert.notEqual(verifyTotpCode(secret, generateTotpCode(secret, now), now), null);

  const uri = new URL(buildTotpUri(secret, "owner@example.com"));
  assert.equal(uri.protocol, "otpauth:");
  assert.equal(uri.host, "totp");
  assert.equal(decodeURIComponent(uri.pathname), "/Verso Air:owner@example.com");
  assert.equal(uri.searchParams.get("secret"), secret);
  assert.equal(uri.searchParams.get("issuer"), "Verso Air");
  assert.equal(uri.searchParams.get("digits"), "6");
  assert.equal(uri.searchParams.get("period"), "30");
  assert.throws(() => buildTotpUri("bad*secret", "owner@example.com"));
});
