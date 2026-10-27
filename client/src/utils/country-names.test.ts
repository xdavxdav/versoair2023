import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareCountryNames,
  localizedCountryName,
  normalizeSearch,
} from "./country-names";

const SERVED_CODES = [
  "DZ", "BE", "BJ", "BR", "BF", "CM", "CA", "CN", "CG", "CI", "CD", "FR", "GA", "DE",
  "GN", "HT", "IN", "IT", "JP", "MG", "ML", "MX", "MA", "NE", "NG", "PT", "SN", "ZA",
  "ES", "CH", "TG", "TN", "AE", "GB", "US",
];

test("country names follow the language the visitor reads", () => {
  assert.equal(localizedCountryName("BE", "fr", "Belgium"), "Belgique");
  assert.equal(localizedCountryName("BE", "en", "Belgique"), "Belgium");
  assert.equal(localizedCountryName("BE", "es", "Belgium"), "Bélgica");
  assert.equal(localizedCountryName("be", "fr-BE", "Belgium"), "Belgique");
  assert.equal(localizedCountryName("AE", "fr", "United Arab Emirates"), "Émirats arabes unis");
});

test("the two Congos stay unambiguous in every bundled language", () => {
  assert.equal(localizedCountryName("CD", "en", "x"), "Congo (DRC)");
  assert.equal(localizedCountryName("CD", "fr", "x"), "Congo (RDC)");
  assert.equal(localizedCountryName("CD", "es", "x"), "Congo (RDC)");
  for (const language of ["en", "fr", "es"]) {
    assert.equal(localizedCountryName("CG", language, "x"), "Congo (Brazzaville)");
  }
});

test("every served country has a real name in each bundled language", () => {
  for (const language of ["fr", "en", "es"]) {
    for (const code of SERVED_CODES) {
      const name = localizedCountryName(code, language, "FALLBACK");
      assert.notEqual(name, "FALLBACK", `${language}/${code}`);
      assert.notEqual(name, code, `${language}/${code}`);
    }
  }
});

test("unknown regions and malformed languages fall back to the stored name", () => {
  assert.equal(localizedCountryName("XX", "fr", "Nowhere"), "Nowhere");
  assert.equal(localizedCountryName("BE", "not a language!", "Belgium"), "Belgium");
});

test("country sorting uses the collation of the active language", () => {
  const sorted = ["Zambie", "Égypte", "Allemagne", "Espagne"].sort(compareCountryNames("fr"));
  assert.deepEqual(sorted, ["Allemagne", "Égypte", "Espagne", "Zambie"]);
});

test("search ignores accents, case and apostrophe style", () => {
  assert.equal(normalizeSearch("Côte d’Ivoire"), "cote d'ivoire");
  assert.equal(normalizeSearch("BÉLGICA"), "belgica");
  assert.ok(normalizeSearch(localizedCountryName("CI", "fr", "Ivory Coast")).includes(normalizeSearch("cote d'iv")));
});
