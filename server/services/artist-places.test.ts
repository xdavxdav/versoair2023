import test from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET ||= "local-test-only-secret-0123456789abcdef";
process.env.DATABASE_URL ||= "postgres://u:p@127.0.0.1:1/test";

test("slugifyPlace strips accents and punctuation", async () => {
  const { slugifyPlace } = await import("./artist-places");
  assert.equal(slugifyPlace("Biétry"), "bietry");
  assert.equal(slugifyPlace("  North  York "), "north-york");
  assert.equal(slugifyPlace("Côte-d'Or!"), "cote-d-or");
});

test("cleanPlaceName trims and collapses whitespace", async () => {
  const { cleanPlaceName } = await import("./artist-places");
  assert.equal(cleanPlaceName("  Cardiff   Bay "), "Cardiff Bay");
  assert.equal(cleanPlaceName(undefined), "");
});
