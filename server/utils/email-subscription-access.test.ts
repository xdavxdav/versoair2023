import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSubscriptionOwner } from "./email-subscription-access";

test("email subscription targets the authenticated user when no id is supplied", () => {
  assert.deepEqual(resolveSubscriptionOwner("7", undefined), {
    ok: true,
    userId: 7,
  });
});

test("email subscription accepts an explicit self id", () => {
  assert.deepEqual(resolveSubscriptionOwner("7", "7"), {
    ok: true,
    userId: 7,
  });
});

test("email subscription rejects attempts to subscribe another account", () => {
  assert.deepEqual(resolveSubscriptionOwner("7", 8), {
    ok: false,
    status: 403,
    error: "Cannot change another user's subscriptions",
  });
});

test("email subscription rejects an invalid session id", () => {
  for (const id of [undefined, "", "0", "not-an-id", -1]) {
    assert.equal(resolveSubscriptionOwner(id, undefined).status, 401);
  }
});
