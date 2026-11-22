import assert from "node:assert/strict";
import { test } from "node:test";
import { artistGenreCondition, textGenreCondition } from "./genre-filter";

test("text condition binds the expanded value list as one array parameter", () => {
  const c = textGenreCondition("mt.genre", "Zouglou", 3);
  assert.ok(c);
  assert.match(c.sql, /LOWER\(BTRIM\(mt\.genre\)\) = ANY\(\$3::text\[\]\)/);
  assert.deepEqual(c.params, [["zouglou"]]);
});

test("blank input adds no condition", () => {
  assert.equal(textGenreCondition("a.genre", "", 1), null);
  assert.equal(artistGenreCondition(undefined, 1), null);
});

test("artist condition covers string and array genres with the same placeholder", () => {
  const c = artistGenreCondition("Hip-Hop", 2);
  assert.ok(c);
  assert.equal((c.sql.match(/\$2::text\[\]/g) || []).length, 2);
  assert.match(c.sql, /jsonb_array_elements_text/);
  assert.ok(c.params[0].includes("hip-hop & rap"));
});
