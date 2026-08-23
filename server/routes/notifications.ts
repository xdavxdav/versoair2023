// GET  /api/notifications        — user's latest 50 notifications
// POST /api/notifications/read-all — mark all read
// POST /api/notifications/:id/read — mark one read
import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

async function ensureNotifTable() {
  await pool
    .query(
      `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL,
      type VARCHAR(30) NOT NULL DEFAULT 'activity',
      title TEXT NOT NULL DEFAULT '',
      message TEXT,
      actor_name TEXT,
      actor_avatar TEXT,
      entity_url TEXT,
      read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
    )
    .catch(() => {
      /* may already exist with different shape */
    });
  // Ensure new columns exist on legacy tables
  const cols = ["actor_name TEXT", "actor_avatar TEXT", "entity_url TEXT"];
  for (const col of cols) {
    const [name] = col.split(" ");
    await pool
      .query(
        `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ${name} ${col.split(" ").slice(1).join(" ")}`,
      )
      .catch(() => {});
  }
}

// Map legacy type names to the NotificationCenter type names
function mapType(raw: string): string {
  const map: Record<string, string> = {
    connection_request: "follow",
    connection_accepted: "follow",
    track_review: "like",
    message: "message",
    activity: "publish",
    job_posted: "mention",
    contract_posted: "mention",
    reservation_update: "comment",
  };
  return map[raw] || raw;
}

// GET /api/notifications
router.get("/", requireAuth(), async (req, res) => {
  try {
    await ensureNotifTable();
    const userId = parseInt(req.user!.userId);
    const result = await pool.query(
      `SELECT id::text, type, title, message,
              actor_name AS "actorName", actor_avatar AS "actorAvatar",
              entity_url AS "entityUrl", read, created_at AS "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId],
    );
    const rows = result.rows.map((r: any) => ({
      id: r.id,
      type: mapType(r.type),
      actorName: r.actorName || "Someone",
      actorAvatar: r.actorAvatar || null,
      text: r.message || r.title || "",
      entityUrl: r.entityUrl || null,
      read: r.read,
      createdAt: r.createdAt,
    }));
    res.json({ success: true, notifications: rows });
  } catch (err: any) {
    console.error("[NOTIFICATIONS] GET error:", err.message);
    res.json({ success: true, notifications: [] });
  }
});

// POST /api/notifications/read-all
router.post("/read-all", requireAuth(), async (req, res) => {
  try {
    const userId = parseInt(req.user!.userId);
    await pool.query(
      `UPDATE notifications SET read = true WHERE user_id = $1`,
      [userId],
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notifications/:id/read
router.post("/:id/read", requireAuth(), async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET read = true WHERE id = $1`, [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
