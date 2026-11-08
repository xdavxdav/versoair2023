import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A full page load destroys the global <audio> element and stops the music.
// In-app links on these screens must use SPA navigation.
const files = [
  "client/src/components/ui/navbar.tsx",
  "client/src/components/ui/music-portal.tsx",
  "client/src/pages/music/vault.tsx",
  "client/src/pages/artist-portal.tsx",
  "client/src/pages/user-profile.tsx",
];

for (const f of files) {
  test(`${f} navigates without a full page reload`, () => {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, /window\.location\.href\s*=\s*[`"'(]?(\/|window\.location\.origin)/);
  });
}
