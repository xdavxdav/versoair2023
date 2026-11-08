import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { socialPosts } from "../../shared/social-schema";
import {
  actAs,
  call,
  db,
  injectSession,
  setTableRows,
  withRouter,
} from "../test-support/route-harness";
import faqRouter from "./faq-api";

function recordUpdates() {
  const updates: Array<Record<string, unknown>> = [];
  mock.method(db, "update", ((table: unknown) => ({
    set(values: Record<string, unknown>) {
      assert.equal(table, socialPosts);
      updates.push(values);
      return { where: () => ({ returning: async () => [{ id: 12, isResolved: true }] }) };
    },
  })) as never);
  return updates;
}

const resolve = (origin: string, id: string | number = 12) =>
  call(origin, "POST", `/${id}/resolve`);

test("a FAQ topic can be resolved by its author or by staff, nobody else", async () => {
  const updates = recordUpdates();
  // authorId is an integer column; the session id is the string "7".
  setTableRows(socialPosts, [{ authorId: 7 }]);

  await withRouter(
    faqRouter,
    async (origin) => {
      assert.equal((await resolve(origin)).status, 401);
      assert.equal(updates.length, 0);

      actAs({ id: 8, role: "user" });
      const stranger = await resolve(origin);
      assert.equal(stranger.status, 403);
      assert.equal(stranger.body?.error, "Only the topic author or staff can resolve this topic");
      actAs({ id: 8, role: "business_owner" });
      assert.equal((await resolve(origin)).status, 403);
      assert.equal(updates.length, 0);

      actAs({ id: 7, role: "user" });
      const author = await resolve(origin);
      assert.equal(author.status, 200, JSON.stringify(author.body));
      assert.equal(updates.length, 1);
      assert.equal(updates[0].isResolved, true);

      for (const role of ["admin", "moderator", "superuser"]) {
        actAs({ id: 1, role });
        assert.equal((await resolve(origin)).status, 200, role);
      }
      assert.equal(updates.length, 4);
    },
    { before: [injectSession] },
  );
});

test("resolving a topic that does not exist, or has a bad id, is a 404", async () => {
  const updates = recordUpdates();
  setTableRows(socialPosts, []);

  await withRouter(
    faqRouter,
    async (origin) => {
      actAs({ id: 1, role: "admin" });
      assert.equal((await resolve(origin, 12)).status, 404);
      for (const id of ["abc", "0", "-4"]) {
        assert.equal((await resolve(origin, id)).status, 404, id);
      }
    },
    { before: [injectSession] },
  );
  assert.equal(updates.length, 0);
});
