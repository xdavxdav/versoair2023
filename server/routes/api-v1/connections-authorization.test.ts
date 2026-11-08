import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { connections } from "@shared/schema";
import {
  actAs,
  call,
  db,
  injectSession,
  scriptPool,
  setTableRows,
  withRouter,
} from "../../test-support/route-harness";
import connectionsRouter from "./connections";

const member = { id: 7, role: "user" };

function recordInserts() {
  const inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  mock.method(db, "insert", ((table: unknown) => ({
    values(values: Record<string, unknown>) {
      inserts.push({ table, values });
      const result = [{ id: 1, ...values }];
      return {
        returning: async () => result,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
      };
    },
  })) as never);
  return inserts;
}

const post = (origin: string, body: unknown) =>
  call(origin, "POST", "/request", { body });

// The request limiter allows five POSTs per hour per IP, so keep this to five.
test("a connection request is always from the signed-in user", async () => {
  scriptPool(() => undefined);
  const inserts = recordInserts();
  await withRouter(
    connectionsRouter,
    async (origin) => {
      actAs(member);

      // pretending to be someone else
      const spoofed = await post(origin, { fromUserId: 8, toUserId: 9 });
      assert.equal(spoofed.status, 403);

      // toUserId must be a real id, and not yourself
      assert.equal((await post(origin, { toUserId: "abc" })).status, 400);
      assert.equal((await post(origin, { toUserId: 7 })).status, 400);
      assert.equal(inserts.filter((entry) => entry.table === connections).length, 0);

      // the sender is taken from the session when fromUserId is left out...
      const implicit = await post(origin, { toUserId: "9" });
      assert.equal(implicit.status, 201, JSON.stringify(implicit.body));
      // ...and naming yourself is fine
      const explicit = await post(origin, { fromUserId: "7", toUserId: 9 });
      assert.equal(explicit.status, 201, JSON.stringify(explicit.body));

      const created = inserts.filter((entry) => entry.table === connections);
      assert.equal(created.length, 2);
      for (const entry of created) {
        assert.deepEqual(
          { requesterId: entry.values.requesterId, receiverId: entry.values.receiverId, status: entry.values.status },
          { requesterId: 7, receiverId: 9, status: "pending" },
        );
      }
    },
    { before: [injectSession] },
  );
});

test("pending requests are only visible to their owner and to admins", async () => {
  scriptPool(() => undefined);
  setTableRows(connections, [{ id: 1, requesterId: 9, requesterUsername: "kofi", status: "pending" }]);
  await withRouter(
    connectionsRouter,
    async (origin) => {
      assert.equal((await call(origin, "GET", "/pending/7")).status, 401);

      actAs(member);
      const own = await call(origin, "GET", "/pending/7");
      assert.equal(own.status, 200);
      assert.equal(own.body.count, 1);

      assert.equal((await call(origin, "GET", "/pending/8")).status, 403);
      assert.equal((await call(origin, "GET", "/pending/not-a-number")).status, 400);

      actAs({ id: 1, role: "moderator" });
      assert.equal((await call(origin, "GET", "/pending/8")).status, 403);

      actAs({ id: 1, role: "admin" });
      assert.equal((await call(origin, "GET", "/pending/8")).status, 200);
    },
    { before: [injectSession] },
  );
});
