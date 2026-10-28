import assert from "node:assert/strict";
import test from "node:test";

import { revokeSessionForLogout } from "./logout-session.ts";

test("revokes the current token before reporting logout success", async () => {
  const revokedTokens: string[] = [];

  const error = await revokeSessionForLogout("session-token", async (token) => {
    revokedTokens.push(token);
  });

  assert.equal(error, null);
  assert.deepEqual(revokedTokens, ["session-token"]);
});

test("returns the revocation error so logout cannot report false success", async () => {
  const error = await revokeSessionForLogout("session-token", async () => {
    throw new Error("database unavailable");
  });

  assert.ok(error instanceof Error);
  assert.equal(error.message, "database unavailable");
});

test("does not require a revocation when no token was supplied", async () => {
  let revokeCalled = false;

  const error = await revokeSessionForLogout(null, async () => {
    revokeCalled = true;
  });

  assert.equal(error, null);
  assert.equal(revokeCalled, false);
});
