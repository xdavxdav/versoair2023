import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SECTOR_CONFIGS } from "../components/sector-directory/sector-configs";
import { FOOTER_THEME } from "./footer-theme";

test("the footer accents stay in sync with the entertainment theme", () => {
  const config = SECTOR_CONFIGS.divertissement;
  assert.equal(config.tone, "playful");
  assert.equal(FOOTER_THEME.tone, "playful");
  assert.equal(FOOTER_THEME.accent, config.accent);
  assert.equal(FOOTER_THEME.accentDark, config.accentDark);
});

test("the footer applies the theme on every page instead of per route", () => {
  const source = readFileSync(new URL("../components/ui/footer.tsx", import.meta.url), "utf8");
  assert.match(source, /data-footer-tone=\{FOOTER_THEME\.tone\}/);
  assert.doesNotMatch(source, /useLocation/);
});
