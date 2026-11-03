import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAutomationEvent, buildWebhookBody } from "../../shared/automation-events";
import {
  acknowledgeOutboxEvent,
  claimDueOutboxRows,
  enqueueOutboxEvent,
  getAutomationHealthCounts,
  markOutboxDead,
  markOutboxRetry,
  markOutboxSent,
  recordAutomationAction,
  scrubFinalizedPayloads,
  type AutomationDb,
} from "./automation-outbox";

type Call = { text: string; values: unknown[] | undefined };

function fakeDb(...responses: Array<any[]>): AutomationDb & { calls: Call[] } {
  const calls: Call[] = [];
  const queue = [...responses];
  return {
    calls,
    async query(text, values) {
      calls.push({ text, values });
      return { rows: queue.shift() ?? [] };
    },
  };
}

const NOW = new Date("2026-11-03T15:00:00.000Z");
const EVENT_ID = "00000000-0000-4000-8000-000000000001";

function sampleEvent() {
  const payload = { name: "Awa", email: "awa@example.com", subject: "Hi", message: "Hello" };
  const envelope = buildAutomationEvent("contact", payload, { now: NOW, eventId: EVENT_ID });
  return {
    category: "contact",
    envelope,
    body: buildWebhookBody("contact", payload, envelope, NOW.toISOString()),
  };
}

describe("automation outbox repository", () => {
  it("enqueues idempotently and serializes the body as JSON", async () => {
    const event = sampleEvent();
    const inserted = fakeDb([{ id: 1 }]);
    assert.equal(await enqueueOutboxEvent(inserted, event), true);

    const [call] = inserted.calls;
    assert.match(call.text, /ON CONFLICT \(event_id\) DO NOTHING/);
    assert.equal(call.values?.length, 12);
    assert.equal(call.values?.[0], EVENT_ID);
    assert.equal(call.values?.[2], "contact");
    assert.equal(call.values?.[4], "support");
    assert.equal(JSON.parse(call.values?.[11] as string).automation.eventId, EVENT_ID);

    assert.equal(await enqueueOutboxEvent(fakeDb([]), event), false);
  });

  it("claims with SKIP LOCKED, a single locking pass and an attempt increment", async () => {
    const db = fakeDb([
      { id: "7", event_id: "b", attempts: 2, payload: { n: 2 } },
      { id: "3", event_id: "a", attempts: 1, payload: { n: 1 } },
    ]);
    const rows = await claimDueOutboxRows(db, { limit: 10, leaseMs: 60_000 });

    const [call] = db.calls;
    assert.match(call.text, /AS MATERIALIZED/);
    assert.match(call.text, /FOR UPDATE SKIP LOCKED/);
    assert.match(call.text, /attempts = o\.attempts \+ 1/);
    assert.match(call.text, /status = 'pending'/);
    assert.deepEqual(call.values, [10, 60_000]);
    assert.deepEqual(
      rows.map((row) => [row.id, row.eventId, row.attempts]),
      [[3, "a", 1], [7, "b", 2]],
    );
  });

  it("fences result updates to the claimed attempt and still-pending rows", async () => {
    const claim = { id: 5, attempts: 3 };
    const db = fakeDb([{ id: 5 }], [{ id: 5 }], [{ id: 5 }]);
    assert.equal(await markOutboxSent(db, claim, 200), true);
    assert.equal(
      await markOutboxRetry(db, claim, { delayMs: 1234.6, error: "HTTP 503", httpStatus: 503 }),
      true,
    );
    assert.equal(await markOutboxDead(db, claim, { error: "HTTP 400", httpStatus: 400 }), true);

    for (const call of db.calls) {
      assert.match(call.text, /WHERE id = \$1 AND attempts = \$2 AND status = 'pending'/);
      assert.match(call.text, /RETURNING id/);
    }
    assert.deepEqual(db.calls[0].values, [5, 3, 200]);
    assert.deepEqual(db.calls[1].values, [5, 3, 1235, "HTTP 503", 503]);
    assert.deepEqual(db.calls[2].values, [5, 3, "HTTP 400", 400]);
  });

  it("reports false when the claim is no longer current", async () => {
    const stale = { id: 5, attempts: 1 };
    const db = fakeDb([], [], []);
    assert.equal(await markOutboxSent(db, stale, 200), false);
    assert.equal(
      await markOutboxRetry(db, stale, { delayMs: 10, error: "HTTP 503", httpStatus: 503 }),
      false,
    );
    assert.equal(await markOutboxDead(db, stale, { error: "HTTP 400", httpStatus: 400 }), false);
  });

  it("acknowledges idempotently and distinguishes unknown ids", async () => {
    assert.deepEqual(await acknowledgeOutboxEvent(fakeDb([{ id: 1 }]), EVENT_ID), {
      found: true,
      alreadyAcknowledged: false,
    });
    assert.deepEqual(await acknowledgeOutboxEvent(fakeDb([], [{ "?column?": 1 }]), EVENT_ID), {
      found: true,
      alreadyAcknowledged: true,
    });
    assert.deepEqual(await acknowledgeOutboxEvent(fakeDb([], []), EVENT_ID), {
      found: false,
      alreadyAcknowledged: false,
    });
  });

  it("records an action once and reports duplicates and unknown events", async () => {
    const input = { eventId: EVENT_ID, actionKey: "support-mail", actor: "zapier", detail: { a: 1 } };

    const claimed = fakeDb([{ id: 1 }]);
    assert.equal(await recordAutomationAction(claimed, input), "claimed");
    assert.match(claimed.calls[0].text, /ON CONFLICT \(event_id, action_key\) DO NOTHING/);
    assert.deepEqual(claimed.calls[0].values, [EVENT_ID, "support-mail", "zapier", '{"a":1}']);

    assert.equal(await recordAutomationAction(fakeDb([], [{ x: 1 }]), input), "duplicate");
    assert.equal(await recordAutomationAction(fakeDb([], []), input), "unknown_event");
  });

  it("maps health counts and a missing oldest-pending age", async () => {
    const counts = await getAutomationHealthCounts(
      fakeDb([
        {
          pending: 2,
          retrying: 1,
          sent: 3,
          acknowledged: 40,
          dead: 0,
          ack_overdue: 1,
          oldest_pending_age_seconds: 95,
        },
      ]),
      { ackOverdueSeconds: 1800, windowDays: 30 },
    );
    assert.deepEqual(counts, {
      pending: 2,
      retrying: 1,
      sent: 3,
      acknowledged: 40,
      dead: 0,
      ackOverdue: 1,
      oldestPendingAgeSeconds: 95,
    });

    const empty = await getAutomationHealthCounts(
      fakeDb([{ pending: 0, oldest_pending_age_seconds: null }]),
      { ackOverdueSeconds: 1800, windowDays: 30 },
    );
    assert.equal(empty.oldestPendingAgeSeconds, null);
    assert.equal(empty.dead, 0);
  });

  it("scrubs only finalized rows and returns how many were scrubbed", async () => {
    const db = fakeDb([{ id: 1 }, { id: 2 }]);
    assert.equal(await scrubFinalizedPayloads(db, { retentionDays: 14 }), 2);
    assert.match(db.calls[0].text, /status IN \('sent', 'acknowledged', 'dead'\)/);
    assert.match(db.calls[0].text, /payload_scrubbed_at IS NULL/);
    assert.deepEqual(db.calls[0].values, [14]);
  });
});
