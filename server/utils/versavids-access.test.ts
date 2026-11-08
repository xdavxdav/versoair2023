import assert from "node:assert/strict";
import test from "node:test";
import {
  DELIVERABLE_DECISIONS,
  PROJECT_STATUS_UPDATES,
  projectAccess,
} from "./versavids-access";

test("projectAccess compares ids numerically: the session id is a string, the column is an int", () => {
  const project = { client_id: 5, claimed_by: 9 };
  assert.deepEqual(projectAccess(project, { userId: "5", role: "customer" }), {
    isStaff: false,
    isClient: true,
    isVideaste: false,
  });
  assert.deepEqual(projectAccess(project, { userId: "9", role: "customer" }), {
    isStaff: false,
    isClient: false,
    isVideaste: true,
  });
  assert.deepEqual(projectAccess(project, { userId: 5, role: "customer" }), {
    isStaff: false,
    isClient: true,
    isVideaste: false,
  });
});

test("an unclaimed project has no videaste, and strangers get nothing", () => {
  assert.deepEqual(projectAccess({ client_id: 5, claimed_by: null }, { userId: "9" }), {
    isStaff: false,
    isClient: false,
    isVideaste: false,
  });
  assert.deepEqual(projectAccess({ client_id: 5, claimed_by: 9 }, { userId: "77" }), {
    isStaff: false,
    isClient: false,
    isVideaste: false,
  });
});

test("a missing or malformed user id never matches a missing party", () => {
  const project = { client_id: null, claimed_by: undefined };
  for (const userId of [undefined, null, "", "0", 0, true, "abc"]) {
    const access = projectAccess(project, { userId: userId as never });
    assert.equal(access.isClient, false, String(userId));
    assert.equal(access.isVideaste, false, String(userId));
  }
  assert.deepEqual(projectAccess({ client_id: 1, claimed_by: 2 }, null), {
    isStaff: false,
    isClient: false,
    isVideaste: false,
  });
});

test("staff roles are recognised regardless of project membership", () => {
  const project = { client_id: 5, claimed_by: 9 };
  for (const role of ["admin", "superuser", "moderator"]) {
    assert.equal(projectAccess(project, { userId: 1, role }).isStaff, true, role);
  }
  assert.equal(projectAccess(project, { userId: 1, role: "customer" }).isStaff, false);
});

test("status updates cannot jump to the claim-only states, deliverable decisions are closed", () => {
  assert.equal(PROJECT_STATUS_UPDATES.includes("open"), false);
  assert.equal(PROJECT_STATUS_UPDATES.includes("claimed"), false);
  assert.equal(PROJECT_STATUS_UPDATES.includes("completed"), true);
  assert.deepEqual([...DELIVERABLE_DECISIONS].sort(), ["approved", "revision_requested"]);
});
