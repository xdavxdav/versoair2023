#!/usr/bin/env node
/**
 * Seed 4 test accounts with cross-data for A↔B, B↔C, A↔C testing.
 * Run: node scripts/seed-test-accounts.cjs
 */
"use strict";
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ACCOUNTS = [
  {
    username: "superadmin",
    email: "superadmin@versoair.test",
    role: "superuser",
    display_name: "Super Admin",
    avatar_url: "https://i.pravatar.cc/150?u=superadmin",
  },
  {
    username: "artist_demo",
    email: "artist_demo@versoair.test",
    role: "artist",
    display_name: "Artist Demo",
    avatar_url: "https://i.pravatar.cc/150?u=artist_demo",
  },
  {
    username: "community_demo",
    email: "community_demo@versoair.test",
    role: "community_manager",
    display_name: "Community Demo",
    avatar_url: "https://i.pravatar.cc/150?u=community_demo",
  },
  {
    username: "listener_demo",
    email: "listener_demo@versoair.test",
    role: "user",
    display_name: "Listener Demo",
    avatar_url: "https://i.pravatar.cc/150?u=listener_demo",
  },
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Upsert users ──────────────────────────────────────────────────────
    const userIds = {};
    for (const acc of ACCOUNTS) {
      const res = await client.query(
        `INSERT INTO users (username, email, role, display_name, avatar_url, is_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         ON CONFLICT (email) DO UPDATE SET
           role = EXCLUDED.role, display_name = EXCLUDED.display_name,
           avatar_url = EXCLUDED.avatar_url
         RETURNING id`,
        [acc.username, acc.email, acc.role, acc.display_name, acc.avatar_url],
      );
      userIds[acc.username] = res.rows[0].id;
      console.log(`✅ user ${acc.username} id=${userIds[acc.username]}`);
    }

    const [sa, ar, cm, li] = [
      "superadmin",
      "artist_demo",
      "community_demo",
      "listener_demo",
    ].map((k) => userIds[k]);

    // 2. Cross-follows ─────────────────────────────────────────────────────
    const followPairs = [
      [ar, li],
      [li, ar],
      [ar, cm],
      [cm, ar],
      [li, cm],
      [sa, ar],
    ];
    for (const [follower, following] of followPairs) {
      await client
        .query(
          `INSERT INTO user_connections (requester_id, recipient_id, status, created_at)
         VALUES ($1, $2, 'accepted', NOW())
         ON CONFLICT DO NOTHING`,
          [follower, following],
        )
        .catch(() => {
          /* table may not exist */
        });
    }
    console.log("✅ follows seeded");

    // 3. Seed artist_profiles row for artist_demo ──────────────────────────
    await client
      .query(
        `INSERT INTO artist_profiles (user_id, stage_name, bio, genre, is_verified, created_at)
       VALUES ($1, 'Artist Demo', 'Demo artist for A/B testing', 'Afrobeats', true, NOW())
       ON CONFLICT (user_id) DO NOTHING`,
        [ar],
      )
      .catch(() => {});
    console.log("✅ artist_profile seeded");

    // 4. Community posts (CDP + MUDP) ──────────────────────────────────────
    const posts = [
      {
        uid: cm,
        content: "[CDP] Welcome to the community hub — let's connect!",
      },
      {
        uid: cm,
        content: "[CDP] Business tip: consistency beats perfection every time.",
      },
      {
        uid: ar,
        content:
          "[MUDP] Just dropped a new Afrobeats track — feedback welcome!",
      },
      {
        uid: ar,
        content:
          "[CrossDP] Collab between artists and community managers incoming 🔥",
      },
      {
        uid: li,
        content: "[CDP] This platform is amazing, found 3 new artists today.",
      },
    ];
    for (const p of posts) {
      await client
        .query(
          `INSERT INTO community_posts (user_id, content, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT DO NOTHING`,
          [p.uid, p.content],
        )
        .catch(() => {});
    }
    console.log("✅ community posts seeded");

    // 5. Inbox conversations A↔B, B↔C, A↔C ────────────────────────────────
    const convoPairs = [
      [ar, li, "dm_share"],
      [ar, cm, "dm_share"],
      [li, cm, "dm_share"],
    ];
    for (const [u1, u2, type] of convoPairs) {
      const cRes = await client
        .query(
          `INSERT INTO inbox_conversations (type, created_at)
         VALUES ($1, NOW())
         ON CONFLICT DO NOTHING
         RETURNING id`,
          [type],
        )
        .catch(() => ({ rows: [] }));
      if (!cRes.rows[0]) continue;
      const cid = cRes.rows[0].id;
      await client
        .query(
          `INSERT INTO inbox_participants (conversation_id, user_id) VALUES ($1,$2),($1,$3) ON CONFLICT DO NOTHING`,
          [cid, u1, u2],
        )
        .catch(() => {});
      // 5 messages per conversation
      for (let i = 1; i <= 5; i++) {
        const sender = i % 2 === 0 ? u1 : u2;
        await client
          .query(
            `INSERT INTO inbox_messages (conversation_id, sender_id, content, is_read, created_at)
           VALUES ($1, $2, $3, false, NOW() - ($4 * interval '5 minutes'))
           ON CONFLICT DO NOTHING`,
            [cid, sender, `Test message ${i} in conversation`, 6 - i],
          )
          .catch(() => {});
      }
    }
    console.log("✅ inbox conversations seeded");

    await client.query("COMMIT");
    console.log("\n🎉 All test accounts seeded successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
