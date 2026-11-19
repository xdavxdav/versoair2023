import test from "node:test";
import assert from "node:assert/strict";

import {
  parseUserIntentSync,
  resolveIntentCountryCode,
} from "./intent-parser.ts";

test("honors selected Google Translate language over raw query text", () => {
  assert.equal(
    parseUserIntentSync("je cherche un magasin de vetement a Windsor", "en")
      .language,
    "en",
  );

  assert.equal(
    parseUserIntentSync("i need a bike shop in Toronto", "fr").language,
    "fr",
  );

  assert.equal(
    parseUserIntentSync("magasin de vêtement à Windsor", "fr").language,
    "fr",
  );
});

test("detects Côte d’Ivoire from Yamoussoukro and country-name queries", () => {
  const cityQuery = parseUserIntentSync(
    "I need a hotel in Yamoussoukro, Côte d'Ivoire",
    "en",
  );
  assert.equal(cityQuery.location, "Yamoussoukro");
  assert.equal(cityQuery.countryCode, "CI");

  const countryQuery = parseUserIntentSync("Find a hotel in Ivory Coast", "en");
  assert.equal(countryQuery.countryCode, "CI");
});

test("uses query-detected country before visitor scope and configured fallback", () => {
  assert.equal(resolveIntentCountryCode("CI", "CA", "US"), "CI");
  assert.equal(resolveIntentCountryCode(null, "US", "CA"), "US");
  assert.equal(resolveIntentCountryCode(null, null, "CA"), "CA");
});
