/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — ESCROW & TRUST LAYER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Trustless transaction engine for service bookings.
 * Money held in escrow until client confirms delivery.
 *
 * POST /api/escrow/create        — Create escrow transaction
 * POST /api/escrow/:id/fund      — Mark as funded
 * POST /api/escrow/:id/release   — Client releases funds to business
 * POST /api/escrow/:id/dispute   — Open dispute
 * GET  /api/escrow/my            — User's escrow transactions
 * GET  /api/escrow/:id           — Single escrow detail
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { pool } from "../db";

const router = Router();
router.use(requireAuth);

// ─── Ensure escrow table exists ──────────────────────────────────────────────
async function ensureEscrowTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS escrow_transactions (
        id SERIAL PRIMARY KEY,
        buyer_id INTEGER NOT NULL,
        seller_id INTEGER,
        business_id INTEGER,
        amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        service_date TIMESTAMP,
        funded_at TIMESTAMP,
        released_at TIMESTAMP,
        disputed_at TIMESTAMP,
        dispute_reason TEXT,
        resolution TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch {
    // Table may already exist
  }
}

// Initialize on first import
ensureEscrowTable();

// ─── POST /api/escrow/create ─────────────────────────────────────────────────

const createEscrowSchema = z.object({
  businessId: z.number().optional(),
  sellerId: z.number().optional(),
  amount: z.number().positive().max(100000),
  currency: z
    .enum(["CAD", "USD", "EUR", "XAF", "XOF", "GBP"])
    .optional()
    .default("CAD"),
  title: z.string().min(3).max(255),
  description: z.string().max(1000).optional(),
  serviceDate: z.string().optional(),
});

router.post("/create", async (req: Request, res: Response) => {
  const parsed = createEscrowSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message,
    });
  }

  const userId = parseInt(req.user!.userId);
  const {
    businessId,
    sellerId,
    amount,
    currency,
    title,
    description,
    serviceDate,
  } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO escrow_transactions (buyer_id, seller_id, business_id, amount, currency, title, description, service_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING *`,
      [
        userId,
        sellerId || null,
        businessId || null,
        amount,
        currency,
        title,
        description || null,
        serviceDate || null,
      ],
    );

    return res.json({
      success: true,
      escrow: result.rows[0],
      message: "Escrow created. Fund it to activate.",
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: "Failed to create escrow: " + err.message,
    });
  }
});

// ─── POST /api/escrow/:id/fund ───────────────────────────────────────────────

router.post("/:id/fund", async (req: Request, res: Response) => {
  const userId = parseInt(req.user!.userId);
  const escrowId = parseInt(req.params.id);

  try {
    const existing = await pool.query(
      `SELECT * FROM escrow_transactions WHERE id = $1 AND buyer_id = $2`,
      [escrowId, userId],
    );

    if (existing.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Escrow not found" });
    }

    if (existing.rows[0].status !== "pending") {
      return res
        .status(400)
        .json({ success: false, error: "Escrow already funded or completed" });
    }

    // Deduct from wallet
    const walletResult = await pool.query(
      `UPDATE wallets SET balance = balance - $1 WHERE user_id = $2 AND balance >= $1 RETURNING balance`,
      [existing.rows[0].amount, userId],
    );

    if (walletResult.rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Insufficient wallet balance" });
    }

    await pool.query(
      `UPDATE escrow_transactions SET status = 'funded', funded_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [escrowId],
    );

    return res.json({
      success: true,
      message: "Escrow funded successfully. Funds are held securely.",
      newBalance: parseFloat(walletResult.rows[0].balance),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/escrow/:id/release ────────────────────────────────────────────

router.post("/:id/release", async (req: Request, res: Response) => {
  const userId = parseInt(req.user!.userId);
  const escrowId = parseInt(req.params.id);

  try {
    const existing = await pool.query(
      `SELECT * FROM escrow_transactions WHERE id = $1 AND buyer_id = $2`,
      [escrowId, userId],
    );

    if (existing.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Escrow not found" });
    }

    if (existing.rows[0].status !== "funded") {
      return res
        .status(400)
        .json({ success: false, error: "Escrow must be funded to release" });
    }

    const sellerId = existing.rows[0].seller_id;
    const amount = parseFloat(existing.rows[0].amount);

    // Credit seller's wallet (create if not exists)
    if (sellerId) {
      await pool.query(
        `INSERT INTO wallets (user_id, balance) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + $2`,
        [sellerId, amount],
      );
    }

    await pool.query(
      `UPDATE escrow_transactions SET status = 'released', released_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [escrowId],
    );

    return res.json({
      success: true,
      message: `$${amount.toFixed(2)} released to seller. Transaction complete.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/escrow/:id/dispute ────────────────────────────────────────────

const disputeSchema = z.object({
  reason: z.string().min(10).max(1000),
});

router.post("/:id/dispute", async (req: Request, res: Response) => {
  const userId = parseInt(req.user!.userId);
  const escrowId = parseInt(req.params.id);

  const parsed = disputeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: parsed.error.issues[0]?.message });
  }

  try {
    const existing = await pool.query(
      `SELECT * FROM escrow_transactions WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)`,
      [escrowId, userId],
    );

    if (existing.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Escrow not found" });
    }

    if (!["funded", "pending"].includes(existing.rows[0].status)) {
      return res
        .status(400)
        .json({ success: false, error: "Cannot dispute a completed escrow" });
    }

    await pool.query(
      `UPDATE escrow_transactions SET status = 'disputed', disputed_at = NOW(), dispute_reason = $2, updated_at = NOW() WHERE id = $1`,
      [escrowId, parsed.data.reason],
    );

    return res.json({
      success: true,
      message: "Dispute opened. An admin will review within 48 hours.",
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/escrow/my ──────────────────────────────────────────────────────

router.get("/my", async (req: Request, res: Response) => {
  const userId = parseInt(req.user!.userId);

  try {
    const result = await pool.query(
      `SELECT e.*, b.name as business_name
       FROM escrow_transactions e
       LEFT JOIN businesses b ON e.business_id = b.id
       WHERE e.buyer_id = $1 OR e.seller_id = $1
       ORDER BY e.created_at DESC
       LIMIT 50`,
      [userId],
    );

    return res.json({
      success: true,
      transactions: result.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/escrow/:id ─────────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  const userId = parseInt(req.user!.userId);
  const escrowId = parseInt(req.params.id);

  try {
    const result = await pool.query(
      `SELECT e.*, b.name as business_name
       FROM escrow_transactions e
       LEFT JOIN businesses b ON e.business_id = b.id
       WHERE e.id = $1 AND (e.buyer_id = $2 OR e.seller_id = $2)`,
      [escrowId, userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Escrow not found" });
    }

    return res.json({
      success: true,
      escrow: result.rows[0],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
