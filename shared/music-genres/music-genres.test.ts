import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalGenreName, genreFilterValues, listGenres, MUSIC_GENRES } from "./index";

test("slugs and names are unique and parents exist", () => {
  const slugs = new Set(MUSIC_GENRES.map((g) => g.slug));
  assert.equal(slugs.size, MUSIC_GENRES.length);
  assert.equal(new Set(MUSIC_GENRES.map((g) => g.name.toLowerCase())).size, MUSIC_GENRES.length);
  for (const g of MUSIC_GENRES) {
    if (g.parent) assert.ok(slugs.has(g.parent), `${g.slug} parent ${g.parent}`);
  }
});

test("every genre is sourced with a URL and evidence", () => {
  for (const g of MUSIC_GENRES) {
    assert.ok(g.sources.length > 0, g.slug);
    for (const s of g.sources) {
      assert.match(s.url, /^https:\/\//, g.slug);
      assert.ok(s.evidence.length > 10, g.slug);
    }
  }
});

test("Côte d'Ivoire and Canada carry their verified styles", () => {
  const ci = listGenres("CI").map((g) => g.name);
  for (const n of ["Zouglou", "Coupé-Décalé", "Rap Ivoire", "Nouchi Rap", "Drill Ivoire"]) {
    assert.ok(ci.includes(n), n);
  }
  assert.ok(ci.includes("Hip-Hop"), "parent family is listed with its CI styles");
  assert.ok(listGenres("CA").some((g) => g.name === "Néo-trad"));
  assert.ok(!listGenres("CA").some((g) => g.name === "Zouglou"));
});

test("legacy free text maps to the canonical genre", () => {
  assert.equal(canonicalGenreName("Hip-hop & Rap"), "Hip-Hop");
  assert.equal(canonicalGenreName("coupe decale"), "Coupé-Décalé");
  assert.equal(canonicalGenreName("Totally Unknown"), "Totally Unknown");
});

test("filter matches aliases and sub-styles exactly, never substrings", () => {
  const hh = genreFilterValues("hip hop");
  assert.ok(hh.includes("hip-hop & rap"));
  assert.ok(hh.includes("rap ivoire"));
  assert.ok(hh.includes("nouchi rap"));
  assert.deepEqual(genreFilterValues("  "), []);
  assert.deepEqual(genreFilterValues("Mystery"), ["mystery"]);
  assert.ok(!genreFilterValues("Rock").includes("punk"), "Rock does not include punk family");
});
