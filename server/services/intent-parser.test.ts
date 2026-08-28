import test from "node:test";
import assert from "node:assert/strict";

import { parseUserIntentSync } from "./intent-parser.ts";

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
