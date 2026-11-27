import assert from "node:assert/strict";
import test from "node:test";
import type { SupportTicket } from "@shared/ticket-policy";
import {
  buildTimeline, composeDescription, EMPTY_DRAFT, findSimilarTickets, isTicketLate, matchesQuickView, parseDraft,
  targetHours, ticketProgress,
} from "./ticket-view";

const NOW = Date.parse("2026-11-27T12:00:00Z");
const hours = (value: number) => new Date(NOW + value * 3600000).toISOString();

function ticket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: 1, title: "Printer broken", description: "", status: "open", priority: "medium", category: "general",
    reporter: "a@b.c", reporter_id: 10, assignee_id: null, team: null, created_at: hours(-2), updated_at: hours(-1),
    resolved_at: null, resolution_code: null, resolution_notes: null, ticket_type: "incident",
    approval_status: "not-required", approved_by: null, approved_at: null, escalation_level: 0, problem_id: null,
    time_spent_minutes: 0, pending_reason: null, pending_since: null, follow_up_at: null, sla_due_at: hours(10),
    sla_breached: false, abandonment_proposed_at: null, conversation_id: null, ...overrides,
  };
}

test("a ticket past its due date is late, but not while the SLA clock is paused or after it closes", () => {
  assert.equal(isTicketLate(ticket({ sla_due_at: hours(-1) }), NOW), true);
  assert.equal(isTicketLate(ticket({ sla_due_at: hours(1) }), NOW), false);
  const waitingOnCustomer = ticket({ status: "pending", pending_reason: "customer", sla_due_at: hours(-5) });
  assert.equal(isTicketLate(waitingOnCustomer, NOW), false);
  const waitingInternally = ticket({ status: "pending", pending_reason: "internal", sla_due_at: hours(-5) });
  assert.equal(isTicketLate(waitingInternally, NOW), true);
  assert.equal(isTicketLate(ticket({ status: "resolved", sla_breached: true, sla_due_at: hours(-5) }), NOW), false);
});

test("quick views select the expected tickets", () => {
  const mine = ticket({ assignee_id: 7 });
  assert.equal(matchesQuickView("mine", mine, 7, NOW), true);
  assert.equal(matchesQuickView("mine", ticket(), 7, NOW), false);
  assert.equal(matchesQuickView("unassigned", ticket(), 7, NOW), true);
  assert.equal(matchesQuickView("unassigned", ticket({ status: "closed" }), 7, NOW), false);
  assert.equal(matchesQuickView("late", ticket({ sla_due_at: hours(-1) }), 7, NOW), true);
  // medium target is 24h, at risk under 25% remaining (6h)
  assert.equal(matchesQuickView("atRisk", ticket({ sla_due_at: hours(3) }), 7, NOW), true);
  assert.equal(matchesQuickView("atRisk", ticket({ sla_due_at: hours(20) }), 7, NOW), false);
  assert.equal(matchesQuickView("all", ticket({ status: "closed" }), 7, NOW), true);
});

test("progress follows the lifecycle and reports who a ticket is waiting on", () => {
  assert.deepEqual(ticketProgress(ticket()), { index: 0, ended: false, waiting: false, waitingOn: null });
  assert.equal(ticketProgress(ticket({ assignee_id: 3 })).index, 1);
  assert.equal(ticketProgress(ticket({ status: "in-progress", assignee_id: 3 })).index, 2);
  assert.deepEqual(
    ticketProgress(ticket({ status: "pending", pending_reason: "customer", assignee_id: 3 })),
    { index: 2, ended: false, waiting: true, waitingOn: "customer" },
  );
  // requesters never receive pending_reason
  assert.deepEqual(
    ticketProgress(ticket({ status: "pending", pending_reason: null, assignee_id: 3 })),
    { index: 2, ended: false, waiting: true, waitingOn: null },
  );
  assert.equal(ticketProgress(ticket({ status: "closed" })).index, 3);
  assert.equal(ticketProgress(ticket({ status: "withdrawn" })).ended, true);
  assert.deepEqual(
    ticketProgress(ticket({ ticket_type: "change", approval_status: "pending" })),
    { index: 0, ended: false, waiting: true, waitingOn: "approval" },
  );
});

test("urgency maps onto the policy response targets", () => {
  assert.equal(targetHours("emergency"), 2);
  assert.equal(targetHours("blocking"), 8);
  assert.equal(targetHours("normal"), 24);
  assert.equal(targetHours("whenever"), 72);
});

test("stored drafts are re-validated and empty drafts are discarded", () => {
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft("not json"), null);
  assert.equal(parseDraft(JSON.stringify(EMPTY_DRAFT)), null);
  const draft = parseDraft(JSON.stringify({
    type: "hacker", title: "x".repeat(500), category: "<script>", urgency: "now", what: 42, expected: "ok",
  }));
  assert.ok(draft);
  assert.equal(draft.type, "incident");
  assert.equal(draft.title.length, 200);
  assert.equal(draft.category, "general");
  assert.equal(draft.urgency, "normal");
  assert.equal(draft.what, "");
  assert.equal(draft.expected, "ok");
});

test("guided answers fold into one labelled description within the API limit", () => {
  const labels = { what: "What happened", expected: "Expected", steps: "Steps" };
  const text = composeDescription({ ...EMPTY_DRAFT, what: " It broke ", expected: "It works", steps: "" }, labels);
  assert.equal(text, "It broke\n\nExpected: It works");
  assert.equal(composeDescription({ ...EMPTY_DRAFT, what: "x".repeat(6000) }, labels).length, 5000);
});

test("similar open tickets are suggested, closed and unrelated ones are not", () => {
  const list = [
    ticket({ id: 1, title: "Cannot update business listing photos" }),
    ticket({ id: 2, title: "Cannot update business listing photos", status: "closed" }),
    ticket({ id: 3, title: "Billing question about invoice" }),
  ];
  assert.deepEqual(findSimilarTickets(list, "Business listing photos will not update").map((item) => item.id), [1]);
  assert.deepEqual(findSimilarTickets(list, "photos"), []);
});

test("the timeline interleaves replies, notes and events and folds the staff reason into the status change", () => {
  const timeline = buildTimeline(
    [
      { id: 1, author_name: "user", body: "help", internal: false, created_at: hours(-3) },
      { id: 2, author_name: "staff", body: "checking", internal: true, created_at: hours(-1), time_spent_minutes: 15 },
    ],
    [
      { id: 10, kind: "created", details: {}, created_at: hours(-4), internal: false },
      { id: 11, kind: "comment-added", details: {}, created_at: hours(-3), internal: false },
      { id: 12, kind: "updated", details: { from: "open", to: "in-progress" }, created_at: hours(-2), internal: false },
      { id: 13, kind: "update-details", details: { reason: "Started work" }, created_at: hours(-2), internal: true },
      { id: 14, kind: "time-logged", details: { minutes: 15 }, created_at: hours(-1), internal: true },
    ],
  );
  assert.deepEqual(timeline.map((item) => item.key), ["e10", "c1", "e12", "c2"]);
  const changed = timeline[2];
  assert.equal(changed.type, "event");
  if (changed.type === "event") assert.equal(changed.details.reason, "Started work");
  const note = timeline[3];
  if (note.type === "note") assert.equal(note.minutes, 15);
});
