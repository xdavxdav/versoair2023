const assert = require("node:assert/strict");
const test = require("node:test");
const {
  encodeBase32,
  generateSuperadminTotpSecret,
} = require("../generate-superadmin-totp-secret.cjs");

test("generates a private 256-bit Base32 TOTP secret", () => {
  const secret = generateSuperadminTotpSecret();
  assert.match(secret, /^[A-Z2-7]{52}$/);
});

test("Base32 encoding uses the expected alphabet and output length", () => {
  assert.equal(encodeBase32(Buffer.from([0xff, 0x00])), "74AA");
});
