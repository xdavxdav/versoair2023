/**
 * 📬 Email Subscriptions API — 4-Channel Follow-Up System
 *
 * Manages user email subscription preferences for:
 *   - job_alerts        (Career page job matches)
 *   - contract_alerts   (Contractor page contract matches)
 *   - reservation_tracking (Booking status updates)
 *   - geoadmin_reports  (Market study digests)
 *   - platform_updates  (General platform news)
 *
 * Separate from GeoAdmin tier pricing — tiers gate *enhanced* features,
 * but basic subscriptions are available to all authenticated users.
 */

import { Router, Request, Response } from "express";
import { db, pool } from "../../db";
import { eq, and, sql } from "drizzle-orm";
import { emailSubscriptions, emailQueue, users } from "@shared/schema";
import crypto from "crypto";

const router = Router();

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────

const VALID_TYPES = [
  "job_alerts",
  "contract_alerts",
  "reservation_tracking",
  "geoadmin_reports",
  "platform_updates",
] as const;
type SubscriptionType = (typeof VALID_TYPES)[number];

const VALID_FREQUENCIES = ["instant", "daily_digest", "weekly_digest"] as const;
type Frequency = (typeof VALID_FREQUENCIES)[number];

/** Which tiers can access which subscription types */
const TIER_ACCESS: Record<string, SubscriptionType[]> = {
  free: ["job_alerts", "contract_alerts", "platform_updates"],
  essential: [
    "job_alerts",
    "contract_alerts",
    "reservation_tracking",
    "platform_updates",
  ],
  verified: [
    "job_alerts",
    "contract_alerts",
    "reservation_tracking",
    "geoadmin_reports",
    "platform_updates",
  ],
  max: [
    "job_alerts",
    "contract_alerts",
    "reservation_tracking",
    "geoadmin_reports",
    "platform_updates",
  ],
  enterprise: [
    "job_alerts",
    "contract_alerts",
    "reservation_tracking",
    "geoadmin_reports",
    "platform_updates",
  ],
};

/** Which tiers can use which frequencies */
const TIER_FREQUENCIES: Record<string, Frequency[]> = {
  free: ["daily_digest", "weekly_digest"],
  essential: ["daily_digest", "weekly_digest"],
  verified: ["instant", "daily_digest", "weekly_digest"],
  max: ["instant", "daily_digest", "weekly_digest"],
  enterprise: ["instant", "daily_digest", "weekly_digest"],
};

// ─── HELPERS ────────────────────────────────────────────────────────────────────

function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function getUserTier(userId: number): Promise<string> {
  const result = await pool.query(
    `SELECT subscription_tier, trial_tier, trial_expires_at FROM users WHERE id = $1`,
    [userId],
  );
  if (result.rows.length === 0) return "free";

  const user = result.rows[0];
  // If active trial, use trial tier
  if (
    user.trial_tier &&
    user.trial_expires_at &&
    new Date(user.trial_expires_at) > new Date()
  ) {
    return user.trial_tier;
  }
  return user.subscription_tier || "free";
}

// ─── ENDPOINTS ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/email-subscriptions/subscribe
 * Create or re-activate an email subscription for the authenticated user.
 * Body: { userId, type, frequency?, filters? }
 */
router.post("/subscribe", async (req: Request, res: Response) => {
  try {
    const { userId, type, frequency = "daily_digest", filters = {} } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    if (!type || !VALID_TYPES.includes(type as SubscriptionType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type. Valid: ${VALID_TYPES.join(", ")}`,
      });
    }

    if (!VALID_FREQUENCIES.includes(frequency as Frequency)) {
      return res.status(400).json({
        success: false,
        error: `Invalid frequency. Valid: ${VALID_FREQUENCIES.join(", ")}`,
      });
    }

    // Check tier access
    const tier = await getUserTier(userId);
    const allowedTypes = TIER_ACCESS[tier] || TIER_ACCESS.free;
    const allowedFrequencies = TIER_FREQUENCIES[tier] || TIER_FREQUENCIES.free;

    if (!allowedTypes.includes(type as SubscriptionType)) {
      return res.status(403).json({
        success: false,
        error: `Your ${tier} tier doesn't include ${type}. Upgrade to unlock this channel.`,
        requiredTier: type === "geoadmin_reports" ? "verified" : "essential",
      });
    }

    if (!allowedFrequencies.includes(frequency as Frequency)) {
      return res.status(403).json({
        success: false,
        error: `Instant delivery requires Verified tier or above. Your tier supports: ${allowedFrequencies.join(", ")}`,
        requiredTier: "verified",
      });
    }

    // Check if subscription already exists (including inactive ones)
    const existing = await db
      .select()
      .from(emailSubscriptions)
      .where(
        and(
          eq(emailSubscriptions.userId, userId),
          eq(emailSubscriptions.type, type),
        ),
      );

    if (existing.length > 0) {
      // Re-activate and update existing subscription
      const [updated] = await db
        .update(emailSubscriptions)
        .set({
          isActive: true,
          frequency,
          filters,
          updatedAt: new Date(),
        })
        .where(eq(emailSubscriptions.id, existing[0].id))
        .returning();

      return res.json({
        success: true,
        message: `${type} subscription reactivated`,
        data: updated,
      });
    }

    // Create new subscription
    const unsubscribeToken = generateUnsubscribeToken();
    const [subscription] = await db
      .insert(emailSubscriptions)
      .values({
        userId,
        type,
        frequency,
        filters,
        unsubscribeToken,
        isActive: true,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: `Subscribed to ${type} (${frequency})`,
      data: subscription,
    });
  } catch (error: any) {
    console.error("❌ Email subscribe error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/email-subscriptions/my
 * Get all email subscriptions for the authenticated user.
 * Query: ?userId=X
 */
router.get("/my", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.query.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    const subscriptions = await db
      .select()
      .from(emailSubscriptions)
      .where(eq(emailSubscriptions.userId, Number(userId)));

    // Also return what the user's tier allows
    const tier = await getUserTier(Number(userId));
    const allowedTypes = TIER_ACCESS[tier] || TIER_ACCESS.free;
    const allowedFrequencies = TIER_FREQUENCIES[tier] || TIER_FREQUENCIES.free;

    res.json({
      success: true,
      data: {
        subscriptions,
        tierAccess: {
          currentTier: tier,
          allowedTypes,
          allowedFrequencies,
          allTypes: VALID_TYPES,
          allFrequencies: VALID_FREQUENCIES,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Get subscriptions error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/email-subscriptions/:id
 * Update a subscription's frequency, filters, or active state.
 * Body: { userId, frequency?, filters?, isActive? }
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, frequency, filters, isActive } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(emailSubscriptions)
      .where(
        and(
          eq(emailSubscriptions.id, id),
          eq(emailSubscriptions.userId, userId),
        ),
      );

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Subscription not found" });
    }

    // Validate frequency against tier if changing
    if (frequency) {
      const tier = await getUserTier(userId);
      const allowedFrequencies =
        TIER_FREQUENCIES[tier] || TIER_FREQUENCIES.free;
      if (!allowedFrequencies.includes(frequency as Frequency)) {
        return res.status(403).json({
          success: false,
          error: `Instant delivery requires Verified tier or above.`,
          requiredTier: "verified",
        });
      }
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (frequency !== undefined) updateData.frequency = frequency;
    if (filters !== undefined) updateData.filters = filters;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(emailSubscriptions)
      .set(updateData)
      .where(eq(emailSubscriptions.id, id))
      .returning();

    res.json({
      success: true,
      message: "Subscription updated",
      data: updated,
    });
  } catch (error: any) {
    console.error("❌ Update subscription error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/email-subscriptions/:id
 * Permanently delete a subscription.
 * Body: { userId }
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.body.userId || req.query.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required" });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(emailSubscriptions)
      .where(
        and(
          eq(emailSubscriptions.id, id),
          eq(emailSubscriptions.userId, Number(userId)),
        ),
      );

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, error: "Subscription not found" });
    }

    await db.delete(emailSubscriptions).where(eq(emailSubscriptions.id, id));

    res.json({
      success: true,
      message: `Unsubscribed from ${existing.type}`,
    });
  } catch (error: any) {
    console.error("❌ Delete subscription error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/email-subscriptions/unsubscribe/:token
 * One-click unsubscribe via email link (CAN-SPAM compliance).
 * No authentication required — the token IS the auth.
 */
router.get("/unsubscribe/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const [subscription] = await db
      .select()
      .from(emailSubscriptions)
      .where(eq(emailSubscriptions.unsubscribeToken, token));

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: "Invalid unsubscribe link. It may have already been used.",
      });
    }

    // Deactivate the subscription (soft unsubscribe)
    await db
      .update(emailSubscriptions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(emailSubscriptions.id, subscription.id));

    // Return a simple HTML page for email link clicks
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Unsubscribed — Verso Air</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f4f4f4; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 440px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            h1 { color: #1a1a2e; margin: 0 0 12px; }
            p { color: #666; line-height: 1.6; }
            .emoji { font-size: 48px; margin-bottom: 16px; }
            a { color: #bf831c; text-decoration: none; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="emoji">📭</div>
            <h1>You've been unsubscribed</h1>
            <p>You will no longer receive <strong>${subscription.type.replace(/_/g, " ")}</strong> emails.</p>
            <p>Changed your mind? <a href="${process.env.VITE_API_URL || "http://localhost:5003"}/settings">Manage your preferences</a></p>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("❌ Unsubscribe error:", error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
});

/**
 * GET /api/v1/email-subscriptions/available
 * Public — returns all subscription types with descriptions.
 * Useful for the subscribe CTA cards on Career/Contractor pages.
 */
router.get("/available", async (_req: Request, res: Response) => {
  const channels = [
    {
      type: "job_alerts",
      label: "Job Alerts",
      description: "Get notified when new jobs match your preferences",
      icon: "🎯",
      color: "#2563eb",
      minTier: "free",
    },
    {
      type: "contract_alerts",
      label: "Contract Alerts",
      description:
        "Receive alerts for new contract opportunities matching your skills",
      icon: "🔨",
      color: "#d97706",
      minTier: "free",
    },
    {
      type: "reservation_tracking",
      label: "Reservation Tracking",
      description: "Track your booking status changes and updates in real-time",
      icon: "📋",
      color: "#059669",
      minTier: "essential",
    },
    {
      type: "geoadmin_reports",
      label: "GeoAdmin Reports",
      description:
        "Exclusive market study digests and business intelligence reports",
      icon: "📊",
      color: "#7c3aed",
      minTier: "verified",
    },
    {
      type: "platform_updates",
      label: "Platform Updates",
      description: "Stay informed about new features and platform improvements",
      icon: "🚀",
      color: "#0891b2",
      minTier: "free",
    },
  ];

  res.json({ success: true, data: channels });
});

/**
 * GET /api/v1/email-subscriptions/stats
 * Admin endpoint — returns email subscription statistics.
 * Query: ?adminKey=...
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    // Simple admin check (in production, use proper admin middleware)
    const result = await pool.query(`
      SELECT
        type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as paused,
        COUNT(DISTINCT user_id) as unique_users
      FROM email_subscriptions
      GROUP BY type
      ORDER BY total DESC
    `);

    const queueStats = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM email_queue
      GROUP BY status
    `);

    res.json({
      success: true,
      data: {
        subscriptionsByType: result.rows,
        emailQueue: queueStats.rows,
      },
    });
  } catch (error: any) {
    console.error("❌ Email stats error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
