/**
 * Beatmaker API Routes
 * Handles beat/production request workflow
 */
import { Router, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────
// REQUESTS — User submits beat/production requests
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /api/beatmaker/requests — Get user's production requests
 */
router.get("/requests", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if table exists first
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'beatmaker_requests'
      ) as exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      return res.json({ requests: [], message: "Table not yet created" });
    }

    const result = await db.execute(sql`
      SELECT 
        br.*,
        u.display_name as producer_name
      FROM beatmaker_requests br
      LEFT JOIN users u ON br.claimed_by = u.id
      WHERE br.user_id = ${userId}
      ORDER BY br.created_at DESC
      LIMIT 50
    `);

    res.json({ requests: result.rows });
  } catch (error) {
    console.error("Error fetching beatmaker requests:", error);
    res.json({ requests: [] });
  }
});

/**
 * POST /api/beatmaker/requests — Submit a new production request
 */
router.post("/requests", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const {
      genre,
      mood,
      bpm,
      key,
      reference_urls,
      intent_style,
      intended_use,
      delivery_type,
      deadline,
      budget_tier,
      message,
      creative_sliders,
    } = req.body;

    if (!genre || !mood) {
      return res.status(400).json({ error: "Genre and mood are required" });
    }

    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'beatmaker_requests'
      ) as exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      // Create table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS beatmaker_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          genre VARCHAR(100) NOT NULL,
          mood VARCHAR(50) NOT NULL,
          bpm INTEGER DEFAULT 140,
          key VARCHAR(20),
          reference_urls TEXT[],
          intent_style VARCHAR(100),
          intended_use VARCHAR(50) DEFAULT 'personal',
          delivery_type VARCHAR(50) DEFAULT 'beat_only',
          deadline TIMESTAMP,
          budget_tier VARCHAR(20) DEFAULT 'standard',
          message TEXT,
          creative_sliders JSONB,
          status VARCHAR(30) DEFAULT 'submitted',
          claimed_by INTEGER REFERENCES users(id),
          producer_notes TEXT,
          delivery_url TEXT,
          rating INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }

    const result = await db.execute(sql`
      INSERT INTO beatmaker_requests (
        user_id, genre, mood, bpm, key, reference_urls, intent_style,
        intended_use, delivery_type, deadline, budget_tier, message,
        creative_sliders, status
      ) VALUES (
        ${userId},
        ${genre},
        ${mood},
        ${bpm || 140},
        ${key || null},
        ${reference_urls || []},
        ${intent_style || null},
        ${intended_use || "personal"},
        ${delivery_type || "beat_only"},
        ${deadline ? new Date(deadline) : null},
        ${budget_tier || "standard"},
        ${message || null},
        ${creative_sliders ? JSON.stringify(creative_sliders) : null},
        'submitted'
      )
      RETURNING *
    `);

    res.status(201).json({ request: result.rows[0] });
  } catch (error) {
    console.error("Error creating beatmaker request:", error);
    res.status(500).json({ error: "Failed to create request" });
  }
});

/**
 * PATCH /api/beatmaker/requests/:id — Update a request (e.g., cancel, add info)
 */
router.patch(
  "/requests/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const requestId = parseInt(req.params.id);
      const { status, message } = req.body;

      // Verify ownership
      const check = await db.execute(sql`
      SELECT id FROM beatmaker_requests WHERE id = ${requestId} AND user_id = ${userId}
    `);

      if (check.rows.length === 0) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Only allow certain status changes from user
      const allowedStatuses = ["cancelled"];
      if (status && !allowedStatuses.includes(status)) {
        return res.status(403).json({ error: "Cannot update to this status" });
      }

      const result = await db.execute(sql`
      UPDATE beatmaker_requests
      SET 
        status = COALESCE(${status}, status),
        message = COALESCE(${message}, message),
        updated_at = NOW()
      WHERE id = ${requestId} AND user_id = ${userId}
      RETURNING *
    `);

      res.json({ request: result.rows[0] });
    } catch (error) {
      console.error("Error updating beatmaker request:", error);
      res.status(500).json({ error: "Failed to update request" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// BRIEFS — Saved templates for quick reuse
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /api/beatmaker/briefs — Get user's saved briefs
 */
router.get("/briefs", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'beatmaker_briefs'
      ) as exists
    `);

    if (!tableCheck.rows[0]?.exists) {
      return res.json({ briefs: [] });
    }

    const result = await db.execute(sql`
      SELECT * FROM beatmaker_briefs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    `);

    res.json({ briefs: result.rows });
  } catch (error) {
    console.error("Error fetching briefs:", error);
    res.json({ briefs: [] });
  }
});

/**
 * POST /api/beatmaker/briefs — Save a brief template
 */
router.post("/briefs", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const {
      name,
      genre,
      mood,
      bpm,
      key,
      referenceUrls,
      intentStyle,
      intendedUse,
      deliveryType,
      message,
      energy,
      darkness,
      bounce,
    } = req.body;

    // Create table if needed
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS beatmaker_briefs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name VARCHAR(200) NOT NULL,
        genre VARCHAR(100),
        mood VARCHAR(50),
        bpm INTEGER,
        key VARCHAR(20),
        reference_urls TEXT[],
        intent_style VARCHAR(100),
        intended_use VARCHAR(50),
        delivery_type VARCHAR(50),
        message TEXT,
        energy INTEGER,
        darkness INTEGER,
        bounce INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await db.execute(sql`
      INSERT INTO beatmaker_briefs (
        user_id, name, genre, mood, bpm, key, reference_urls, intent_style,
        intended_use, delivery_type, message, energy, darkness, bounce
      ) VALUES (
        ${userId},
        ${name || "Untitled Brief"},
        ${genre || null},
        ${mood || null},
        ${bpm || null},
        ${key || null},
        ${referenceUrls || []},
        ${intentStyle || null},
        ${intendedUse || "personal"},
        ${deliveryType || "beat_only"},
        ${message || null},
        ${energy || 50},
        ${darkness || 50},
        ${bounce || 50}
      )
      RETURNING *
    `);

    res.status(201).json({ brief: result.rows[0] });
  } catch (error) {
    console.error("Error saving brief:", error);
    res.status(500).json({ error: "Failed to save brief" });
  }
});

/**
 * DELETE /api/beatmaker/briefs/:id — Delete a saved brief
 */
router.delete(
  "/briefs/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const briefId = parseInt(req.params.id);

      await db.execute(sql`
      DELETE FROM beatmaker_briefs
      WHERE id = ${briefId} AND user_id = ${userId}
    `);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting brief:", error);
      res.status(500).json({ error: "Failed to delete brief" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// PRODUCERS — List available producers (for premium users)
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /api/beatmaker/producers — Get list of available producers
 */
router.get("/producers", requireAuth(), async (req: Request, res: Response) => {
  try {
    // For now, return producers from users with artist tier
    const result = await db.execute(sql`
      SELECT 
        u.id,
        u.display_name,
        u.avatar_url,
        u.bio,
        pa.tier as artist_tier,
        pa.genres,
        pa.specialties
      FROM users u
      JOIN portal_access pa ON u.id = pa.user_id
      WHERE pa.portal_type = 'artist' 
        AND pa.tier IN ('flame', 'blaze', 'inferno')
        AND pa.specialties @> ARRAY['producer']::text[]
      ORDER BY pa.tier DESC, u.display_name
      LIMIT 50
    `);

    res.json({ producers: result.rows });
  } catch (error) {
    console.error("Error fetching producers:", error);
    res.json({ producers: [] });
  }
});

export default router;
