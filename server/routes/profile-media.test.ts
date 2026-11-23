import test from "node:test";
import assert from "node:assert/strict";
import "../test-support/route-harness";
import express from "express";
import type { AddressInfo } from "node:net";
import { createProfileMediaRouter } from "./profile-media";
import {
  sniffRasterImageMime,
  validateRasterImageBuffer,
} from "../utils/raster-image";

const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52,
]);

const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

const FAKE_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>',
);

function startTestServer(actorUserId: number | null = 42) {
  const store = {
    social: new Map<number, Record<string, any>>(),
    postMedia: new Map<number, { mime: string; data: Buffer; ownerId: number }>(),
    nextMediaId: 1,
  };

  store.social.set(42, {
    id: 101,
    user_id: 42,
    username: "luq",
    display_name: "Luq",
    avatar_url: null,
    avatar_data: null,
    avatar_mime: null,
    cover_image_url: null,
    cover_data: null,
    cover_mime: null,
    headline: null,
    bio: null,
    location: null,
    website: null,
    profession: null,
    company: null,
    interests: [],
    privacy_level: "public",
  });

  const fakePool = {
    async query(sql: string, params: unknown[] = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      if (normalized.startsWith("SELECT id FROM social_users WHERE user_id = $1")) {
        const row = store.social.get(Number(params[0]));
        return { rows: row ? [{ id: row.id }] : [] };
      }
      if (normalized.includes("FROM users u LEFT JOIN social_users su")) {
        const row = store.social.get(Number(params[0]));
        if (!row) return { rows: [] };
        return {
          rows: [
            {
              id: row.user_id,
              username: row.username,
              email: "luq@example.com",
              display_name: row.display_name,
              role: "user",
              account_type: "general",
              subscription_tier: "free",
              subscription_status: "active",
              created_at: new Date().toISOString(),
              social_user_id: row.id,
              avatar_url: row.avatar_url,
              cover_image_url: row.cover_image_url,
              headline: row.headline,
              bio: row.bio,
              location: row.location,
              website: row.website,
              profession: row.profession,
              company: row.company,
              interests: row.interests,
              privacy_level: row.privacy_level,
              follower_count: 3,
              following_count: 5,
              post_count: 2,
            },
          ],
        };
      }
      if (normalized.startsWith("UPDATE social_users SET avatar_url = $1")) {
        const uid = Number(params[3]);
        const row = store.social.get(uid)!;
        row.avatar_url = params[0];
        row.avatar_data = params[1];
        row.avatar_mime = params[2];
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE social_users SET avatar_url = NULL")) {
        const row = store.social.get(Number(params[0]))!;
        row.avatar_url = null;
        row.avatar_data = null;
        row.avatar_mime = null;
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE social_users SET cover_image_url = $1")) {
        const uid = Number(params[3]);
        const row = store.social.get(uid)!;
        row.cover_image_url = params[0];
        row.cover_data = params[1];
        row.cover_mime = params[2];
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE social_users SET cover_image_url = NULL")) {
        const row = store.social.get(Number(params[0]))!;
        row.cover_image_url = null;
        row.cover_data = null;
        row.cover_mime = null;
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith("UPDATE social_users SET updated_at = NOW()")) {
        const uid = Number(params[params.length - 1]);
        const row = store.social.get(uid)!;
        const setClause = normalized.split("SET ")[1].split(" WHERE ")[0];
        const parts = setClause.split(",").map((p) => p.trim());
        for (const part of parts) {
          const m = part.match(/^([a-z_]+) = \$(\d+)$/);
          if (m) row[m[1]] = params[Number(m[2]) - 1];
        }
        return { rows: [row], rowCount: 1 };
      }
      if (normalized.startsWith("SELECT avatar_data AS data")) {
        const row = store.social.get(Number(params[0]));
        return { rows: row ? [{ data: row.avatar_data, mime: row.avatar_mime }] : [] };
      }
      if (normalized.startsWith("SELECT cover_data AS data")) {
        const row = store.social.get(Number(params[0]));
        return { rows: row ? [{ data: row.cover_data, mime: row.cover_mime }] : [] };
      }
      if (normalized.startsWith("INSERT INTO social_post_media")) {
        const id = store.nextMediaId++;
        store.postMedia.set(id, {
          ownerId: Number(params[0]),
          mime: String(params[1]),
          data: params[2] as Buffer,
        });
        return { rows: [{ id }] };
      }
      if (normalized.startsWith("SELECT data, mime_type FROM social_post_media")) {
        const m = store.postMedia.get(Number(params[0]));
        return { rows: m ? [{ data: m.data, mime_type: m.mime }] : [] };
      }
      return { rows: [] };
    },
  };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/profile",
    createProfileMediaRouter({
      pool: fakePool,
      skipSchemaEnsure: true,
      authMiddleware: (req, res, next) => {
        if (!actorUserId) {
          return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        (req as any).user = { userId: String(actorUserId), id: String(actorUserId) };
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

test("raster-image sniffer accepts PNG/JPEG and rejects SVG scripts", () => {
  assert.equal(sniffRasterImageMime(VALID_PNG), "image/png");
  assert.equal(sniffRasterImageMime(VALID_JPEG), "image/jpeg");
  assert.equal(sniffRasterImageMime(FAKE_SVG), null);

  const svgResult = validateRasterImageBuffer(FAKE_SVG, "image/svg+xml");
  assert.equal(svgResult.ok, false);
  if (!svgResult.ok) assert.equal(svgResult.status, 415);

  const spoofedSvg = validateRasterImageBuffer(FAKE_SVG, "image/png");
  assert.equal(spoofedSvg.ok, false);
  if (!spoofedSvg.ok) assert.equal(spoofedSvg.status, 415);
});

test("avatar and cover upload, serve with safe headers, persist on /me, and delete cleanly", async () => {
  const srv = startTestServer(42);
  try {
    // Upload avatar
    const avatarForm = new FormData();
    avatarForm.append("avatar", new Blob([VALID_PNG], { type: "image/png" }), "me.png");
    const upAvatar = await fetch(`${srv.origin}/api/profile/avatar`, {
      method: "POST",
      body: avatarForm,
    });
    assert.equal(upAvatar.status, 200);
    const upAvatarJson = await upAvatar.json();
    assert.match(upAvatarJson.avatarUrl, /^\/api\/profile\/media\/42\/avatar\?v=\d+$/);

    // Serve avatar with nosniff + sandbox CSP
    const servedAvatar = await fetch(`${srv.origin}${upAvatarJson.avatarUrl}`);
    assert.equal(servedAvatar.status, 200);
    assert.equal(servedAvatar.headers.get("x-content-type-options"), "nosniff");
    assert.match(servedAvatar.headers.get("content-security-policy") || "", /sandbox/);
    assert.equal(servedAvatar.headers.get("content-type"), "image/png");

    // Upload cover photo
    const coverForm = new FormData();
    coverForm.append("cover", new Blob([VALID_JPEG], { type: "image/jpeg" }), "banner.jpg");
    const upCover = await fetch(`${srv.origin}/api/profile/cover`, {
      method: "POST",
      body: coverForm,
    });
    assert.equal(upCover.status, 200);
    const upCoverJson = await upCover.json();
    assert.match(upCoverJson.coverImageUrl, /^\/api\/profile\/media\/42\/cover\?v=\d+$/);

    // Reject spoofed SVG pretending to be PNG
    const badForm = new FormData();
    badForm.append("cover", new Blob([FAKE_SVG], { type: "image/png" }), "evil.png");
    const badRes = await fetch(`${srv.origin}/api/profile/cover`, {
      method: "POST",
      body: badForm,
    });
    assert.equal(badRes.status, 415);

    // Update bio, headline, interests, website
    const editRes = await fetch(`${srv.origin}/api/profile/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: "Builder & Creator",
        bio: "Connecting communities on vxpp.",
        location: "Montreal, QC",
        website: "https://www.versoair.com",
        interests: ["Music", "Design", "Music"],
      }),
    });
    assert.equal(editRes.status, 200);

    // Reject javascript: website URL
    const badUrl = await fetch(`${srv.origin}/api/profile/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ website: "javascript:alert(1)" }),
    });
    assert.equal(badUrl.status, 400);

    // Read /me reflects persisted avatar, cover, deduped interests, and stats
    const meRes = await fetch(`${srv.origin}/api/profile/me`);
    assert.equal(meRes.status, 200);
    const meJson = await meRes.json();
    assert.equal(meJson.profile.avatarUrl, upAvatarJson.avatarUrl);
    assert.equal(meJson.profile.coverImageUrl, upCoverJson.coverImageUrl);
    assert.equal(meJson.profile.headline, "Builder & Creator");
    assert.deepEqual(meJson.profile.interests, ["Music", "Design"]);

    // Delete avatar -> 404 when fetched
    const delRes = await fetch(`${srv.origin}/api/profile/avatar`, { method: "DELETE" });
    assert.equal(delRes.status, 200);
    const afterDel = await fetch(`${srv.origin}/api/profile/media/42/avatar`);
    assert.equal(afterDel.status, 404);

    // Upload & serve social post media
    const postForm = new FormData();
    postForm.append("image", new Blob([VALID_PNG], { type: "image/png" }), "post.png");
    const postUp = await fetch(`${srv.origin}/api/profile/post-media`, {
      method: "POST",
      body: postForm,
    });
    assert.equal(postUp.status, 201);
    const postUpJson = await postUp.json();
    const postImg = await fetch(`${srv.origin}${postUpJson.url}`);
    assert.equal(postImg.status, 200);
    assert.equal(postImg.headers.get("content-type"), "image/png");
  } finally {
    await srv.close();
  }
});

test("unauthenticated callers cannot upload or edit personal profile", async () => {
  const srv = startTestServer(null);
  try {
    const res = await fetch(`${srv.origin}/api/profile/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: "Unauthorized" }),
    });
    assert.equal(res.status, 401);
  } finally {
    await srv.close();
  }
});
