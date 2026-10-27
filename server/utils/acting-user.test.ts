import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveActingUserId } from "./acting-user";

const user = { userId: "7", role: "user" as const };

test("defaults a missing target to the authenticated user", () => {
  assert.deepEqual(resolveActingUserId(user, undefined), {
    ok: true,
    userId: 7,
  });
  assert.deepEqual(resolveActingUserId(user, null), {
    ok: true,
    userId: 7,
  });
  assert.deepEqual(resolveActingUserId(user, ""), {
    ok: true,
    userId: 7,
  });
});

test("allows the authenticated user to act on their own numeric id", () => {
  assert.deepEqual(resolveActingUserId(user, "7"), {
    ok: true,
    userId: 7,
  });
});

test("denies another user's id to an ordinary user", () => {
  assert.deepEqual(resolveActingUserId(user, 8), {
    ok: false,
    status: 403,
    error: "Cannot access another user's account",
  });
});

test("rejects malformed, fractional, unsafe and nonpositive ids", () => {
  for (const id of ["nope", "1.5", 0, -1, Number.MAX_SAFE_INTEGER + 1, {}, []]) {
    assert.equal(resolveActingUserId(user, id).ok, false, String(id));
    assert.equal(resolveActingUserId(user, id).status, 400, String(id));
  }
});

test("requires a valid authenticated session id", () => {
  for (const id of [undefined, "", "0", "not-an-id", "-1"]) {
    assert.equal(
      resolveActingUserId(
        id === undefined ? undefined : { userId: id, role: "user" },
        undefined,
      ).status,
      401,
      String(id),
    );
  }
});

test("allows only explicitly configured staff roles to act as another user", () => {
  assert.deepEqual(
    resolveActingUserId(
      { userId: "7", role: "admin" },
      "8",
      { staffRoles: ["admin", "superuser"] },
    ),
    { ok: true, userId: 8 },
  );
  assert.deepEqual(
    resolveActingUserId(
      { userId: "7", role: "moderator" },
      "8",
      { staffRoles: ["admin", "superuser"] },
    ).status,
    403,
  );
});

test("owner override requires both owner identity and GeoAdmin code", () => {
  assert.equal(
    resolveActingUserId(user, 8, {
      isOwner: true,
      geoAdminCodeAuthenticated: false,
    }).status,
    403,
  );
  assert.equal(
    resolveActingUserId(user, 8, {
      isOwner: false,
      geoAdminCodeAuthenticated: true,
    }).status,
    403,
  );
  assert.deepEqual(
    resolveActingUserId(
      { userId: "7", role: "superuser" },
      8,
      { isOwner: true, geoAdminCodeAuthenticated: true },
    ),
    { ok: true, userId: 8 },
  );
});
