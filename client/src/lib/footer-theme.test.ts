import assert from "node:assert/strict";
import test from "node:test";
import { SECTOR_CONFIGS } from "../components/sector-directory/sector-configs";
import { getFooterTheme } from "./footer-theme";

test("the entertainment directory gets the playful footer", () => {
  const theme = getFooterTheme("/divertissement");
  assert.equal(theme?.tone, "playful");
});

test("matching ignores case, trailing slashes, query strings and hashes", () => {
  for (const path of ["/Divertissement", "/divertissement/", "/divertissement?city=Toronto", "/divertissement#top"]) {
    assert.equal(getFooterTheme(path)?.tone, "playful", path);
  }
});

test("other pages keep the default footer", () => {
  for (const path of [
    "/",
    "",
    "/commerce",
    "/hotellerie",
    "/businesses-directory",
    "/divertissement/extra",
    "/events/divertissement",
    "/constructor",
    "/__proto__",
  ]) {
    assert.equal(getFooterTheme(path), null, path);
  }
});

test("footer accents stay in sync with the sector configs", () => {
  for (const [key, config] of Object.entries(SECTOR_CONFIGS)) {
    const theme = getFooterTheme(`/${key}`);
    if (config.tone === "playful") {
      assert.ok(theme, `${key} is playful but has no footer theme`);
      assert.equal(theme.accent, config.accent, `${key} accent`);
      assert.equal(theme.accentDark, config.accentDark, `${key} accentDark`);
    } else {
      assert.equal(theme, null, `${key} is ${config.tone} and should keep the default footer`);
    }
  }
});
