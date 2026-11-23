import assert from "node:assert/strict";
import test from "node:test";
import {
  getLegacySignInRedirect,
  getSafeReturnPath,
  getSafeSignInBackTarget,
} from "./auth-route-redirect";

test("safe return paths preserve local path, query, and hash", () => {
  assert.equal(
    getSafeReturnPath("/pricing?plan=essential#plans", "https://versoair.test"),
    "/pricing?plan=essential#plans",
  );
});

test("safe return paths reject external, malformed, and sign-in destinations", () => {
  for (const target of [
    null,
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/auth/signin?redirect=%2Fpricing",
  ]) {
    assert.equal(getSafeReturnPath(target, "https://versoair.test"), null);
  }
});

test("legacy sign-in redirects preserve the requested destination and hash", () => {
  assert.equal(
    getLegacySignInRedirect("?redirect=%2Fcontracts%3Ftab%3Dquotes", "#login"),
    "/auth/signin?redirect=%2Fcontracts%3Ftab%3Dquotes#login",
  );
});

test("legacy sign-in redirects work without optional URL components", () => {
  assert.equal(getLegacySignInRedirect("", ""), "/auth/signin");
});

test("an older returnTo link keeps its destination as redirect", () => {
  assert.equal(
    getLegacySignInRedirect("?returnTo=%2Fmessages", ""),
    "/auth/signin?redirect=%2Fmessages",
  );
});

test("renaming returnTo leaves other parameters and the hash untouched", () => {
  assert.equal(
    getLegacySignInRedirect("?a=1&returnTo=%2Fmessages%3Ftab%3Dx&b=%20z", "#login"),
    "/auth/signin?a=1&redirect=%2Fmessages%3Ftab%3Dx&b=%20z#login",
  );
});

test("an explicit redirect wins over returnTo", () => {
  assert.equal(
    getLegacySignInRedirect("?redirect=%2Fa&returnTo=%2Fb", ""),
    "/auth/signin?redirect=%2Fa&returnTo=%2Fb",
  );
});

test("similarly named parameters are not rewritten", () => {
  assert.equal(
    getLegacySignInRedirect("?returnToX=1&notreturnTo=2", ""),
    "/auth/signin?returnToX=1&notreturnTo=2",
  );
});

test("only the first returnTo becomes the destination", () => {
  assert.equal(
    getLegacySignInRedirect("?returnTo=%2Fa&returnTo=%2Fb", ""),
    "/auth/signin?redirect=%2Fa&returnTo=%2Fb",
  );
});

test("sign-in Back target avoids bouncing into auth-required routes", () => {
  assert.equal(
    getSafeSignInBackTarget("/messages", "https://versoair.test"),
    "/blog",
  );
  assert.equal(
    getSafeSignInBackTarget("/profile", "https://versoair.test"),
    "/blog",
  );
  assert.equal(
    getSafeSignInBackTarget("/dashboard", "https://versoair.test"),
    "/",
  );
  assert.equal(
    getSafeSignInBackTarget("/services/careers/dashboard", "https://versoair.test"),
    "/services/careers",
  );
  assert.equal(
    getSafeSignInBackTarget("/contracts", "https://versoair.test"),
    "/services/contractors",
  );
  assert.equal(
    getSafeSignInBackTarget("/pricing?plan=essential", "https://versoair.test"),
    "/pricing?plan=essential",
  );
});
