import { Router, Request } from "express";
import { pool } from "../db";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { generateUniqueSlug } from "../services/profile-migration";
import { onlinePaymentsEnabled } from "../utils/commercial-gates";
import {
  ensurePaidOfferTables,
  getPaidOffer,
  hasPurchasedOffer,
} from "../services/paid-offers";
import { ensureEventArsenalSchema } from "../services/event-arsenal-schema";
import {
  createEventArsenalItem,
  deleteEventArsenalItem,
  listEventArsenalItems,
  listEventBoxOfficeOrders,
  listUserEventArsenalOrders,
  mapArsenalItemRow,
  updateEventArsenalItem,
} from "../services/event-arsenal";
import { isEventThemeAccent, type EventArsenalItem } from "@shared/event-arsenal";
import { notifyZapier } from "../services/zapier-notify";

const router = Router();
const reviewRoles = ["admin", "moderator", "superuser"];

function resolveUserId(req: Request): number {
  return Number(req.user?.userId ?? (req.user as any)?.id);
}

function isReviewer(req: Request): boolean {
  return reviewRoles.includes(String(req.user?.role || "").toLowerCase());
}

function isValidImageInput(raw: string): boolean {
  return (
    raw.startsWith("https://") ||
    raw.startsWith("http://") ||
    raw.startsWith("/") ||
    /^data:image\/(webp|jpeg|jpg|png|gif);base64,/i.test(raw)
  );
}

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
  const imageUrlRaw =
    typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const themeAccent = isEventThemeAccent(body.themeAccent)
    ? body.themeAccent
    : "amber";
  const rawCapacity = body.capacity;
  const capacity =
    rawCapacity === null || rawCapacity === undefined || rawCapacity === ""
      ? null
      : Number(rawCapacity);

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
  if (imageUrlRaw) {
    if (imageUrlRaw.length > 700_000 || !isValidImageInput(imageUrlRaw)) {
      return {
        error: "Flyer image must be a valid https:// URL or uploaded image",
      };
    }
  }
  if (
    capacity !== null &&
    (!Number.isInteger(capacity) || capacity < 1 || capacity > 100_000)
  ) {
    return { error: "Capacity must be a whole number between 1 and 100,000" };
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
      imageUrl: imageUrlRaw || null,
      themeAccent,
      capacity,
      communityId: Number.isInteger(communityId) ? communityId : null,
    },
  };
}

async function loadEventArsenalMap(
  eventIds: number[],
  includeInactive = false,
): Promise<Map<number, EventArsenalItem[]>> {
  const byEvent = new Map<number, EventArsenalItem[]>();
  if (!eventIds.length) return byEvent;
  const rows = await pool.query(
    `SELECT * FROM event_arsenal_items
      WHERE event_id = ANY($1::int[]) ${includeInactive ? "" : "AND active = TRUE"}
      ORDER BY
        CASE kind WHEN 'TICKET' THEN 0 WHEN 'MERCH' THEN 1 ELSE 2 END ASC,
        sort_order ASC,
        id ASC`,
    [eventIds],
  );
  for (const r of rows.rows) {
    const item = mapArsenalItemRow(r);
    const list = byEvent.get(item.eventId) ?? [];
    list.push(item);
    byEvent.set(item.eventId, list);
  }
  return byEvent;
}

async function findManagedEvent(eventId: number, req: Request) {
  if (!Number.isInteger(eventId) || eventId <= 0) return null;
  const ev = await pool.query(
    `SELECT id, organizer_id, title, slug, status, capacity, theme_accent
       FROM events
      WHERE id = $1`,
    [eventId],
  );
  if (!ev.rows.length) return null;
  const row = ev.rows[0];
  if (!isReviewer(req) && Number(row.organizer_id) !== resolveUserId(req)) {
    return "forbidden" as const;
  }
  return row;
}

router.get("/", async (req, res) => {
  try {
    await ensureEventArsenalSchema(pool);
    const type = String(req.query.type || "")
      .trim()
      .toUpperCase();
    const search = String(req.query.q || "").trim();
    const values: unknown[] = [];
    const filters = [
      "e.status = 'PUBLISHED'",
      "COALESCE(e.ends_at, e.starts_at + INTERVAL '6 hours') >= NOW()",
    ];
    if (type) {
      values.push(type);
      filters.push(`e.event_type = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      filters.push(
        `(e.title ILIKE $${values.length} OR COALESCE(e.city, '') ILIKE $${values.length} OR COALESCE(e.venue, '') ILIKE $${values.length})`,
      );
    }
    const result = await pool.query(
      `SELECT e.id, e.title, e.slug, e.description, e.event_type,
              e.starts_at, e.ends_at, e.venue, e.city, e.image_url,
              e.theme_accent, e.capacity,
              e.community_id, ac.name AS community_name,
              COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), 'Verso Air Host') AS organizer_name,
              (SELECT COUNT(*)::int FROM event_attendees ea
               WHERE ea.event_id = e.id AND ea.status = 'GOING') AS attendee_count,
              (SELECT COUNT(*)::int FROM event_arsenal_items ai
               WHERE ai.event_id = e.id AND ai.active = TRUE AND ai.kind = 'TICKET') AS ticket_tier_count,
              (SELECT COUNT(*)::int FROM event_arsenal_items ai
               WHERE ai.event_id = e.id AND ai.active = TRUE AND ai.kind = 'MERCH') AS merch_count,
              (SELECT COUNT(*)::int FROM event_arsenal_items ai
               WHERE ai.event_id = e.id AND ai.active = TRUE AND ai.kind = 'ADDON') AS addon_count,
              (SELECT MIN(ai.price_cents)::int FROM event_arsenal_items ai
               WHERE ai.event_id = e.id AND ai.active = TRUE AND ai.kind = 'TICKET') AS min_ticket_cents
       FROM events e
       LEFT JOIN artisan_communities ac ON ac.id = e.community_id
       LEFT JOIN users u ON u.id = e.organizer_id
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
    await ensureEventArsenalSchema(pool);
    await ensurePaidOfferTables(pool);
    const userId = resolveUserId(req);
    const exemptByRole = isReviewer(req);
    const hostFeeOffer = await getPaidOffer(pool, "event_host_fee");
    const hostFeeActive = Boolean(hostFeeOffer?.active);

    const result = await pool.query(
      `SELECT e.id, e.title, e.slug, e.description, e.event_type, e.starts_at, e.ends_at,
              e.venue, e.city, e.image_url, e.theme_accent, e.capacity,
              e.community_id, e.status, e.created_at, e.updated_at,
              EXISTS (
                SELECT 1 FROM paid_offer_purchases pop
                 WHERE pop.user_id = $1
                   AND pop.offer_key = 'event_host_fee'
                   AND pop.event_id = e.id
              ) AS host_fee_paid,
              (SELECT COUNT(*)::int FROM event_attendees ea
                WHERE ea.event_id = e.id AND ea.status = 'GOING') AS attendee_count,
              COALESCE((
                SELECT SUM(o.total_cents)::int FROM event_arsenal_orders o
                 WHERE o.event_id = e.id AND o.status = 'paid'
              ), 0) AS revenue_cents,
              (SELECT COUNT(*)::int FROM event_arsenal_orders o
                WHERE o.event_id = e.id AND o.status = 'paid') AS orders_count,
              (SELECT COUNT(*)::int FROM event_arsenal_orders o
                WHERE o.event_id = e.id AND o.status = 'paid' AND o.checked_in_at IS NOT NULL) AS checked_in_count,
              (SELECT ea_log.reason FROM event_audit ea_log
                WHERE ea_log.event_id = e.id AND ea_log.reason IS NOT NULL
                ORDER BY ea_log.created_at DESC LIMIT 1) AS latest_audit_reason
         FROM events e
        WHERE e.organizer_id = $1
        ORDER BY e.created_at DESC`,
      [userId],
    );

    const ids = result.rows.map((r) => Number(r.id));
    const arsenalMap = await loadEventArsenalMap(ids, true);
    const data = result.rows.map((r) => ({
      ...r,
      arsenal_items: arsenalMap.get(Number(r.id)) ?? [],
    }));

    res.json({
      success: true,
      data,
      meta: {
        hostFee: {
          required: hostFeeActive && !exemptByRole,
          active: hostFeeActive,
          amountCents: hostFeeOffer?.amountCents ?? 2500,
          exemptByRole,
          onlinePaymentsOpen: onlinePaymentsEnabled(),
        },
      },
    });
  } catch (error) {
    console.error("[events:mine]", error);
    res.status(500).json({ error: "Failed to load your events" });
  }
});

router.get("/admin", requireAuth(reviewRoles), async (req, res) => {
  try {
    await ensureEventArsenalSchema(pool);
    await ensurePaidOfferTables(pool);
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
      `SELECT e.id, e.organizer_id, e.title, e.slug, e.description, e.event_type,
              e.starts_at, e.ends_at, e.venue, e.city, e.image_url,
              e.theme_accent, e.capacity, e.status,
              e.created_at, e.updated_at,
              COALESCE(u.display_name, u.username, u.email) AS organizer_name,
              u.email AS organizer_email,
              EXISTS (
                SELECT 1 FROM paid_offer_purchases pop
                 WHERE pop.user_id = e.organizer_id
                   AND pop.offer_key = 'event_host_fee'
                   AND pop.event_id = e.id
              ) AS host_fee_paid,
              (SELECT pop.amount_cents FROM paid_offer_purchases pop
                WHERE pop.user_id = e.organizer_id
                  AND pop.offer_key = 'event_host_fee'
                  AND pop.event_id = e.id
                ORDER BY pop.purchased_at DESC LIMIT 1) AS host_fee_cents,
              (SELECT COUNT(*)::int FROM event_attendees ea
                WHERE ea.event_id = e.id AND ea.status = 'GOING') AS attendee_count,
              COALESCE((
                SELECT SUM(o.total_cents)::int FROM event_arsenal_orders o
                 WHERE o.event_id = e.id AND o.status = 'paid'
              ), 0) AS revenue_cents,
              (SELECT COUNT(*)::int FROM event_arsenal_orders o
                WHERE o.event_id = e.id AND o.status = 'paid') AS orders_count
       FROM events e
       LEFT JOIN users u ON u.id = e.organizer_id
       WHERE e.status = $1
       ORDER BY e.updated_at DESC NULLS LAST, e.created_at DESC`,
      [status],
    );
    const ids = result.rows.map((r) => Number(r.id));
    const arsenalMap = await loadEventArsenalMap(ids, true);
    const data = result.rows.map((r) => ({
      ...r,
      arsenal_items: arsenalMap.get(Number(r.id)) ?? [],
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error("[events:admin]", error);
    res.status(500).json({ error: "Failed to load event review queue" });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    await ensureEventArsenalSchema(pool);
    const rawParam = String(req.params.slug || "");
    const numericId = /^\d+$/.test(rawParam) ? Number(rawParam) : null;
    const result = await pool.query(
      `SELECT e.id, e.organizer_id, e.title, e.slug, e.description, e.event_type,
              e.starts_at, e.ends_at, e.venue, e.city, e.image_url,
              e.theme_accent, e.capacity,
              e.community_id, ac.name AS community_name,
              COALESCE(NULLIF(u.display_name, ''), NULLIF(u.username, ''), 'Verso Air Host') AS organizer_name,
              (SELECT COUNT(*)::int FROM event_attendees ea
               WHERE ea.event_id = e.id AND ea.status = 'GOING') AS attendee_count
       FROM events e
       LEFT JOIN artisan_communities ac ON ac.id = e.community_id
       LEFT JOIN users u ON u.id = e.organizer_id
       WHERE (e.slug = $1 OR ($2::int IS NOT NULL AND e.id = $2::int))
         AND e.status = 'PUBLISHED'
       ORDER BY CASE WHEN e.slug = $1 THEN 0 ELSE 1 END
       LIMIT 1`,
      [rawParam, numericId],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Event not found" });

    const eventRow = result.rows[0];
    const arsenalItems = await listEventArsenalItems(pool, Number(eventRow.id), {
      includeInactive: false,
    });
    res.json({
      success: true,
      data: {
        ...eventRow,
        arsenal_items: arsenalItems,
      },
    });
  } catch (error) {
    console.error("[events:detail]", error);
    res.status(500).json({ error: "Failed to load event" });
  }
});

router.post("/", requireAuth(), async (req, res) => {
  const parsed = eventPayload(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  try {
    await ensureEventArsenalSchema(pool);
    const userId = resolveUserId(req);
    const value = parsed.value!;
    const slug = await generateUniqueSlug(value.title, "event");
    const result = await pool.query(
      `INSERT INTO events
         (organizer_id, community_id, title, slug, description, event_type,
          starts_at, ends_at, venue, city, image_url, theme_accent, capacity, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'DRAFT')
       RETURNING *`,
      [
        userId,
        value.communityId,
        value.title,
        slug,
        value.description,
        value.eventType,
        value.startsAt,
        value.endsAt,
        value.venue,
        value.city,
        value.imageUrl,
        value.themeAccent,
        value.capacity,
      ],
    );

    const createdEvent = result.rows[0];
    const createdArsenal: EventArsenalItem[] = [];
    if (Array.isArray(req.body?.arsenalItems)) {
      let idx = 0;
      for (const rawItem of req.body.arsenalItems.slice(0, 24)) {
        const created = await createEventArsenalItem(
          pool,
          Number(createdEvent.id),
          {
            ...rawItem,
            sortOrder:
              typeof rawItem?.sortOrder === "number" ? rawItem.sortOrder : idx,
          },
        );
        if (!created.ok) {
          return res.status(400).json({ error: created.error });
        }
        createdArsenal.push(created.item);
        idx += 1;
      }
    }

    await pool.query(
      `INSERT INTO event_audit (event_id, action, performed_by)
       VALUES ($1, 'created', $2)`,
      [createdEvent.id, userId],
    );
    res.status(201).json({
      success: true,
      data: {
        ...createdEvent,
        arsenal_items: createdArsenal,
      },
    });
  } catch (error) {
    console.error("[events:create]", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.post("/:id/submit", requireAuth(), async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const userId = resolveUserId(req);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const existing = await pool.query(
      `SELECT id, status FROM events
        WHERE id = $1 AND organizer_id = $2 AND status IN ('DRAFT', 'REJECTED')`,
      [eventId, userId],
    );
    if (!existing.rowCount) {
      return res.status(404).json({ error: "Draft event not found" });
    }

    if (!isReviewer(req)) {
      const hostFeeOffer = await getPaidOffer(pool, "event_host_fee");
      if (hostFeeOffer?.active) {
        const feePaid = await hasPurchasedOffer(
          pool,
          userId,
          "event_host_fee",
          eventId,
        );
        if (!feePaid) {
          if (!onlinePaymentsEnabled()) {
            return res.status(503).json({
              error:
                "Online card checkout is not currently enabled to pay the event hosting fee.",
              code: "ONLINE_PAYMENTS_UNAVAILABLE",
            });
          }
          return res.status(402).json({
            error: "Event hosting fee required before submitting for review.",
            code: "HOST_FEE_REQUIRED",
            amountCents: hostFeeOffer.amountCents,
          });
        }
      }
    }

    const result = await pool.query(
      `UPDATE events SET status = 'PENDING', updated_at = NOW()
       WHERE id = $1 AND organizer_id = $2 AND status IN ('DRAFT', 'REJECTED')
       RETURNING id, status`,
      [eventId, userId],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Draft event not found" });
    await pool.query(
      `INSERT INTO event_audit (event_id, action, performed_by)
       VALUES ($1, 'submitted', $2)`,
      [eventId, userId],
    );
    notifyZapier("event_submission", {
      eventId: result.rows[0].id,
      status: result.rows[0].status,
      submittedBy: userId,
    });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[events:submit]", error);
    res.status(500).json({ error: "Failed to submit event" });
  }
});

// ─── EVENT ARSENAL (TICKETS, MERCH & VIP ADD-ONS) ───────────────────────────

router.get("/:id/arsenal", optionalAuth, async (req, res) => {
  const eventId = Number(req.params.id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ error: "Invalid event id" });
  }
  try {
    await ensureEventArsenalSchema(pool);
    const ev = await pool.query(
      `SELECT id, organizer_id, status FROM events WHERE id = $1`,
      [eventId],
    );
    if (!ev.rows.length) {
      return res.status(404).json({ error: "Event not found" });
    }
    const row = ev.rows[0];
    const isManager =
      Boolean(req.user) &&
      (isReviewer(req) || Number(row.organizer_id) === resolveUserId(req));
    if (row.status !== "PUBLISHED" && !isManager) {
      return res.status(404).json({ error: "Event not found" });
    }
    const items = await listEventArsenalItems(pool, eventId, {
      includeInactive: isManager,
    });
    res.json({ success: true, data: items });
  } catch (error) {
    console.error("[events:arsenal:list]", error);
    res.status(500).json({ error: "Failed to load event arsenal" });
  }
});

router.post("/:id/arsenal", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  try {
    const managed = await findManagedEvent(eventId, req);
    if (!managed) return res.status(404).json({ error: "Event not found" });
    if (managed === "forbidden") {
      return res.status(403).json({ error: "Not authorized to manage this event" });
    }
    const created = await createEventArsenalItem(pool, eventId, req.body || {});
    if (!created.ok) {
      return res.status(400).json({ error: created.error });
    }
    res.status(201).json({ success: true, data: created.item });
  } catch (error) {
    console.error("[events:arsenal:create]", error);
    res.status(500).json({ error: "Failed to create arsenal item" });
  }
});

router.put("/:id/arsenal/:itemId", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ error: "Invalid arsenal item id" });
  }
  try {
    const managed = await findManagedEvent(eventId, req);
    if (!managed) return res.status(404).json({ error: "Event not found" });
    if (managed === "forbidden") {
      return res.status(403).json({ error: "Not authorized to manage this event" });
    }
    const updated = await updateEventArsenalItem(
      pool,
      eventId,
      itemId,
      req.body || {},
    );
    if (!updated.ok) {
      return res.status(updated.status ?? 400).json({ error: updated.error });
    }
    res.json({ success: true, data: updated.item });
  } catch (error) {
    console.error("[events:arsenal:update]", error);
    res.status(500).json({ error: "Failed to update arsenal item" });
  }
});

router.delete("/:id/arsenal/:itemId", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ error: "Invalid arsenal item id" });
  }
  try {
    const managed = await findManagedEvent(eventId, req);
    if (!managed) return res.status(404).json({ error: "Event not found" });
    if (managed === "forbidden") {
      return res.status(403).json({ error: "Not authorized to manage this event" });
    }
    const deleted = await deleteEventArsenalItem(pool, eventId, itemId);
    if (!deleted) {
      return res.status(404).json({ error: "Arsenal item not found" });
    }
    res.json({ success: true, id: itemId });
  } catch (error) {
    console.error("[events:arsenal:delete]", error);
    res.status(500).json({ error: "Failed to delete arsenal item" });
  }
});

// ─── BUYER DIGITAL DOOR PASSES & ORGANIZER BOX OFFICE ───────────────────────

router.get("/:id/my-arsenal", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  const userId = resolveUserId(req);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ error: "Invalid event id" });
  }
  try {
    const orders = await listUserEventArsenalOrders(pool, userId, eventId);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("[events:my-arsenal]", error);
    res.status(500).json({ error: "Failed to load your event passes" });
  }
});

router.get("/:id/box-office", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  try {
    await ensureEventArsenalSchema(pool);
    const managed = await findManagedEvent(eventId, req);
    if (!managed) return res.status(404).json({ error: "Event not found" });
    if (managed === "forbidden") {
      return res.status(403).json({ error: "Not authorized to view box office" });
    }

    const [orders, items, attendeeRes] = await Promise.all([
      listEventBoxOfficeOrders(pool, eventId),
      listEventArsenalItems(pool, eventId, { includeInactive: true }),
      pool.query(
        `SELECT COUNT(*)::int AS attendee_count
           FROM event_attendees
          WHERE event_id = $1 AND status = 'GOING'`,
        [eventId],
      ),
    ]);

    const paidOrders = orders.filter((o) => o.status === "paid");
    const grossRevenueCents = paidOrders.reduce((s, o) => s + o.totalCents, 0);
    const ticketsSold = paidOrders.reduce((s, o) => s + o.ticketQty, 0);
    const merchSold = paidOrders.reduce((s, o) => s + o.merchQty, 0);
    const checkedInOrders = paidOrders.filter((o) => Boolean(o.checkedInAt)).length;
    const merchFulfilledOrders = paidOrders.filter((o) =>
      Boolean(o.merchFulfilledAt),
    ).length;

    res.json({
      success: true,
      data: {
        event: managed,
        stats: {
          attendeeCount: Number(attendeeRes.rows[0]?.attendee_count || 0),
          capacity: managed.capacity === null ? null : Number(managed.capacity),
          paidOrders: paidOrders.length,
          grossRevenueCents,
          ticketsSold,
          merchSold,
          checkedInOrders,
          merchFulfilledOrders,
        },
        arsenalItems: items,
        orders,
      },
    });
  } catch (error) {
    console.error("[events:box-office]", error);
    res.status(500).json({ error: "Failed to load event box office" });
  }
});

router.post("/:id/orders/:orderId/check-in", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  const orderId = Number(req.params.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: "Invalid order id" });
  }
  try {
    await ensureEventArsenalSchema(pool);
    const managed = await findManagedEvent(eventId, req);
    if (!managed) return res.status(404).json({ error: "Event not found" });
    if (managed === "forbidden") {
      return res.status(403).json({ error: "Not authorized to check in guests" });
    }

    const { checkedIn, merchFulfilled } = req.body || {};
    const updates: string[] = ["updated_at = NOW()"];
    if (typeof checkedIn === "boolean") {
      updates.push(
        checkedIn ? "checked_in_at = COALESCE(checked_in_at, NOW())" : "checked_in_at = NULL",
      );
    }
    if (typeof merchFulfilled === "boolean") {
      updates.push(
        merchFulfilled
          ? "merch_fulfilled_at = COALESCE(merch_fulfilled_at, NOW())"
          : "merch_fulfilled_at = NULL",
      );
    }
    const updated = await pool.query(
      `UPDATE event_arsenal_orders
          SET ${updates.join(", ")}
        WHERE id = $1 AND event_id = $2 AND status = 'paid'
        RETURNING id, pass_code, status, checked_in_at, merch_fulfilled_at`,
      [orderId, eventId],
    );
    if (!updated.rows.length) {
      return res.status(404).json({ error: "Paid pass order not found" });
    }
    res.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error("[events:check-in]", error);
    res.status(500).json({ error: "Failed to update pass check-in" });
  }
});

router.get("/:id/rsvp/status", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(eventId)) {
    return res.status(400).json({ error: "Invalid event id" });
  }
  try {
    const result = await pool.query(
      `SELECT EXISTS(
         SELECT 1 FROM event_attendees
         WHERE event_id = $1 AND user_id = $2 AND status = 'GOING'
       ) AS attending,
       (SELECT COUNT(*)::int FROM event_attendees
        WHERE event_id = $1 AND status = 'GOING') AS attendee_count`,
      [eventId, userId],
    );
    // A paid ticket is not cancelled from the page; it goes through support.
    const ticketPaid = await hasPurchasedOffer(
      pool,
      userId,
      "activity_ticket",
      eventId,
    );
    res.json({ success: true, data: { ...result.rows[0], ticketPaid } });
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
    // Once activity tickets are on sale, joining requires a paid ticket; the
    // Stripe webhook adds paid attendees directly. Someone who already paid
    // (and was taken off the list since) may rejoin without paying again.
    if (onlinePaymentsEnabled()) {
      const ticket = await getPaidOffer(pool, "activity_ticket");
      if (ticket?.active) {
        const already = await pool.query(
          `SELECT 1 FROM event_attendees
            WHERE event_id = $1 AND user_id = $2 AND status = 'GOING'`,
          [eventId, userId],
        );
        if (
          !already.rowCount &&
          !(await hasPurchasedOffer(pool, userId, "activity_ticket", eventId))
        ) {
          return res.status(402).json({
            error: "A ticket is required to join this activity",
            code: "PAYMENT_REQUIRED",
          });
        }
      }
    }
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
  const eventId = Number(req.params.id);
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(eventId)) {
    return res.status(400).json({ error: "Invalid event id" });
  }
  try {
    if (await hasPurchasedOffer(pool, userId, "activity_ticket", eventId)) {
      return res.status(409).json({
        error:
          "This ticket was paid for. Contact support to cancel it and request a refund.",
        code: "TICKET_PAID",
      });
    }
    const result = await pool.query(
      `UPDATE event_attendees SET status = 'CANCELLED', updated_at = NOW()
       WHERE event_id = $1 AND user_id = $2 AND status = 'GOING'
       RETURNING event_id`,
      [eventId, userId],
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

router.put("/:id", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  const parsed = eventPayload(req.body || {});
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  try {
    await ensureEventArsenalSchema(pool);
    const managed = await findManagedEvent(eventId, req);
    if (!managed) return res.status(404).json({ error: "Event not found" });
    if (managed === "forbidden") {
      return res.status(403).json({ error: "Not authorized to edit this event" });
    }
    const value = parsed.value!;
    const result = await pool.query(
      `UPDATE events
          SET title = $1,
              description = $2,
              event_type = $3,
              starts_at = $4,
              ends_at = $5,
              venue = $6,
              city = $7,
              image_url = $8,
              theme_accent = $9,
              capacity = $10,
              updated_at = NOW()
        WHERE id = $11
        RETURNING *`,
      [
        value.title,
        value.description,
        value.eventType,
        value.startsAt,
        value.endsAt,
        value.venue,
        value.city,
        value.imageUrl,
        value.themeAccent,
        value.capacity,
        eventId,
      ],
    );
    if (!result.rowCount)
      return res.status(404).json({ error: "Event not found" });
    await pool.query(
      `INSERT INTO event_audit (event_id, action, performed_by)
       VALUES ($1, 'updated', $2)`,
      [eventId, resolveUserId(req)],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("[events:update]", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/:id", requireAuth(), async (req, res) => {
  const eventId = Number(req.params.id);
  try {
    const managed = await findManagedEvent(eventId, req);
    if (!managed) return res.status(404).json({ error: "Event not found" });
    if (managed === "forbidden") {
      return res.status(403).json({ error: "Not authorized to delete this event" });
    }
    if (
      !["admin", "superuser"].includes(String(req.user?.role || "").toLowerCase()) &&
      managed.status !== "DRAFT"
    ) {
      return res.status(409).json({
        error: "Only draft events can be deleted directly by the organizer.",
      });
    }
    const result = await pool.query(
      `DELETE FROM events WHERE id = $1 RETURNING id`,
      [eventId],
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
