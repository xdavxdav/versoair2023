import assert from "node:assert/strict";
import test from "node:test";

import { FOOTER_SOCIAL_LINKS } from "@shared/footer-links";
import { generateOrganizationJsonLd } from "./json-ld-generator.ts";

test("organization sameAs lists exactly the footer's social profiles", () => {
  const { sameAs } = generateOrganizationJsonLd() as { sameAs: string[] };
  assert.deepEqual(
    sameAs,
    FOOTER_SOCIAL_LINKS.map(({ href }) => href),
  );
  assert.ok(sameAs.includes("https://www.linkedin.com/company/144004640/"));
});

test("organization sameAs no longer contains the guessed profile slugs", () => {
  const { sameAs } = generateOrganizationJsonLd() as { sameAs: string[] };
  for (const guessed of [
    "linkedin.com/company/versoair",
    "facebook.com/versoair",
  ]) {
    assert.ok(
      sameAs.every((href) => !href.includes(guessed)),
      `sameAs still contains ${guessed}`,
    );
  }
});
