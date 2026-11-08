import assert from "node:assert/strict";
import test from "node:test";
import { dueTicketAlerts } from "./ticket-monitor";

const now = new Date("2026-11-08T12:00:00Z");
const base = {
  id: 1, status: "open", pending_reason: null, pending_since: null, follow_up_at: null,
  sla_due_at: "2026-11-08T11:00:00Z",
};

test("an overdue ticket raises an SLA breach alert", () => {
  assert.deepEqual(dueTicketAlerts(base, now).map((alert) => alert.kind), ["sla-breach"]);
});
test("the breach alert is held while we wait on the customer or a third party", () => {
  for (const reason of ["customer", "third-party"]) {
    const kinds = dueTicketAlerts({ ...base, status: "pending", pending_reason: reason, pending_since: "2026-11-08T10:30:00Z" }, now)
      .map((alert) => alert.kind);
    assert.equal(kinds.includes("sla-breach"), false);
  }
});
test("internal and approval waits still breach", () => {
  for (const reason of ["internal", "approval"]) {
    const kinds = dueTicketAlerts({ ...base, status: "pending", pending_reason: reason, pending_since: "2026-11-08T10:30:00Z" }, now)
      .map((alert) => alert.kind);
    assert.equal(kinds.includes("sla-breach"), true);
  }
});
test("resolved tickets raise no alerts", () => {
  assert.deepEqual(dueTicketAlerts({ ...base, status: "resolved" }, now), []);
});
