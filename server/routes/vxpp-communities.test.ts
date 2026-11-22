import test from "node:test";
import assert from "node:assert/strict";
import "../test-support/route-harness";
import express from "express";
import type { AddressInfo } from "node:net";
import {
  createVxppCommunitiesRouter,
  slugifyCommunityName,
} from "./vxpp-communities";

function createTestServer() {
  const communities: any[] = [];
  const members: any[] = [];
  const posts: any[] = [];
  const comments: any[] = [];
  const likes: any[] = [];
  let seq = 1;

  const users = new Map<number, { id: number; display_name: string; username: string; email: string }>([
    [10, { id: 10, display_name: "Alice Martin", username: "alice", email: "alice@example.com" }],
    [20, { id: 20, display_name: "Bob Tremblay", username: "bob", email: "bob@example.com" }],
  ]);

  const fakePool = {
    async query(sql: string, params: unknown[] = []) {
      const q = sql.replace(/\s+/g, " ").trim();
      if (q.startsWith("SELECT display_name, username, email FROM users")) {
        const u = users.get(Number(params[0]));
        return { rows: u ? [u] : [] };
      }
      if (q.startsWith("SELECT id, name, slug, tagline, description, category, emoji, created_by, created_at AS created_date FROM vxpp_communities WHERE slug = $1")) {
        const found = communities.find((c) => c.slug === params[0]);
        return { rows: found ? [found] : [] };
      }
      if (q.startsWith("SELECT id, name, slug, tagline, description, category, emoji, created_by, created_at AS created_date FROM vxpp_communities ORDER BY")) {
        return { rows: [...communities].reverse() };
      }
      if (q.startsWith("SELECT id FROM vxpp_communities WHERE slug = $1")) {
        const found = communities.find((c) => c.slug === params[0]);
        return { rows: found ? [{ id: found.id }] : [] };
      }
      if (q.startsWith("SELECT id FROM vxpp_communities WHERE id = $1")) {
        const found = communities.find((c) => c.id === Number(params[0]));
        return { rows: found ? [{ id: found.id }] : [] };
      }
      if (q.startsWith("SELECT id, created_by FROM vxpp_communities WHERE slug = $1")) {
        const found = communities.find((c) => c.slug === params[0]);
        return { rows: found ? [found] : [] };
      }
      if (q.startsWith("INSERT INTO vxpp_communities")) {
        const row = {
          id: seq++,
          name: params[0],
          slug: params[1],
          tagline: params[2],
          description: params[3],
          category: params[4],
          emoji: params[5],
          created_by: params[6],
          created_date: new Date().toISOString(),
        };
        communities.push(row);
        return { rows: [row] };
      }
      if (q.startsWith("DELETE FROM vxpp_communities WHERE id = $1")) {
        const idx = communities.findIndex((c) => c.id === Number(params[0]));
        if (idx >= 0) communities.splice(idx, 1);
        return { rows: [], rowCount: 1 };
      }
      if (q.startsWith("SELECT community_id, COUNT(*)::int AS count FROM vxpp_community_members")) {
        const map = new Map<number, number>();
        for (const m of members) map.set(m.community_id, (map.get(m.community_id) || 0) + 1);
        return { rows: [...map.entries()].map(([community_id, count]) => ({ community_id, count })) };
      }
      if (q.startsWith("SELECT community_id, COUNT(*)::int AS count FROM vxpp_community_posts")) {
        const map = new Map<number, number>();
        for (const p of posts) map.set(p.community_id, (map.get(p.community_id) || 0) + 1);
        return { rows: [...map.entries()].map(([community_id, count]) => ({ community_id, count })) };
      }
      if (q.startsWith("SELECT COUNT(*)::int AS count FROM vxpp_community_members WHERE community_id = $1")) {
        return { rows: [{ count: members.filter((m) => m.community_id === Number(params[0])).length }] };
      }
      if (q.startsWith("SELECT COUNT(*)::int AS count FROM vxpp_community_posts WHERE community_id = $1")) {
        return { rows: [{ count: posts.filter((p) => p.community_id === Number(params[0])).length }] };
      }
      if (q.startsWith("INSERT INTO vxpp_community_members")) {
        const cid = Number(params[0]);
        const uid = Number(params[1]);
        if (!members.some((m) => m.community_id === cid && m.user_id === uid)) {
          members.push({
            id: seq++,
            community_id: cid,
            user_id: uid,
            created_by: uid,
            user_name: params[2],
            created_date: new Date().toISOString(),
          });
        }
        return { rows: [] };
      }
      if (q.startsWith("SELECT id, community_id, user_id AS created_by, user_name")) {
        const found = members.find(
          (m) => m.community_id === Number(params[0]) && m.user_id === Number(params[1]),
        );
        return { rows: found ? [found] : [] };
      }
      if (q.startsWith("DELETE FROM vxpp_community_members")) {
        const idx = members.findIndex(
          (m) => m.community_id === Number(params[0]) && m.user_id === Number(params[1]),
        );
        if (idx >= 0) members.splice(idx, 1);
        return { rows: [] };
      }
      if (q.startsWith("INSERT INTO vxpp_community_posts")) {
        const row = {
          id: seq++,
          community_id: Number(params[0]),
          author_id: Number(params[1]),
          created_by: Number(params[1]),
          author_name: params[2],
          body: params[3],
          image_url: params[4],
          created_date: new Date().toISOString(),
        };
        posts.push(row);
        return { rows: [row] };
      }
      if (q.startsWith("SELECT id, community_id, author_id AS created_by, author_name, body, image_url")) {
        return {
          rows: posts
            .filter((p) => p.community_id === Number(params[0]))
            .reverse(),
        };
      }
      if (q.startsWith("SELECT id, community_id FROM vxpp_community_posts WHERE id = $1")) {
        const found = posts.find((p) => p.id === Number(params[0]));
        return { rows: found ? [found] : [] };
      }
      if (q.startsWith("SELECT id, author_id FROM vxpp_community_posts WHERE id = $1")) {
        const found = posts.find((p) => p.id === Number(params[0]));
        return { rows: found ? [found] : [] };
      }
      if (q.startsWith("DELETE FROM vxpp_community_posts WHERE id = $1")) {
        const idx = posts.findIndex((p) => p.id === Number(params[0]));
        if (idx >= 0) posts.splice(idx, 1);
        return { rows: [] };
      }
      if (q.startsWith("INSERT INTO vxpp_community_comments")) {
        const row = {
          id: seq++,
          post_id: Number(params[0]),
          community_id: Number(params[1]),
          author_id: Number(params[2]),
          created_by: Number(params[2]),
          author_name: params[3],
          body: params[4],
          created_date: new Date().toISOString(),
        };
        comments.push(row);
        return { rows: [row] };
      }
      if (q.startsWith("SELECT id, post_id, community_id, author_id AS created_by, author_name, body")) {
        return { rows: comments.filter((c) => c.post_id === Number(params[0])) };
      }
      if (q.startsWith("SELECT post_id, COUNT(*)::int AS count FROM vxpp_community_comments")) {
        const map = new Map<number, number>();
        for (const c of comments.filter((x) => x.community_id === Number(params[0]))) {
          map.set(c.post_id, (map.get(c.post_id) || 0) + 1);
        }
        return { rows: [...map.entries()].map(([post_id, count]) => ({ post_id, count })) };
      }
      if (q.startsWith("INSERT INTO vxpp_community_likes")) {
        const pid = Number(params[0]);
        const cid = Number(params[1]);
        const uid = Number(params[2]);
        if (!likes.some((l) => l.post_id === pid && l.user_id === uid)) {
          likes.push({ id: seq++, post_id: pid, community_id: cid, user_id: uid });
        }
        return { rows: [] };
      }
      if (q.startsWith("DELETE FROM vxpp_community_likes")) {
        const idx = likes.findIndex(
          (l) => l.post_id === Number(params[0]) && l.user_id === Number(params[1]),
        );
        if (idx >= 0) likes.splice(idx, 1);
        return { rows: [] };
      }
      if (q.startsWith("SELECT COUNT(*)::int AS count FROM vxpp_community_likes WHERE post_id = $1")) {
        return { rows: [{ count: likes.filter((l) => l.post_id === Number(params[0])).length }] };
      }
      if (q.startsWith("SELECT post_id, COUNT(*)::int AS count FROM vxpp_community_likes")) {
        const map = new Map<number, number>();
        for (const l of likes.filter((x) => x.community_id === Number(params[0]))) {
          map.set(l.post_id, (map.get(l.post_id) || 0) + 1);
        }
        return { rows: [...map.entries()].map(([post_id, count]) => ({ post_id, count })) };
      }
      if (q.startsWith("SELECT post_id FROM vxpp_community_likes WHERE community_id = $1 AND user_id = $2")) {
        return {
          rows: likes
            .filter((l) => l.community_id === Number(params[0]) && l.user_id === Number(params[1]))
            .map((l) => ({ post_id: l.post_id })),
        };
      }
      return { rows: [] };
    },
  };

  const attachUser = (req: any) => {
    const uid = req.headers["x-test-user"];
    const role = req.headers["x-test-role"] || "user";
    if (uid) req.user = { userId: String(uid), id: String(uid), role: String(role) };
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/vxpp-communities",
    createVxppCommunitiesRouter({
      pool: fakePool,
      skipSchemaEnsure: true,
      optionalAuthMiddleware: (req, _res, next) => {
        attachUser(req);
        next();
      },
      authMiddleware: (req, res, next) => {
        attachUser(req);
        if (!(req as any).user) {
          return res.status(401).json({ success: false, error: "Sign in required." });
        }
        next();
      },
    }),
  );

  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

test("slugifyCommunityName normalizes names cleanly", () => {
  assert.equal(slugifyCommunityName("Toronto Trades Network!"), "toronto-trades-network");
  assert.equal(slugifyCommunityName("  Founders & Operators  "), "founders-operators");
});

test("vxpp communities end-to-end: public read, anonymous write rejection, duplicate slug, join/leave, post, comment, like/unlike, and owner-only delete", async () => {
  const srv = createTestServer();
  try {
    // Signed-out create rejected
    const anonCreate = await fetch(`${srv.origin}/api/vxpp-communities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Anon Group" }),
    });
    assert.equal(anonCreate.status, 401);

    // Alice creates a community
    const createRes = await fetch(`${srv.origin}/api/vxpp-communities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": "10" },
      body: JSON.stringify({
        name: "Toronto Builders",
        tagline: "Hands-on local builders",
        category: "Trades",
        emoji: "⬢",
      }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()).community;
    assert.equal(created.slug, "toronto-builders");

    // Duplicate slug rejected with 409
    const dupRes = await fetch(`${srv.origin}/api/vxpp-communities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": "20" },
      body: JSON.stringify({ name: "Toronto Builders!" }),
    });
    assert.equal(dupRes.status, 409);

    // Public browse shows 0 members and 0 posts
    const listRes = await fetch(`${srv.origin}/api/vxpp-communities`);
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.equal(listJson.items.length, 1);
    assert.equal(listJson.memberCounts[String(created.id)] || 0, 0);
    assert.equal(listJson.postCounts[String(created.id)] || 0, 0);

    // Bob joins twice (idempotent -> memberCount stays 1)
    const join1 = await fetch(`${srv.origin}/api/vxpp-communities/${created.id}/membership`, {
      method: "POST",
      headers: { "x-test-user": "20" },
    });
    assert.equal(join1.status, 201);
    assert.equal((await join1.json()).memberCount, 1);

    const join2 = await fetch(`${srv.origin}/api/vxpp-communities/${created.id}/membership`, {
      method: "POST",
      headers: { "x-test-user": "20" },
    });
    assert.equal((await join2.json()).memberCount, 1);

    // Empty post rejected
    const emptyPost = await fetch(`${srv.origin}/api/vxpp-communities/${created.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": "20" },
      body: JSON.stringify({ body: "   " }),
    });
    assert.equal(emptyPost.status, 400);

    // Bob posts (server derives author_name = Bob Tremblay, ignoring spoofed client input)
    const postRes = await fetch(`${srv.origin}/api/vxpp-communities/${created.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": "20" },
      body: JSON.stringify({
        body: "Looking for a licensed electrician in West End.",
        author_name: "Spoofed Admin",
      }),
    });
    assert.equal(postRes.status, 201);
    const post = (await postRes.json()).post;
    assert.equal(post.author_name, "Bob Tremblay");

    // Alice likes twice (idempotent -> 1), then unlikes (-> 0)
    const like1 = await fetch(`${srv.origin}/api/vxpp-communities/posts/${post.id}/like`, {
      method: "POST",
      headers: { "x-test-user": "10" },
    });
    assert.equal((await like1.json()).likeCount, 1);
    const like2 = await fetch(`${srv.origin}/api/vxpp-communities/posts/${post.id}/like`, {
      method: "POST",
      headers: { "x-test-user": "10" },
    });
    assert.equal((await like2.json()).likeCount, 1);
    const unlike = await fetch(`${srv.origin}/api/vxpp-communities/posts/${post.id}/like`, {
      method: "DELETE",
      headers: { "x-test-user": "10" },
    });
    assert.equal((await unlike.json()).likeCount, 0);

    // Alice comments
    const commentRes = await fetch(`${srv.origin}/api/vxpp-communities/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-user": "10" },
      body: JSON.stringify({ body: "DMing you a trusted referral." }),
    });
    assert.equal(commentRes.status, 201);
    assert.equal((await commentRes.json()).comment.author_name, "Alice Martin");

    // Non-author Alice cannot delete Bob's post (403)
    const badDel = await fetch(`${srv.origin}/api/vxpp-communities/posts/${post.id}`, {
      method: "DELETE",
      headers: { "x-test-user": "10" },
    });
    assert.equal(badDel.status, 403);

    // Bob leaves community -> memberCount 0
    const leaveRes = await fetch(`${srv.origin}/api/vxpp-communities/${created.id}/membership`, {
      method: "DELETE",
      headers: { "x-test-user": "20" },
    });
    assert.equal((await leaveRes.json()).memberCount, 0);

    // Unknown slug -> 404
    const missingRes = await fetch(`${srv.origin}/api/vxpp-communities/does-not-exist`);
    assert.equal(missingRes.status, 404);
  } finally {
    await srv.close();
  }
});
