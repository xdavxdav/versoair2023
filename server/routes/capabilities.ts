/**
 * Capabilities API — unified portal access detection and account upgrades
 *
 * GET  /api/user/capabilities     — returns user's portal access + capability flags
 * POST /api/user/become-artist    — creates artist_profiles row, grants artist portal
 * POST /api/user/become-contractor — creates contractors row, grants contractor portal
 * POST /api/user/upgrade-subscription — redirects to Stripe checkout for tier upgrade
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { generateArtistCode } from "../utils/artist-code";

const router = Router();

// ─── Shared helper: compute capabilities for a user ────────────────────────

export async function computeUserCapabilities(userId: number) {
  // 1. Fetch base user data
  const userResult = await db.execute(
    sql`SELECT id, username, email, role, subscription_tier, subscription_status,
               trial_tier, trial_started_at, trial_expires_at,
               oauth_provider, portal_access
        FROM users WHERE id = ${userId} LIMIT 1`,
  );
  const user = userResult.rows?.[0] as any;
  if (!user) return null;

  // 2. Check artist_profiles
  const artistResult = await db.execute(
    sql`SELECT id, stage_name FROM artist_profiles WHERE user_id = ${userId} LIMIT 1`,
  );
  const hasArtistProfile = (artistResult.rows?.length ?? 0) > 0;
  const artistProfile = hasArtistProfile ? (artistResult.rows[0] as any) : null;

  // 3. Check contractors
  const contractorResult = await db.execute(
    sql`SELECT id, specialization FROM contractors WHERE user_id = ${userId} LIMIT 1`,
  );
  const isContractor = (contractorResult.rows?.length ?? 0) > 0;

  // 4. Determine active subscription tier (account for trials)
  let effectiveTier = user.subscription_tier || "free";
  let isTrialing = false;
  if (
    user.trial_tier &&
    user.trial_expires_at &&
    new Date(user.trial_expires_at) > new Date()
  ) {
    effectiveTier = user.trial_tier;
    isTrialing = true;
  }

  // 5. Build portals array from DB column or compute fresh
  //    Base: every authenticated user gets general + streamer (additive model)
  const portals = new Set<string>(["general", "streamer"]);

  if (hasArtistProfile || user.role === "artist") portals.add("artist");
  if (isContractor) portals.add("contractor");
  if (
    effectiveTier !== "free" &&
    ["active", "trialing"].includes(user.subscription_status || "active")
  ) {
    portals.add("geo-admin");
  }
  // Community: check portal_access JSONB, or fallback to username prefix
  const existingPortalAccess: string[] = Array.isArray(user.portal_access)
    ? user.portal_access
    : [];
  if (
    existingPortalAccess.includes("community") ||
    user.username?.startsWith("community_")
  ) {
    portals.add("community");
  }
  // Admin/moderator/superuser get all portals
  if (["admin", "moderator", "superuser"].includes(user.role)) {
    portals.add("artist");
    portals.add("geo-admin");
    portals.add("contractor");
    portals.add("community");
  }

  const portalArray = [...portals].sort();

  return {
    portals: portalArray,
    subscriptionTier: effectiveTier,
    subscriptionStatus: user.subscription_status || "active",
    isTrialing,
    trialExpiresAt: user.trial_expires_at || null,
    hasArtistProfile,
    artistStageName: artistProfile?.stage_name || null,
    isContractor,
    hasOAuthAccount: !!user.oauth_provider,
    oauthProvider: user.oauth_provider || null,
    canAccessBlog:
      portals.has("community") ||
      portals.has("geo-admin") ||
      ["admin", "moderator", "superuser"].includes(user.role),
    role: user.role || "user",
  };
}

/**
 * Helper: sync computed portals back to the portal_access column
 */
async function syncPortalAccess(userId: number, portals: string[]) {
  await db
    .update(schema.users)
    .set({ portalAccess: portals })
    .where(eq(schema.users.id, userId));
}

// ─── GET /api/user/capabilities ──────────────────────────────────────────────

router.get(
  "/capabilities",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.user!.userId);
    const capabilities = await computeUserCapabilities(userId);

    if (!capabilities) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Sync portal_access column opportunistically
    await syncPortalAccess(userId, capabilities.portals);

    res.json({ success: true, ...capabilities });
  }),
);

// ─── POST /api/user/become-artist ────────────────────────────────────────────

const becomeArtistSchema = z.object({
  stageName: z.string().min(1, "Stage name is required").max(100),
  legalName: z.string().max(200).optional(),
  genre: z.array(z.string()).max(3, "Maximum 3 genres").optional(),
  country: z.string().max(100).optional(),
  bio: z.string().max(2000).optional(),
  spotifyUrl: z.string().url().optional().or(z.literal("")),
  instagramHandle: z.string().max(100).optional(),
});

router.post(
  "/become-artist",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.user!.userId);

    // Check if user already has an artist profile
    const existing = await db
      .select({ id: schema.artistProfiles.id })
      .from(schema.artistProfiles)
      .where(eq(schema.artistProfiles.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You already have an artist profile",
      });
    }

    const parsed = becomeArtistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
    }

    const {
      stageName,
      legalName,
      genre,
      country,
      bio,
      spotifyUrl,
      instagramHandle,
    } = parsed.data;

    // Determine league from country
    let leagueId: number | undefined;
    if (country) {
      try {
        const countryLower = country.toLowerCase();
        let leagueName = "Americas";
        const africaCountries = [
          "nigeria",
          "ghana",
          "kenya",
          "south africa",
          "senegal",
          "cameroon",
          "ethiopia",
          "tanzania",
          "morocco",
          "egypt",
        ];
        const europeCountries = [
          "france",
          "germany",
          "uk",
          "united kingdom",
          "spain",
          "italy",
          "portugal",
          "netherlands",
          "belgium",
          "sweden",
        ];
        const asiaCountries = [
          "japan",
          "china",
          "korea",
          "india",
          "indonesia",
          "thailand",
          "vietnam",
          "philippines",
          "australia",
        ];
        const middleEastCountries = [
          "saudi",
          "uae",
          "qatar",
          "kuwait",
          "bahrain",
          "jordan",
          "lebanon",
          "israel",
          "turkey",
          "iran",
        ];

        if (africaCountries.some((c) => countryLower.includes(c)))
          leagueName = "Africa";
        else if (europeCountries.some((c) => countryLower.includes(c)))
          leagueName = "Europe";
        else if (asiaCountries.some((c) => countryLower.includes(c)))
          leagueName = "Asia-Pacific";
        else if (middleEastCountries.some((c) => countryLower.includes(c)))
          leagueName = "Middle East";

        const league = await db.execute(
          sql`SELECT id FROM regional_leagues WHERE name = ${leagueName} LIMIT 1`,
        );
        if ((league.rows as any[]).length > 0) {
          leagueId = (league.rows[0] as any).id;
        }
      } catch {
        // League table might not exist yet
      }
    }

    // Get user email + current role for payout and role switching
    const [userRow] = await db
      .select({ email: schema.users.email, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    // Determine if this is a staff user (for special artist code)
    const staffRoles = ["superuser", "admin", "moderator"];
    const isStaff = staffRoles.includes((userRow?.role || "").toLowerCase());
    const gateUser = isStaff
      ? await db
          .select({ gateUsername: schema.users.gateUsername })
          .from(schema.users)
          .where(eq(schema.users.id, userId))
          .limit(1)
          .then((r) => r[0]?.gateUsername || undefined)
      : undefined;

    // Generate artist code
    const artistCode = generateArtistCode(
      stageName,
      "discovery",
      new Date(),
      gateUser || undefined,
      undefined,
      country || 0,
      "MOD",
      "x",
    );

    // Create artist profile
    await db.insert(schema.artistProfiles).values({
      userId,
      stageName,
      legalName: legalName || null,
      genre: genre || [],
      country: country || null,
      bio: bio || null,
      spotifyUrl: spotifyUrl || null,
      instagramHandle: instagramHandle || null,
      leagueId: leagueId || null,
      payoutEmail: userRow?.email || null,
      artistCode,
      division: "discovery",
      evaluationStatus: "pending",
      contractAccess: "none",
    });

    // Update user role to artist and add portal access
    const capabilities = await computeUserCapabilities(userId);
    const newPortals = capabilities
      ? [...new Set([...capabilities.portals, "artist"])]
      : ["general", "artist"];

    // Save previous role for switching back, then update to artist
    await db
      .update(schema.users)
      .set({
        previousRole: userRow?.role || "user",
        role: "artist",
        portalAccess: newPortals.sort(),
      })
      .where(eq(schema.users.id, userId));

    console.log(
      `[CAPABILITIES] User ${userId} became an artist (${stageName})`,
    );

    res.json({
      success: true,
      message:
        "Artist profile created! You now have access to the Artist Portal.",
      portals: newPortals.sort(),
    });
  }),
);

// ─── POST /api/user/restore-staff-role ───────────────────────────────────────
// Restores a staff member's original role after they switched to artist mode.
// Only works if previousRole was saved during become-artist.

router.post(
  "/restore-staff-role",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.user!.userId);

    // Get current user data
    const [userRow] = await db
      .select({
        role: schema.users.role,
        previousRole: schema.users.previousRole,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!userRow) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!userRow.previousRole) {
      return res.status(400).json({
        success: false,
        message:
          "No previous staff role to restore. You were not a staff member before.",
      });
    }

    const validStaffRoles = ["superuser", "admin", "moderator"];
    if (!validStaffRoles.includes(userRow.previousRole)) {
      return res.status(400).json({
        success: false,
        message: "Previous role is not a staff role. Cannot restore.",
      });
    }

    // Restore role and clear previousRole
    const capabilities = await computeUserCapabilities(userId);
    const portals = capabilities
      ? [...new Set([...capabilities.portals, "artist", "geo-admin"])]
      : ["general", "artist", "geo-admin"];

    await db
      .update(schema.users)
      .set({
        role: userRow.previousRole,
        previousRole: null,
        portalAccess: portals.sort(),
      })
      .where(eq(schema.users.id, userId));

    console.log(
      `[CAPABILITIES] User ${userId} restored staff role: ${userRow.previousRole}`,
    );

    res.json({
      success: true,
      message: `Role restored to ${userRow.previousRole}. Welcome back to staff mode.`,
      role: userRow.previousRole,
      portals: portals.sort(),
    });
  }),
);

// ─── POST /api/user/become-contractor ────────────────────────────────────────

const becomeContractorSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  specialization: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  hourlyRate: z.string().optional(),
});

router.post(
  "/become-contractor",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.user!.userId);

    // Check if already a contractor
    const existing = await db.execute(
      sql`SELECT id FROM contractors WHERE user_id = ${userId} LIMIT 1`,
    );
    if ((existing.rows?.length ?? 0) > 0) {
      return res.status(409).json({
        success: false,
        message: "You already have a contractor profile",
      });
    }

    const parsed = becomeContractorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
    }

    const { name, specialization, phone, hourlyRate } = parsed.data;

    // Get user email
    const [userRow] = await db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    // Create contractor record
    await db.insert(schema.contractors).values({
      userId,
      name,
      email: userRow?.email || null,
      phone: phone || null,
      specialization: specialization || null,
      hourlyRate: hourlyRate || null,
    });

    // Update portal access
    const capabilities = await computeUserCapabilities(userId);
    const newPortals = capabilities
      ? [...new Set([...capabilities.portals, "contractor"])]
      : ["general", "contractor"];

    await db
      .update(schema.users)
      .set({ portalAccess: newPortals.sort() })
      .where(eq(schema.users.id, userId));

    console.log(`[CAPABILITIES] User ${userId} became a contractor (${name})`);

    res.json({
      success: true,
      message:
        "Contractor profile created! You now have access to the Contractor Portal.",
      portals: newPortals.sort(),
    });
  }),
);

// ─── POST /api/user/upgrade-subscription ─────────────────────────────────────

const upgradeSchema = z.object({
  tier: z.enum(["essential", "verified", "max", "enterprise"]),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
});

router.post(
  "/upgrade-subscription",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.user!.userId);
    const parsed = upgradeSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.errors[0].message,
      });
    }

    const { tier, billingCycle } = parsed.data;

    // Check user's current tier
    const [user] = await db
      .select({
        subscriptionTier: schema.users.subscriptionTier,
        stripeCustomerId: schema.users.stripeCustomerId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Return info for the frontend to initiate Stripe checkout
    // The actual payment processing happens via the existing
    // POST /api/v1/payments/create-checkout endpoint
    res.json({
      success: true,
      message: "Redirect to checkout",
      currentTier: user.subscriptionTier || "free",
      targetTier: tier,
      billingCycle,
      checkoutEndpoint: "/api/v1/payments/create-checkout",
      stripeCustomerExists: !!user.stripeCustomerId,
    });
  }),
);

export default router;
