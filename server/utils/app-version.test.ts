import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAppVersion, getAppVersion } from "./app-version";

const SHA = "d212a0b3f9c1e5a7b8d4c6e2f0a1b3c5d7e9f102";

test("appends the first seven characters of the deployed commit", () => {
  assert.equal(formatAppVersion("1.0.0", SHA), "1.0.0+d212a0b");
});

test("lowercases the commit and tolerates surrounding whitespace", () => {
  assert.equal(formatAppVersion("1.0.0", `  ${SHA.toUpperCase()}\n`), "1.0.0+d212a0b");
});

test("leaves the version alone without a usable commit", () => {
  for (const commit of [undefined, "", "   ", "abc", "not-a-commit", "xyz1234"]) {
    assert.equal(formatAppVersion("1.0.0", commit), "1.0.0", String(commit));
  }
});

test("does not add a second build suffix", () => {
  assert.equal(formatAppVersion("2.1.0+custom", SHA), "2.1.0+custom");
});

test("APP_VERSION wins over package.json and still gets the commit", () => {
  assert.equal(
    getAppVersion({ APP_VERSION: "9.9.9", RENDER_GIT_COMMIT: SHA }),
    "9.9.9+d212a0b",
  );
});

test("falls back to the package.json version, with or without a commit", () => {
  assert.match(getAppVersion({}), /^\d+\.\d+\.\d+$/);
  assert.match(getAppVersion({ RENDER_GIT_COMMIT: SHA }), /^\d+\.\d+\.\d+\+d212a0b$/);
});
