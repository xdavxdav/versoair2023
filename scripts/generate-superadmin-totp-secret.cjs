const { randomBytes } = require("node:crypto");

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(buffer) {
  let bits = 0;
  let value = 0;
  let encoded = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    encoded += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return encoded;
}

function generateSuperadminTotpSecret() {
  return encodeBase32(randomBytes(32));
}

function main() {
  console.log("New owner TOTP secret (save privately):");
  console.log(generateSuperadminTotpSecret());
  console.log("Render variable: SUPERADMIN_TOTP_SECRET");
  console.log(
    "Add the secret to your authenticator app and store it only in Render and your local ignored .env.",
  );
}

module.exports = { encodeBase32, generateSuperadminTotpSecret, main };

if (require.main === module) {
  main();
}
