import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import test from "node:test";
import express, { type RequestHandler } from "express";
import communityRouter, { createCommunityRouter } from "./community";

interface Call {
  text: string;
  values: unknown[];
}

type Responder = (call: Call) => { rows: any[]; rowCount?: number } | Error;

const passThrough: RequestHandler = (_req, _res, next) => next();

// Stands in for requireAuth(): "x-test-user" carries the id, "x-test-role" the role.
const stubAuth: RequestHandler = (req, res, next) => {
  const id = req.header("x-test-user");
  if (!id) {
    res.status(401).json({ success: false, error: "no session" });
    return;
  }
  (req as any).user = {
    userId: id,
    id,
    email: "poster@example.com",
    role: req.header("x-test-role") ?? "fan",
  };
  next();
};

async function start(respond: Responder) {
  const calls: Call[] = [];
  const db = {
    async query(text: string, values: unknown[] = []) {
      const call = { text, values };
      calls.push(call);
      const out = respond(call);
      if (out instanceof Error) throw out;
      return out;
    },
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/api/community",
    createCommunityRouter({ db, authenticate: stubAuth, slowMode: passThrough }),
  );
  const server: Server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as { port: number };
  return {
    calls,
    origin: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}

const quiet = () => {
  const original = console.error;
  console.error = () => {};
  return () => {
    console.error = original;
  };
};

test("GET /posts never sends an email to the public", async () => {
  const h = await start(() => ({
    rows: [
      {
        id: 3,
        content: "old post",
        author_name: "legacy@example.com",
        author_avatar: null,
        created_at: "2026-11-01T10:00:00.000Z",
        user_id: 4,
        username: "legacy",
        display_name: "legacy@example.com",
        avatar_url: null,
      },
      {
        id: 2,
        content: "clean post",
        author_name: "Ama K",
        author_avatar: null,
        created_at: "2026-11-01T09:00:00.000Z",
        user_id: 5,
        username: "ama",
        display_name: "Ama K",
        avatar_url: null,
      },
      {
        id: 1,
        content: "email handle",
        author_name: "third@example.com",
        author_avatar: null,
        created_at: "2026-11-01T08:00:00.000Z",
        user_id: 6,
        username: "third@example.com",
        display_name: null,
        avatar_url: null,
      },
    ],
  }));
  try {
    const res = await fetch(`${h.origin}/api/community/posts`);
    assert.equal(res.status, 200);
    const raw = await res.text();
    assert.equal(raw.includes("@"), false, "no @ anywhere in the response");
    const body = JSON.parse(raw);
    assert.equal(body.success, true);
    assert.deepEqual(
      body.posts.map((p: any) => [p.id, p.author_name, p.username, p.display_name]),
      [
        [3, null, "legacy", null],
        [2, "Ama K", "ama", "Ama K"],
        [1, null, null, null],
      ],
    );
    assert.equal(body.posts[0].content, "old post");
    assert.equal(body.posts[0].user_id, 4);
  } finally {
    await h.close();
  }
});

test("GET /posts keeps its query shape and paging", async () => {
  const h = await start(() => ({ rows: [] }));
  try {
    const res = await fetch(`${h.origin}/api/community/posts?limit=500&before=40`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { success: true, posts: [] });
    assert.equal(h.calls.length, 1);
    assert.match(h.calls[0].text, /cp\.is_hidden = FALSE AND cp\.parent_id IS NULL AND cp\.id < \$1/);
    assert.deepEqual(h.calls[0].values, [40, 100]);
  } finally {
    await h.close();
  }
});

test("GET /posts reports a failure as 500 without leaking the reason", async () => {
  const restore = quiet();
  const h = await start(() => new Error("connection to 10.0.0.1 refused"));
  try {
    const res = await fetch(`${h.origin}/api/community/posts`);
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { success: false, error: "Failed to load posts" });
  } finally {
    restore();
    await h.close();
  }
});

test("POST /posts stores the account's display name, never the poster's email", async () => {
  const h = await start((call) =>
    /FROM users/.test(call.text)
      ? { rows: [{ display_name: "Ama K", username: "ama" }] }
      : {
          rows: [
            {
              id: 11,
              content: "hello",
              author_name: call.values[1],
              author_avatar: null,
              user_id: 12,
              created_at: "2026-11-07T12:00:00.000Z",
            },
          ],
        },
  );
  try {
    const res = await fetch(`${h.origin}/api/community/posts`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user": "12" },
      body: JSON.stringify({ content: "  hello  " }),
    });
    assert.equal(res.status, 200);
    const raw = await res.text();
    assert.equal(raw.includes("@"), false);
    assert.equal(JSON.parse(raw).post.author_name, "Ama K");
    assert.equal(h.calls.length, 2);
    assert.deepEqual(h.calls[0].values, ["12"]);
    assert.match(h.calls[1].text, /INSERT INTO community_posts/);
    assert.deepEqual(h.calls[1].values, ["12", "Ama K", null, "hello"]);
  } finally {
    await h.close();
  }
});

test("POST /posts falls back to the username, then Anonymous", async () => {
  for (const [row, expected] of [
    [{ display_name: null, username: "ama" }, "ama"],
    [{ display_name: "", username: "" }, "Anonymous"],
    [{ display_name: "a@b.co", username: "a@b.co" }, "Anonymous"],
    [undefined, "Anonymous"],
  ] as const) {
    const h = await start((call) =>
      /FROM users/.test(call.text)
        ? { rows: row ? [row] : [] }
        : { rows: [{ id: 1, author_name: call.values[1] }] },
    );
    try {
      const res = await fetch(`${h.origin}/api/community/posts`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-user": "7" },
        body: JSON.stringify({ content: "hi" }),
      });
      assert.equal(res.status, 200);
      assert.equal(h.calls[1].values[1], expected);
    } finally {
      await h.close();
    }
  }
});

test("POST /posts needs a session, and rejects empty or oversized content before any query", async () => {
  const h = await start(() => ({ rows: [] }));
  try {
    const anon = await fetch(`${h.origin}/api/community/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "hi" }),
    });
    assert.equal(anon.status, 401);

    const post = (content: unknown) =>
      fetch(`${h.origin}/api/community/posts`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-test-user": "7" },
        body: JSON.stringify({ content }),
      });
    assert.equal((await post("   ")).status, 400);
    assert.equal((await post(undefined)).status, 400);
    assert.equal((await post("x".repeat(2001))).status, 400);
    assert.equal(h.calls.length, 0);
  } finally {
    await h.close();
  }
});

test("POST /posts writes nothing when the name lookup fails", async () => {
  const restore = quiet();
  const h = await start(() => new Error("boom"));
  try {
    const res = await fetch(`${h.origin}/api/community/posts`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-test-user": "7" },
      body: JSON.stringify({ content: "hi" }),
    });
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { success: false, error: "Failed to publish message" });
    assert.equal(h.calls.length, 1);
    assert.match(h.calls[0].text, /FROM users/);
  } finally {
    restore();
    await h.close();
  }
});

test("DELETE /posts/:id still limits non-owners to their own posts", async () => {
  const h = await start(() => ({ rows: [{ id: 9 }], rowCount: 1 }));
  try {
    const own = await fetch(`${h.origin}/api/community/posts/9`, {
      method: "DELETE",
      headers: { "x-test-user": "7" },
    });
    assert.equal(own.status, 200);
    assert.match(h.calls[0].text, /WHERE id = \$1 AND user_id = \$2/);
    assert.deepEqual(h.calls[0].values, [9, "7"]);

    const staff = await fetch(`${h.origin}/api/community/posts/9`, {
      method: "DELETE",
      headers: { "x-test-user": "1", "x-test-role": "superuser" },
    });
    assert.equal(staff.status, 200);
    assert.match(h.calls[1].text, /WHERE id = \$1 RETURNING id/);
    assert.deepEqual(h.calls[1].values, [9]);

    const bad = await fetch(`${h.origin}/api/community/posts/abc`, {
      method: "DELETE",
      headers: { "x-test-user": "7" },
    });
    assert.equal(bad.status, 400);
    assert.equal(h.calls.length, 2);
  } finally {
    await h.close();
  }
});

test("DELETE /posts/:id answers 404 when nothing matched", async () => {
  const h = await start(() => ({ rows: [], rowCount: 0 }));
  try {
    const res = await fetch(`${h.origin}/api/community/posts/9`, {
      method: "DELETE",
      headers: { "x-test-user": "7" },
    });
    assert.equal(res.status, 404);
  } finally {
    await h.close();
  }
});

test("the default export keeps all three routes, with auth and slow mode on the write", () => {
  const routes = (communityRouter as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
      handlers: layer.route.stack.length,
    }));
  assert.deepEqual(routes, [
    { path: "/posts", methods: ["get"], handlers: 1 },
    { path: "/posts", methods: ["post"], handlers: 3 },
    { path: "/posts/:id", methods: ["delete"], handlers: 2 },
  ]);
});
