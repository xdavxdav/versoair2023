import assert from "node:assert/strict";
import test from "node:test";
import { notifyRequester, replyNotice, shouldNotifyRequester, statusNotice } from "./ticket-notify";

const ticket = { id: 7, title: "Cannot update my listing" };

test("only public activity by someone else reaches the requester", () => {
  assert.equal(shouldNotifyRequester({ actorId: 1, reporterId: 2 }), true);
  assert.equal(shouldNotifyRequester({ actorId: 2, reporterId: 2 }), false);
  assert.equal(shouldNotifyRequester({ actorId: 1, reporterId: 2, internal: true }), false);
  assert.equal(shouldNotifyRequester({ actorId: 1, reporterId: null }), false);
});

test("status notices deep-link to the ticket and hide why a ticket is on hold", () => {
  assert.equal(statusNotice(ticket, { from: "open", to: "open" }), null);
  assert.equal(statusNotice(ticket, { from: "open", to: "in-progress" })?.actionUrl, "/tickets?ticket=7");
  assert.match(statusNotice(ticket, { from: "in-progress", to: "pending", pendingReason: "customer" })!.title, /need a reply/);
  const hold = statusNotice(ticket, { from: "in-progress", to: "pending", pendingReason: "third-party" })!;
  assert.match(hold.title, /on hold/);
  assert.doesNotMatch(`${hold.title} ${hold.message}`, /third-party/);
  assert.match(statusNotice(ticket, { from: "in-progress", to: "resolved" })!.message, /Reply if it is not fixed/);
  assert.match(statusNotice(ticket, { from: "open", to: "withdrawn" })!.title, /withdrawn/);
});

test("long titles are clipped in notices", () => {
  const notice = replyNotice({ id: 1, title: "x".repeat(300) });
  assert.ok(notice.message.length <= 80);
});

test("a failing notification insert never throws", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    await notifyRequester({ query: async () => { throw new Error("db down"); } }, 2, replyNotice(ticket));
  } finally {
    console.error = original;
  }
  const calls: unknown[][] = [];
  await notifyRequester({ query: async (_sql, values) => { calls.push(values); } }, 2, replyNotice(ticket));
  await notifyRequester({ query: async (_sql, values) => { calls.push(values); } }, null, replyNotice(ticket));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 2);
});
