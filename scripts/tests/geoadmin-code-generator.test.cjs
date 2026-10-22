const assert = require("node:assert/strict");
const test = require("node:test");
const {
  generateGeoAdminCode,
  hashGeoAdminCode,
} = require("../generate-geoadmin-code.cjs");

test("generates a correctly shaped code with a matching SHA-256 hash", () => {
  const code = generateGeoAdminCode();
  assert.match(code, /^[A-Z]{3}-[0-9]{3}-[A-Z]{3}$/);
  assert.match(hashGeoAdminCode(code), /^[0-9a-f]{64}$/);
});

test("the same exact code always produces the same hash", () => {
  const code = "ABC-123-XYZ";
  assert.equal(hashGeoAdminCode(code), hashGeoAdminCode(code));
  assert.notEqual(hashGeoAdminCode(code), hashGeoAdminCode("ABC-123-XYA"));
});
