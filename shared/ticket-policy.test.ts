import assert from "node:assert/strict";
import test from "node:test";
import { isConfiguredOwner, isReservedOwnerRole, ownerRoleMutationError } from "./owner-access";
import {
  activeSlaState, approvalError, canReadTicket, canWorkTicket, commentSchema, createTicketSchema, formatMinutes, isSlaPaused,
  isTicketManager, isTicketStaff, linkProblemSchema, problemLinkError, slaComplianceRate, slaPauseMs,
  summarizeActiveSla, transitionError, updateTicketSchema, TICKET_STATUSES, type SlaTicketRow, type TicketActor,
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
  assert.equal(updateTicketSchema.safeParse({ status: "resolved", reason: "Done" }).success, false);
  assert.equal(updateTicketSchema.safeParse({
    status: "resolved", reason: "Done", resolutionCode: "fixed", resolutionNotes: "Restarted the worker",
  }).success, true);
  assert.equal(createTicketSchema.safeParse({ title: "Test", status: "closed" }).success, false);
  assert.equal(createTicketSchema.safeParse({ title: "Test", assigneeId: 99 }).success, false);
  assert.equal(createTicketSchema.parse({ title: "Test" }).priority, "medium");
});

test("a change cannot start or resolve before it is approved", () => {
  const change = { ...ticket, status: "open", ticket_type: "change", approval_status: "pending" };
  assert.match(transitionError(moderator, change, "in-progress")!, /approved/);
  assert.equal(transitionError(moderator, { ...change, approval_status: "approved" }, "in-progress"), null);
  assert.equal(transitionError(moderator, { ...ticket, status: "open", ticket_type: "incident" }, "in-progress"), null);
});
test("approval is manager-only, once, and never self-approved", () => {
  const change = { ...ticket, status: "open", ticket_type: "change", approval_status: "pending", reporter_id: 4 };
  assert.match(approvalError(moderator, change, "approved")!, /manager/);
  assert.equal(approvalError(admin, change, "approved"), null);
  assert.match(approvalError(admin, { ...change, reporter_id: admin.id }, "approved")!, /requested/);
  assert.equal(approvalError(owner, { ...change, reporter_id: owner.id }, "approved"), null);
  assert.match(approvalError(admin, { ...change, approval_status: "approved" }, "rejected")!, /already/);
  assert.match(approvalError(admin, { ...change, ticket_type: "incident" }, "approved")!, /change/);
  assert.match(approvalError(admin, { ...change, status: "closed" }, "approved")!, /Reopen/);
});
test("ticket types default to incident and reject unknown values", () => {
  assert.equal(createTicketSchema.parse({ title: "x" }).type, "incident");
  assert.equal(createTicketSchema.parse({ title: "x", type: "change" }).type, "change");
  assert.equal(createTicketSchema.safeParse({ title: "x", type: "bogus" }).success, false);
});
test("the SLA clock pauses only while waiting on the customer or a third party", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const since = "2026-11-08T10:00:00Z";
  const pending = (reason: string | null) => ({ status: "pending", pending_reason: reason, pending_since: since });
  assert.equal(slaPauseMs(pending("customer"), now), 2 * 3600000);
  assert.equal(slaPauseMs(pending("third-party"), now), 2 * 3600000);
  assert.equal(slaPauseMs(pending("internal"), now), 0);
  assert.equal(slaPauseMs(pending("approval"), now), 0);
  assert.equal(slaPauseMs({ status: "open", pending_reason: "customer", pending_since: since }, now), 0);
  assert.equal(slaPauseMs({ status: "pending", pending_reason: "customer", pending_since: null }, now), 0);
});

const slaNow = new Date("2026-11-08T12:00:00Z");
const inHours = (hours: number) => new Date(slaNow.getTime() + hours * 3600000).toISOString();
const slaRow = (over: Partial<SlaTicketRow> = {}): SlaTicketRow => ({
  id: 1, title: "t", priority: "medium", status: "in-progress", ticket_type: "incident",
  pending_reason: null, sla_due_at: inHours(24), sla_target_hours: 24, ...over,
});

test("isSlaPaused matches only pending tickets waiting on the customer or a third party", () => {
  assert.equal(isSlaPaused({ status: "pending", pending_reason: "customer" }), true);
  assert.equal(isSlaPaused({ status: "pending", pending_reason: "third-party" }), true);
  assert.equal(isSlaPaused({ status: "pending", pending_reason: "internal" }), false);
  assert.equal(isSlaPaused({ status: "pending", pending_reason: "approval" }), false);
  assert.equal(isSlaPaused({ status: "pending", pending_reason: null }), false);
  assert.equal(isSlaPaused({ status: "open", pending_reason: "customer" }), false);
});
test("an active ticket is breached, at risk, paused or on track, and a finished one has no SLA state", () => {
  assert.equal(activeSlaState(slaRow(), slaNow), "on-track");
  assert.equal(activeSlaState(slaRow({ sla_due_at: inHours(6.01) }), slaNow), "on-track");
  assert.equal(activeSlaState(slaRow({ sla_due_at: inHours(6) }), slaNow), "at-risk");
  assert.equal(activeSlaState(slaRow({ sla_due_at: inHours(0.001) }), slaNow), "at-risk");
  assert.equal(activeSlaState(slaRow({ sla_due_at: inHours(0) }), slaNow), "breached");
  assert.equal(activeSlaState(slaRow({ sla_due_at: inHours(-5) }), slaNow), "breached");
  assert.equal(activeSlaState(slaRow({ sla_due_at: new Date(inHours(-5)) }), slaNow), "breached");
  assert.equal(activeSlaState(slaRow({ status: "pending", pending_reason: "customer", sla_due_at: inHours(-5) }), slaNow), "paused");
  assert.equal(activeSlaState(slaRow({ status: "pending", pending_reason: "internal", sla_due_at: inHours(-5) }), slaNow), "breached");
  for (const status of ["resolved", "closed", "withdrawn", "abandoned", "voided"]) {
    assert.equal(activeSlaState(slaRow({ status, sla_due_at: inHours(-5) }), slaNow), null);
  }
  assert.equal(activeSlaState(slaRow({ sla_due_at: null }), slaNow), null);
});
test("the at-risk window follows the ticket's own SLA target, falling back to its priority", () => {
  assert.equal(activeSlaState(slaRow({ priority: "critical", sla_target_hours: 2, sla_due_at: inHours(0.5) }), slaNow), "at-risk");
  assert.equal(activeSlaState(slaRow({ priority: "critical", sla_target_hours: 2, sla_due_at: inHours(0.51) }), slaNow), "on-track");
  assert.equal(activeSlaState(slaRow({ priority: "low", sla_target_hours: null, sla_due_at: inHours(18) }), slaNow), "at-risk");
  assert.equal(activeSlaState(slaRow({ priority: "low", sla_target_hours: null, sla_due_at: inHours(18.5) }), slaNow), "on-track");
});
test("the active SLA summary counts every state and lists only breached and at-risk tickets, worst first", () => {
  const rows = [
    slaRow({ id: 1, sla_due_at: inHours(40) }),
    slaRow({ id: 2, sla_due_at: inHours(3) }),
    slaRow({ id: 3, sla_due_at: inHours(-1) }),
    slaRow({ id: 4, sla_due_at: inHours(-9) }),
    slaRow({ id: 5, sla_due_at: inHours(-9) }),
    slaRow({ id: 6, sla_due_at: inHours(1) }),
    slaRow({ id: 7, status: "pending", pending_reason: "third-party", sla_due_at: inHours(-30) }),
    slaRow({ id: 8, status: "resolved", sla_due_at: inHours(-30) }),
    slaRow({ id: 9, sla_due_at: null }),
  ];
  const { active, attention } = summarizeActiveSla(rows, slaNow);
  assert.deepEqual(active, { total: 7, breached: 3, atRisk: 2, paused: 1, onTrack: 1 });
  assert.deepEqual(attention.map((item) => [item.id, item.state]), [
    [4, "breached"], [5, "breached"], [3, "breached"], [6, "at-risk"], [2, "at-risk"],
  ]);
  assert.equal(attention[0].sla_due_at, inHours(-9));
  assert.deepEqual(summarizeActiveSla(rows, slaNow, 2).attention.map((item) => item.id), [4, 5]);
  assert.deepEqual(summarizeActiveSla([], slaNow), {
    active: { total: 0, breached: 0, atRisk: 0, paused: 0, onTrack: 0 }, attention: [],
  });
});
test("the compliance rate is empty without a decided ticket and exact otherwise", () => {
  assert.equal(slaComplianceRate(0, 0), null);
  assert.equal(slaComplianceRate(3, 1), 0.75);
  assert.equal(slaComplianceRate(4, 0), 1);
  assert.equal(slaComplianceRate(0, 2), 0);
});
test("logged time reads as minutes, whole hours, or hours and minutes", () => {
  assert.equal(formatMinutes(0), "0 min");
  assert.equal(formatMinutes(45), "45 min");
  assert.equal(formatMinutes(60), "1 h");
  assert.equal(formatMinutes(75), "1 h 15 min");
  assert.equal(formatMinutes(125), "2 h 5 min");
  assert.equal(formatMinutes(1440), "24 h");
  assert.equal(formatMinutes(59.6), "1 h");
  assert.equal(formatMinutes(-10), "0 min");
  assert.equal(formatMinutes(Number.NaN), "0 min");
});

const incident = { ...ticket, id: 10, ticket_type: "incident", status: "in-progress" };
const openProblem = { id: 20, ticket_type: "problem", status: "open" };
test("only the worker or a manager can change a problem link", () => {
  assert.equal(problemLinkError(moderator, incident, openProblem), null);
  assert.equal(problemLinkError(admin, incident, openProblem), null);
  assert.equal(problemLinkError(owner, incident, openProblem), null);
  assert.equal(problemLinkError(moderator, incident, null), null);
  assert.equal(problemLinkError(customer, incident, openProblem)?.status, 403);
  assert.equal(problemLinkError({ ...moderator, id: 30 }, incident, openProblem)?.status, 403);
  assert.equal(problemLinkError(moderator, { ...incident, assignee_id: null }, openProblem)?.status, 403);
  assert.equal(problemLinkError(otherSuperuser, incident, openProblem)?.status, 403);
});
test("a ticket can only be linked to an open problem, and only while the ticket itself is open", () => {
  assert.match(problemLinkError(moderator, { ...incident, ticket_type: "problem" }, openProblem)!.message, /another problem/);
  for (const ticket_type of ["incident", "request", "change"]) {
    assert.equal(problemLinkError(moderator, incident, { ...openProblem, ticket_type })?.status, 409);
  }
  assert.match(problemLinkError(moderator, incident, { ...openProblem, ticket_type: "incident" })!.message, /Only a problem/);
  for (const status of ["resolved", "closed", "withdrawn", "abandoned", "voided"]) {
    assert.match(problemLinkError(moderator, incident, { ...openProblem, status })!.message, /Reopen the problem/);
    assert.match(problemLinkError(moderator, { ...incident, status }, openProblem)!.message, /Reopen the ticket/);
    assert.match(problemLinkError(moderator, { ...incident, status }, null)!.message, /Reopen the ticket/);
  }
  for (const status of ["open", "in-progress", "pending"]) {
    assert.equal(problemLinkError(moderator, incident, { ...openProblem, status }), null);
  }
});
test("time entries are whole minutes between 1 and a full day, and only valid problem ids can be linked", () => {
  const comment = (extra: object) => commentSchema.safeParse({ body: "Worked on it", ...extra }).success;
  assert.equal(comment({}), true);
  assert.equal(comment({ timeSpentMinutes: 1 }), true);
  assert.equal(comment({ timeSpentMinutes: 1440 }), true);
  for (const bad of [0, -5, 1441, 1.5, "30", null, Number.NaN]) assert.equal(comment({ timeSpentMinutes: bad }), false);
  assert.equal(comment({ minutes: 30 }), false);
  assert.equal(linkProblemSchema.safeParse({ problemId: 5 }).success, true);
  assert.equal(linkProblemSchema.safeParse({ problemId: null }).success, true);
  for (const bad of [0, -1, 1.5, "5", 2147483648, undefined]) {
    assert.equal(linkProblemSchema.safeParse({ problemId: bad }).success, false);
  }
  assert.equal(linkProblemSchema.safeParse({}).success, false);
  assert.equal(linkProblemSchema.safeParse({ problemId: 5, extra: true }).success, false);
});
