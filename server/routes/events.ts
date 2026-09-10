import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import { generateUniqueSlug } from "../services/profile-migration";

const router = Router();
const reviewRoles = ["admin", "moderator", "superuser"];
const organizerRoles = [
  "admin",
  "moderator",
  "superuser",
  "artist",
  "user",
  "listener",
];

function eventPayload(body: Record<string, unknown>) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const startsAt = String(body.startsAt || "").trim();
  const endsAt = body.endsAt ? String(body.endsAt).trim() : null;
  const eventType = String(body.eventType || "COMMUNITY")
    .trim()
    .toUpperCase();
  const venue = body.venue ? String(body.venue).trim() : null;
  const city = body.city ? String(body.city).trim() : null;
  const communityId = body.communityId ? Number(body.communityId) : null;

  if (
    !title ||
    !description ||
    !startsAt ||
    !Number.isFinite(Date.parse(startsAt))
  ) {
    return { error: "Title, description, and a valid start date are required" };
  }
  if (endsAt && !Number.isFinite(Date.parse(endsAt))) {
    return { error: "End date must be valid" };
  }
  if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return { error: "End date cannot be before start date" };
  }

  return {
    value: {
      title,
      description,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      eventType,
      venue,
      city,
      communityId: Number.isInteger(communityId) ? communityId : null,
    },
  };
}

router.get("/", async (req, res) => {
  try {
    const type = String(req.query.type || "")
      .trim()
      .toUpperCase();
    const values: string[] = [];
    const filters = ["e.status = 'PUBLISHED'", "e.starts_at >= NOW()"];
    if (type) {
      values.push(type);
      filters.push(`e.event_type = $${values.length}`);
    }
    const result = await pool.query(
      `SELECT e.id, e.title, e.slug, e.description, e.event_type,
              e.starts_at, e.ends_at, e.venue, e.city, e.image_url,
              e.community_id, ac.name AS community_name,
              (SELECT COUNT(*)::int FROM event_attendees ea
               WHERE ea.event_id = e.id AND ea.status = 'GOING') AS attendee_count
       FROM events e
       LEFT JOIN artisan_communities ac ON ac.id = e.community_id
       WHERE ${filters.join(" AND ")}
       ORDER BY e.starts_at ASC
       LIMIT 100`,
      values,
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[events:list]", error);
    res.status(500).json({ error: "Failed to load events" });
  }
});

router.get("/me", requireAuth(), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug, description, event_type, starts_at, ends_at,
              venue, city, image_url, community_id, status, created_at, updated_at
       FROM events WHERE organizer_id = $1 ORDER BY created_at DESC`,
      [Number(req.user?.userId)],
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[events:mine]", error);
    res.status(500).json({ error: "Failed to load your events" });
  }
});

router.get("/admin", requireAuth(reviewRoles), async (req, res) => {
  try {
    const status = String(req.query.status || "PENDING")
      .trim()
      .toUpperCase();
    const allowedStatuses = [
      "DRAFT",
      "PENDING",
      "PUBLISHED",
      "REJECTED",
      "SUSPENDED",
      "ARCHIVED",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid event status" });
    }
    const result = await pool.query(
      `SELECT e.id, e.title, e.slug, e.description, e.event_type,
              e.starts_at, e.ends_at, e.venue, e.city, e.status,
              e.created_at, e.updated_at,
              COALESCE(u.display_name, u.username, u.email) AS organizer_name,
              u.email AS organizer_email
       FROM events e
       LEFT JOIN users u ON u.id = e.organizer_id
       WHERE e.status = $1
       ORDER BY e.updated_at DESC NULLS LAST, e.created_at DESC`,
      [status],
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("[events:admin]", error);
    res.status(500).json({ error: "Failed to load event review queue" });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id, e.title, e.slug, e.description, e.event_type,
              e.starts_at, e.ends_at, e.venue, e.city, e.image_url,
              e.community_id, ac.name AS community_name,
              (SELECT COUNT(*)::int FROM event_attendees ea
               WHERE ea.event_id = e.id AND ea.status = 'GOING') AS attendee_count
       FROM events e
       LEFT JOIN artisan_communities ac ON ac.id = e.community_id
       WHERE e.slug = $1 AND e.status = 'PUBLISHED'`,
      [req.params.slug],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Event not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[events:detail]", error);
    res.status(500).json({ error: "Failed to load event" });
  }
});

router.post("/", requireAuth(organizerRoles), async (req, res) => {
  const parsed = eventPayload(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  try {
    const value = parsed.value!;
    const slug = await generateUniqueSlug(value.title, "event");
    const result = await pool.query(
      `INSERT INTO events
         (organizer_id, community_id, title, slug, description, event_type,
          starts_at, ends_at, venue, city, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'DRAFT')
       RETURNING *`,
      [
        Number(req.user?.userId),
        value.communityId,
        value.title,
        slug,
        value.description,
        value.eventType,
        value.startsAt,
        value.endsAt,
        value.venue,
        value.city,
      ],
    );
    await pool.query(
      `INSERT INTO event_audit (event_id, action, performed_by)
       VALUES ($1, 'created', $2)`,
      [result.rows[0].id, Number(req.user?.userId)],
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[events:create]", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.post("/:id/submit", requireAuth(), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE events SET status = 'PENDING', updated_at = NOW()
       WHERE id = $1 AND organizer_id = $2 AND status = 'DRAFT'
       RETURNING id, status`,
      [Number(req.params.id), Number(req.user?.userId)],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Draft event not found" });
    await pool.query(
      `INSERT INTO event_audit (event_id, action, performed_by)
       VALUES ($1, 'submitted', $2)`,
      [Number(req.params.id), Number(req.user?.userId)],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[events:submit]", error);
    res.status(500).json({ error: "Failed to submit event" });
  }
});

router.get("/:id/rsvp/status", requireAuth(), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT EXISTS(
         SELECT 1 FROM event_attendees
         WHERE event_id = $1 AND user_id = $2 AND status = 'GOING'
       ) AS attending,
       (SELECT COUNT(*)::int FROM event_attendees
        WHERE event_id = $1 AND status = 'GOING') AS attendee_count`,
      [Number(req.params.id), Number(req.user?.userId)],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[events:rsvp-status]", error);
    res.status(500).json({ error: "Failed to load RSVP status" });
  }
});

router.post("/:id/rsvp", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(eventId)) {
    return res.status(400).json({ error: "Invalid event id" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO event_attendees (event_id, user_id, status, updated_at)
       SELECT id, $2, 'GOING', NOW() FROM events
       WHERE id = $1 AND status = 'PUBLISHED'
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET status = 'GOING', updated_at = NOW()
       RETURNING event_id, status`,
      [eventId, userId],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Published event not found" });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[events:rsvp]", error);
    res.status(500).json({ error: "Failed to RSVP to event" });
  }
});

router.delete("/:id/rsvp", requireAuth(), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE event_attendees SET status = 'CANCELLED', updated_at = NOW()
       WHERE event_id = $1 AND user_id = $2 AND status = 'GOING'
       RETURNING event_id`,
      [Number(req.params.id), Number(req.user?.userId)],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "RSVP not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("[events:rsvp-cancel]", error);
    res.status(500).json({ error: "Failed to cancel RSVP" });
  }
});

router.post("/:id/status", requireAuth(reviewRoles), async (req, res) => {
  const status = String(req.body?.status || "").toUpperCase();
  if (!["PUBLISHED", "REJECTED", "SUSPENDED", "ARCHIVED"].includes(status)) {
    return res.status(400).json({ error: "Invalid event status" });
  }
  try {
    const result = await pool.query(
      `UPDATE events SET status = $1, published_at = CASE WHEN $1 = 'PUBLISHED' THEN NOW() ELSE published_at END, updated_at = NOW()
       WHERE id = $2 RETURNING id, status`,
      [status, Number(req.params.id)],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Event not found" });
    await pool.query(
      `INSERT INTO event_audit (event_id, action, performed_by, reason)
       VALUES ($1, $2, $3, $4)`,
      [
        Number(req.params.id),
        `status_${status.toLowerCase()}`,
        Number(req.user?.userId),
        req.body?.reason || null,
      ],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[events:status]", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

router.put("/:id", requireAuth(reviewRoles), async (req, res) => {
  const parsed = eventPayload(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    const value = parsed.value!;
    const result = await pool.query(
      `UPDATE events SET title = $1, description = $2, event_type = $3,
              starts_at = $4, ends_at = $5, venue = $6, city = $7,
              updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        value.title,
        value.description,
        value.eventType,
        value.startsAt,
        value.endsAt,
        value.venue,
        value.city,
        Number(req.params.id),
      ],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Event not found" });
    await pool.query(
      `INSERT INTO event_audit (event_id, action, performed_by)
       VALUES ($1, 'updated', $2)`,
      [Number(req.params.id), Number(req.user?.userId)],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[events:update]", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/:id", requireAuth(["admin", "superuser"]), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM events WHERE id = $1 RETURNING id`,
      [Number(req.params.id)],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Event not found" });
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error("[events:delete]", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
