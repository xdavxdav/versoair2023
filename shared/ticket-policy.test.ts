import assert from "node:assert/strict";
import test from "node:test";
import { isConfiguredOwner, isReservedOwnerRole, ownerRoleMutationError } from "./owner-access";
import {
  canReadTicket, canWorkTicket, createTicketSchema, isTicketManager, isTicketStaff,
  transitionError, updateTicketSchema, TICKET_STATUSES, type TicketActor,
} from "./ticket-policy";

const owner: TicketActor = { id: 1, role: "superuser", owner: true };
const admin: TicketActor = { id: 2, role: "admin", owner: false };
const moderator: TicketActor = { id: 3, role: "moderator", owner: false };
const customer: TicketActor = { id: 4, role: "user", owner: false };
const otherSuperuser: TicketActor = { id: 5, role: "superuser", owner: false };
const ticket = { reporter_id: 4, assignee_id: 3, status: "in-progress" };

test("owner requires configured email AND the actual superuser role", () => {
  assert.equal(isConfiguredOwner({ email: " Owner@Example.test ", role: "superuser" }, "owner@example.test"), true);
  for (const role of ["user", "admin", "moderator", "superadmin", null]) {
    assert.equal(isConfiguredOwner({ email: "owner@example.test", role }, "owner@example.test"), false);
  }
  assert.equal(isConfiguredOwner({ email: "other@example.test", role: "superuser" }, "owner@example.test"), false);
  assert.equal(isConfiguredOwner({ email: "owner@example.test", role: "superuser" }, undefined), false);
});
test("staff scope does not treat an arbitrary superuser as owner or support staff", () => {
  assert.equal(isTicketStaff(otherSuperuser), false);
  assert.equal(isTicketManager(otherSuperuser), false);
  assert.equal(canReadTicket(otherSuperuser, ticket), false);
  assert.equal(canReadTicket(admin, { ...ticket, assignee_id: 99 }), true);
  assert.equal(canReadTicket(moderator, { ...ticket, assignee_id: 99 }), false);
  assert.equal(canReadTicket(moderator, { ...ticket, assignee_id: null }), true);
  assert.equal(canWorkTicket(moderator, { ...ticket, assignee_id: null }), false);
  assert.equal(canWorkTicket(moderator, ticket), true);
  assert.equal(canReadTicket(customer, ticket), true);
  assert.equal(canReadTicket({ ...customer, id: 10 }, ticket), false);
});
test("owner status cannot be assigned, cloned or demoted through role management", () => {
  for (const role of ["superuser", "SuperAdmin", " SUPER_USER ", "super-admin", "owner"]) {
    assert.equal(isReservedOwnerRole(role), true);
    assert.match(ownerRoleMutationError(role)!, /cannot be assigned/);
  }
  assert.match(ownerRoleMutationError("admin", "superuser")!, /cannot be changed/);
  assert.equal(ownerRoleMutationError(undefined, "superuser"), null);
  for (const role of ["user", "admin", "moderator", "artist", "business_owner"]) {
    assert.equal(ownerRoleMutationError(role, "user"), null);
  }
});
test("eight states are distinct and transitions are explicit", () => {
  assert.equal(TICKET_STATUSES.length, 8);
  assert.equal(transitionError(moderator, ticket, "pending"), null);
  assert.equal(transitionError(moderator, ticket, "resolved"), null);
  assert.match(transitionError(moderator, ticket, "closed")!, /not allowed/);
  assert.match(transitionError(admin, ticket, "voided")!, /owner/);
  assert.equal(transitionError(owner, ticket, "voided"), null);
  assert.match(transitionError(moderator, { ...ticket, status: "pending" }, "abandoned")!, /Manager/);
  assert.equal(transitionError(admin, { ...ticket, status: "pending" }, "abandoned"), null);
  assert.equal(transitionError(customer, ticket, "withdrawn"), null);
  assert.match(transitionError(admin, ticket, "withdrawn")!, /requester/);
  assert.equal(transitionError(customer, { ...ticket, status: "closed", assignee_id: null }, "open"), null);
  assert.match(transitionError(customer, { ...ticket, status: "voided" }, "open")!, /owner/);
});
test("updates require reasons and pending metadata; reject arbitrary fields", () => {
  assert.equal(updateTicketSchema.safeParse({ status: "resolved" }).success, false);
  assert.equal(updateTicketSchema.safeParse({ status: "pending", reason: "Waiting" }).success, false);
  assert.equal(updateTicketSchema.safeParse({
    status: "pending", reason: "Waiting", pendingReason: "customer", followUpAt: "2026-11-01T12:00:00Z",
  }).success, true);
  assert.equal(updateTicketSchema.safeParse({ status: "resolved", reason: "Done", reporter_id: 99 }).success, false);
  assert.equal(createTicketSchema.safeParse({ title: "Test", status: "closed" }).success, false);
  assert.equal(createTicketSchema.safeParse({ title: "Test", assigneeId: 99 }).success, false);
  assert.equal(createTicketSchema.parse({ title: "Test" }).priority, "medium");
});
