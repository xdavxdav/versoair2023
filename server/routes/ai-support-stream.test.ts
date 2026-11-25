import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { db, setTableRows, signIn, withRouter } from "../test-support/route-harness";
import * as schema from "@shared/schema";

const router = (await import("./ai-chat")).default;

const stream = (origin: string, auth: Record<string, string>, message: string) =>
  fetch(
    `${origin}/support/stream?${new URLSearchParams({ message, convId: "3" })}`,
    { headers: auth, signal: AbortSignal.timeout(5000) },
  );

test("an FAQ answer is stored before the stream says it is done", async () => {
  const inserted: unknown[] = [];
  let storedWhenDone = -1;
  mock.method(db, "insert", (() => ({
    values: async (row: unknown) => {
      inserted.push(row);
    },
  })) as never);
  mock.method(db, "update", (() => ({
    set: () => ({ where: async () => undefined }),
  })) as never);
  setTableRows(schema.inboxConversations, [{ id: 3 }]);
  const auth = signIn({ id: 7, role: "user" });

  await withRouter(router, async (origin) => {
    const res = await stream(origin, auth, "I forgot my password");
    assert.equal(res.status, 200);
    const text = await res.text();
    storedWhenDone = inserted.length;
    assert.match(text, /event: done\ndata: \{"provider":"faq"\}/);
  });

  assert.equal(storedWhenDone, 1);
  assert.equal(inserted.length, 1);
  assert.match(
    JSON.stringify(inserted[0]),
    /"conversationId":3.*"senderId":"support".*"isAi":true/,
  );
});

test("a thread that is not the caller's support thread gets no stream", async () => {
  setTableRows(schema.inboxConversations, []);
  const auth = signIn({ id: 7, role: "user" });
  await withRouter(router, async (origin) => {
    const res = await stream(origin, auth, "hello");
    assert.equal(res.status, 404);
  });
});
