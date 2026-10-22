const { createHash, randomInt } = require("node:crypto");

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const IDENTITIES = {
  owner: {
    label: "SuperAdmin owner",
    variable: "SUPERADMIN_GEOADMIN_CODE_HASH",
  },
  admin: {
    label: "GeoAdmin admin (admin_025)",
    variable: "STAFF_CODE_HASH_ADMIN",
  },
  moderator: {
    label: "GeoAdmin moderator (mod_010)",
    variable: "STAFF_CODE_HASH_MOD",
  },
};

function pickCharacters(alphabet, count) {
  return Array.from({ length: count }, () => alphabet[randomInt(alphabet.length)]).join("");
}

function generateGeoAdminCode() {
  return `${pickCharacters(LETTERS, 3)}-${pickCharacters(DIGITS, 3)}-${pickCharacters(LETTERS, 3)}`;
}

function hashGeoAdminCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

function main(identity) {
  const config = IDENTITIES[identity];
  if (!config) {
    console.error(
      "Choose one identity: owner, admin, or moderator.\n" +
        "Example: npm run security:generate-geoadmin-code -- owner",
    );
    process.exitCode = 1;
    return;
  }

  const code = generateGeoAdminCode();
  console.log(`Identity: ${config.label}`);
  console.log(`Raw code (save privately): ${code}`);
  console.log(`Render variable: ${config.variable}`);
  console.log(`Matching SHA-256 hash: ${hashGeoAdminCode(code)}`);
  console.log(
    "Keep the raw code in a password manager. Store only the hash in Render; never post either value publicly.",
  );
}

module.exports = { generateGeoAdminCode, hashGeoAdminCode, main };

if (require.main === module) {
  main(process.argv[2]);
}
