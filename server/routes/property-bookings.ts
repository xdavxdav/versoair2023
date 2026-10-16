import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

let tableReady: Promise<void> | null = null;
function ensureTable() {
  tableReady ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS property_bookings (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        guests INTEGER NOT NULL DEFAULT 1,
        nights INTEGER NOT NULL,
        total_price NUMERIC(12,2) NOT NULL,
        special_requests TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE property_bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(40);
      CREATE INDEX IF NOT EXISTS property_bookings_property_idx ON property_bookings (property_id, check_in, check_out);
      CREATE INDEX IF NOT EXISTS property_bookings_user_idx ON property_bookings (user_id);`,
    )
    .then(() => undefined)
    .catch((err) => {
      tableReady = null;
      throw err;
    });
  return tableReady;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function parseDay(value: unknown): number | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
}

const mapRow = (r: any) => ({
  id: String(r.id),
  propertyId: String(r.property_id),
  propertyName: r.property_name ?? "",
  propertyImage: r.property_image ?? "",
  checkIn: r.check_in_text,
  checkOut: r.check_out_text,
  guests: r.guests,
  nights: r.nights,
  totalPrice: Number(r.total_price),
  specialRequests: r.special_requests ?? "",
  paymentMethod: r.payment_method ?? null,
  status: r.status,
  bookingDate: String(r.created_at?.toISOString?.() ?? "").slice(0, 10),
});

const SELECT = `SELECT b.*, to_char(b.check_in,'YYYY-MM-DD') AS check_in_text,
  to_char(b.check_out,'YYYY-MM-DD') AS check_out_text,
  p.name AS property_name, p.image AS property_image
  FROM property_bookings b LEFT JOIN properties p ON p.id = b.property_id`;

// Dates already taken (confirmed stays) so the UI can warn before submitting
router.get(
  "/api/properties/:id/unavailable",
  async (req: Request, res: Response) => {
    try {
      await ensureTable();
      const { rows } = await pool.query(
        `SELECT to_char(check_in,'YYYY-MM-DD') AS "checkIn", to_char(check_out,'YYYY-MM-DD') AS "checkOut"
         FROM property_bookings WHERE property_id = $1 AND status = 'confirmed' AND check_out >= CURRENT_DATE`,
        [Number(req.params.id)],
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("[property-bookings] unavailable:", err);
      res.status(500).json({ success: false, error: "Failed to load dates" });
    }
  },
);

router.get(
  "/api/property-bookings/mine",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      await ensureTable();
      const { rows } = await pool.query(
        `${SELECT} WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT 100`,
        [Number(req.user!.id)],
      );
      res.json({ success: true, data: rows.map(mapRow) });
    } catch (err) {
      console.error("[property-bookings] mine:", err);
      res.status(500).json({ success: false, error: "Failed to load bookings" });
    }
  },
);

router.post(
  "/api/property-bookings",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      await ensureTable();
      const { propertyId, checkIn, checkOut, guests, specialRequests, paymentMethod } =
        req.body ?? {};
      const method =
        typeof paymentMethod === "string" && /^[a-z0-9_-]{1,40}$/i.test(paymentMethod)
          ? paymentMethod
          : null;
      const inMs = parseDay(checkIn);
      const outMs = parseDay(checkOut);
      const guestCount = Number(guests);
      const pid = Number(propertyId);

      if (!Number.isInteger(pid) || inMs === null || outMs === null) {
        return res
          .status(400)
          .json({ success: false, error: "Property and valid dates are required" });
      }
      if (outMs <= inMs) {
        return res
          .status(400)
          .json({ success: false, error: "Check-out must be after check-in" });
      }
      if (inMs < Date.parse(new Date().toISOString().slice(0, 10) + "T00:00:00Z")) {
        return res
          .status(400)
          .json({ success: false, error: "Check-in cannot be in the past" });
      }
      if (!Number.isInteger(guestCount) || guestCount < 1) {
        return res
          .status(400)
          .json({ success: false, error: "At least 1 guest is required" });
      }

      const prop = await pool.query(
        `SELECT id, name, price, guests, discount FROM properties
         WHERE id = $1 AND verified = true AND verification_status = 'verified'`,
        [pid],
      );
      if (prop.rowCount === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Listing not available" });
      }
      const p = prop.rows[0];
      if (p.guests && guestCount > p.guests) {
        return res.status(400).json({
          success: false,
          error: `This listing accommodates up to ${p.guests} guests`,
        });
      }

      const conflict = await pool.query(
        `SELECT 1 FROM property_bookings
         WHERE property_id = $1 AND status = 'confirmed' AND check_in < $3::date AND check_out > $2::date LIMIT 1`,
        [pid, checkIn, checkOut],
      );
      if (conflict.rowCount) {
        return res.status(409).json({
          success: false,
          error: "These dates are not available. Please pick different dates.",
        });
      }

      const nights = Math.round((outMs - inMs) / DAY_MS);
      const base = Number(p.price) * nights;
      const total = base - (base * (Number(p.discount) || 0)) / 100;
      const notes =
        typeof specialRequests === "string"
          ? specialRequests.trim().slice(0, 1000)
          : "";

      const ins = await pool.query(
        `INSERT INTO property_bookings (property_id, user_id, check_in, check_out, guests, nights, total_price, special_requests, payment_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [pid, Number(req.user!.id), checkIn, checkOut, guestCount, nights, total.toFixed(2), notes, method],
      );
      const { rows } = await pool.query(`${SELECT} WHERE b.id = $1`, [ins.rows[0].id]);
      res.status(201).json({ success: true, data: mapRow(rows[0]) });
    } catch (err) {
      console.error("[property-bookings] create:", err);
      res.status(500).json({ success: false, error: "Failed to submit booking" });
    }
  },
);

router.post(
  "/api/property-bookings/:id/cancel",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      await ensureTable();
      const { rowCount } = await pool.query(
        `UPDATE property_bookings SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status IN ('pending','confirmed')`,
        [Number(req.params.id), Number(req.user!.id)],
      );
      if (!rowCount) {
        return res
          .status(404)
          .json({ success: false, error: "Booking not found or already closed" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[property-bookings] cancel:", err);
      res.status(500).json({ success: false, error: "Failed to cancel booking" });
    }
  },
);

export default router;
