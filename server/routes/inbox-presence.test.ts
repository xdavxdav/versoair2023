import assert from "node:assert/strict";
import test from "node:test";
import {
  actAs,
  call,
  injectSession,
  setTableRows,
  withRouter,
} from "../test-support/route-harness";
import * as schema from "@shared/schema";

const router = (await import("./inbox")).default;
const ask = (id: string | number) =>
  withRouter2((origin) => call(origin, "GET", `/conversations/${id}/presence`));

async function withRouter2<T>(fn: (origin: string) => Promise<T>): Promise<T> {
  let out!: T;
  await withRouter(
    router,
    async (origin) => {
      out = await fn(origin);
    },
    { before: [injectSession] },
  );
  return out;
}

test("shows when the other person was last connected, and nothing else about them", async () => {
  actAs({ id: 7, role: "user" });
  setTableRows(schema.inboxConversations, [
    { id: 3, userId: 7, type: "direct", participantId: "9" },
  ]);
  setTableRows(schema.userPresence, [{ lastSeen: new Date("2026-11-27T15:00:00Z") }]);
  const res = await ask(3);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    success: true,
    data: { online: false, lastSeen: "2026-11-27T15:00:00.000Z" },
  });
});

test("a thread with no person on the other side has no presence", async () => {
  actAs({ id: 7, role: "user" });
  for (const type of ["support", "business_network"]) {
    setTableRows(schema.inboxConversations, [
      { id: 3, userId: 7, type, participantId: "9" },
    ]);
    assert.equal((await ask(3)).status, 404, type);
  }
});

test("someone else's conversation, or a bad id, is refused", async () => {
  actAs({ id: 7, role: "user" });
  setTableRows(schema.inboxConversations, []);
  assert.equal((await ask(3)).status, 404);
  assert.equal((await ask("abc")).status, 400);
});
