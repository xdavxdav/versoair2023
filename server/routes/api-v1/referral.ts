import { Router } from "express";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import jwt from "jsonwebtoken";

const router = Router();

// Helper: generate a short alphanumeric referral code
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Helper: extract userId from JWT
function getUserId(req: any): number | null {
  try {
    const token =
      req.cookies?.auth_token ||
      req.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || process.env.SESSION_SECRET!,
    ) as any;
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/referral/code
 * Get the current user's referral code (generates one if none exists)
 */
router.get("/code", async (req, res) => {
  const userId = getUserId(req);
  if (!userId)
    return res.status(401).json({ success: false, error: "Not authenticated" });

  try {
    const [user] = await db
      .select({ referralCode: schema.users.referralCode })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    let code = user.referralCode;

    // Generate a new code if the user doesn't have one yet
    if (!code) {
      code = generateReferralCode();

      // Retry on uniqueness collision (extremely unlikely)
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await db
            .update(schema.users)
            .set({ referralCode: code })
            .where(eq(schema.users.id, userId));
          break;
        } catch (err: any) {
          if (err.code === "23505") {
            code = generateReferralCode(); // collision, try again
          } else {
            throw err;
          }
        }
      }
    }

    // Count how many users this user has referred
    const [referralStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(eq(schema.users.referredBy, userId));

    res.json({
      success: true,
      referralCode: code,
      referralLink: `${req.protocol}://${req.get("host")}/register?ref=${code}`,
      referrals: referralStats?.count || 0,
    });
  } catch (error: any) {
    console.error("❌ Get referral code error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get referral code" });
  }
});

/**
 * GET /api/v1/referral/stats
 * Get detailed referral stats for the current user
 */
router.get("/stats", async (req, res) => {
  const userId = getUserId(req);
  if (!userId)
    return res.status(401).json({ success: false, error: "Not authenticated" });

  try {
    // Count total referrals
    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(eq(schema.users.referredBy, userId));

    // Count referrals by subscription tier
    const tierBreakdown = await db
      .select({
        tier: schema.users.subscriptionTier,
        count: sql<number>`count(*)`,
      })
      .from(schema.users)
      .where(eq(schema.users.referredBy, userId))
      .groupBy(schema.users.subscriptionTier);

    const paidReferrals = tierBreakdown
      .filter((t) => t.tier && t.tier !== "free")
      .reduce((sum, t) => sum + (t.count || 0), 0);

    res.json({
      success: true,
      stats: {
        totalReferrals: total?.count || 0,
        paidReferrals,
        tierBreakdown,
      },
    });
  } catch (error: any) {
    console.error("❌ Get referral stats error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to get referral stats" });
  }
});

/**
 * POST /api/v1/referral/apply
 * Apply a referral code to the current user (during or after registration)
 */
router.post("/apply", async (req, res) => {
  const userId = getUserId(req);
  if (!userId)
    return res.status(401).json({ success: false, error: "Not authenticated" });

  const { code } = req.body;
  if (!code || typeof code !== "string") {
    return res
      .status(400)
      .json({ success: false, error: "Referral code is required" });
  }

  try {
    // Check if user already has a referrer
    const [currentUser] = await db
      .select({ referredBy: schema.users.referredBy })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (currentUser?.referredBy) {
      return res
        .status(400)
        .json({ success: false, error: "You already have a referrer" });
    }

    // Find the referrer by code
    const [referrer] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.referralCode, code.toUpperCase().trim()))
      .limit(1);

    if (!referrer) {
      return res
        .status(404)
        .json({ success: false, error: "Invalid referral code" });
    }

    if (referrer.id === userId) {
      return res
        .status(400)
        .json({ success: false, error: "You cannot refer yourself" });
    }

    // Apply the referral
    await db
      .update(schema.users)
      .set({ referredBy: referrer.id })
      .where(eq(schema.users.id, userId));

    res.json({ success: true, message: "Referral code applied successfully" });
  } catch (error: any) {
    console.error("❌ Apply referral error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to apply referral code" });
  }
});

export default router;
