import assert from "node:assert/strict";
import test from "node:test";
import { getLegacySignInRedirect } from "./auth-route-redirect";

test("legacy sign-in redirects preserve the requested destination and hash", () => {
  assert.equal(
    getLegacySignInRedirect("?redirect=%2Fcontracts%3Ftab%3Dquotes", "#login"),
    "/auth/signin?redirect=%2Fcontracts%3Ftab%3Dquotes#login",
  );
});

test("legacy sign-in redirects work without optional URL components", () => {
  assert.equal(getLegacySignInRedirect("", ""), "/auth/signin");
});
