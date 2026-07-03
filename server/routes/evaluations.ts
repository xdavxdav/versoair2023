/**
 * A&R Evaluation Routes
 *
 * Handles demo submissions, AI pre-scoring, and human reviewer override.
 *
 * POST /api/artist/submit-demo       — Artist submits a demo project for evaluation
 * GET  /api/admin/evaluations         — List all pending evaluations (admin/moderator)
 * GET  /api/admin/evaluations/:id     — Get single evaluation details
 * PUT  /api/admin/evaluations/:id/score — Score/approve/reject a submission (admin/moderator)
 * GET  /api/artist/my-evaluation      — Artist checks their own evaluation status
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  generateArtistCode,
  scoreToRank,
  streamsToGrade,
  isoToPhoneCode,
  type ArtistCodeInput,
} from "../utils/artist-code-generator";

const router = Router();

// ─── POST /api/artist/submit-demo ────────────────────────────────────────────

const submitDemoSchema = z.object({
  projectTitle: z.string().min(1, "Project title is required").max(200),
  projectNotes: z.string().max(2000).optional(),
  tracks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        url: z.string().url("Track URL must be a valid URL"),
        durationSec: z.number().optional(),
      }),
    )
    .min(3, "Minimum 3 tracks required for evaluation")
    .max(12, "Maximum 12 tracks per submission"),
  coverArtUrl: z.string().url().optional(),
});

router.post(
  "/artist/submit-demo",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.user!.userId);

    // Get artist profile
    const [artist] = await db
      .select({
        id: schema.artistProfiles.id,
        evaluationStatus: schema.artistProfiles.evaluationStatus,
        stageName: schema.artistProfiles.stageName,
      })
      .from(schema.artistProfiles)
      .where(eq(schema.artistProfiles.userId, userId))
      .limit(1);

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "No artist profile found. Create one first.",
      });
    }

    // Check if already approved
    if (artist.evaluationStatus === "approved") {
      return res.status(400).json({
        success: false,
        message: "You are already approved. No need to resubmit.",
      });
    }

    // Check for existing pending/under_review submission
    const existingSubmission = await db
      .select({ id: schema.evaluationSubmissions.id })
      .from(schema.evaluationSubmissions)
      .where(eq(schema.evaluationSubmissions.artistId, artist.id))
      .limit(1);

    // Count previous submissions for submission number
    const submissionCount = existingSubmission.length;

    // Check resubmit cooldown (30 days after rejection)
    if (artist.evaluationStatus === "resubmit") {
      const lastRejection = await db
        .select({ resubmitAfter: schema.evaluationSubmissions.resubmitAfter })
        .from(schema.evaluationSubmissions)
        .where(eq(schema.evaluationSubmissions.artistId, artist.id))
        .orderBy(desc(schema.evaluationSubmissions.createdAt))
        .limit(1);

      if (
        lastRejection.length > 0 &&
        lastRejection[0].resubmitAfter &&
        new Date() < new Date(lastRejection[0].resubmitAfter)
      ) {
        return res.status(400).json({
          success: false,
          message: `Resubmission not yet available. Try after ${lastRejection[0].resubmitAfter.toISOString().split("T")[0]}`,
        });
      }
    }

    const parsed = submitDemoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
    }

    const { projectTitle, projectNotes, tracks, coverArtUrl } = parsed.data;

    // AI pre-scoring — simple heuristic for now, Python ML replaces later
    const aiScore = computeAIPreScore(tracks);

    // Create submission
    await db.insert(schema.evaluationSubmissions).values({
      artistId: artist.id,
      projectTitle,
      projectNotes: projectNotes || null,
      tracks,
      coverArtUrl: coverArtUrl || null,
      status: "pending",
      aiScore: aiScore.toFixed(1),
      submissionNumber: submissionCount + 1,
    });

    // Update artist evaluation status
    await db
      .update(schema.artistProfiles)
      .set({ evaluationStatus: "pending" })
      .where(eq(schema.artistProfiles.id, artist.id));

    console.log(
      `[A&R] Demo submitted by ${artist.stageName} (artistId=${artist.id}), AI pre-score: ${aiScore.toFixed(1)}`,
    );

    res.status(201).json({
      success: true,
      message:
        "Demo submitted for evaluation. You'll be notified when reviewed.",
      aiPreScore: parseFloat(aiScore.toFixed(1)),
      submissionNumber: submissionCount + 1,
    });
  }),
);

// ─── GET /api/admin/evaluations ──────────────────────────────────────────────

router.get(
  "/admin/evaluations",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req.user!.role || "").toLowerCase();
    if (!["superuser", "admin", "moderator"].includes(userRole)) {
      return res.status(403).json({ success: false, message: "Staff only" });
    }

    const status = (req.query.status as string) || "pending";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const offset = (page - 1) * limit;

    const submissions = await db.execute(sql`
      SELECT
        es.id, es.project_title, es.status, es.tracks, es.cover_art_url,
        es.ai_score, es.final_score, es.reviewer_notes, es.submission_number,
        es.created_at, es.reviewed_at,
        ap.stage_name, ap.genre, ap.country, ap.artist_code, ap.division,
        ap.lifetime_streams
      FROM evaluation_submissions es
      JOIN artist_profiles ap ON es.artist_id = ap.id
      WHERE es.status = ${status}
      ORDER BY es.created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM evaluation_submissions WHERE status = ${status}
    `);

    res.json({
      success: true,
      submissions: submissions.rows,
      total: parseInt((countResult.rows[0] as any)?.total || "0"),
      page,
      limit,
    });
  }),
);

// ─── GET /api/admin/evaluations/:id ──────────────────────────────────────────

router.get(
  "/admin/evaluations/:id",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req.user!.role || "").toLowerCase();
    if (!["superuser", "admin", "moderator"].includes(userRole)) {
      return res.status(403).json({ success: false, message: "Staff only" });
    }

    const id = parseInt(req.params.id);
    const result = await db.execute(sql`
      SELECT
        es.*,
        ap.stage_name, ap.genre, ap.country, ap.country_code,
        ap.artist_code, ap.division, ap.lifetime_streams, ap.bio,
        ap.spotify_url, ap.instagram_handle, ap.profile_image_url,
        u.email, u.username
      FROM evaluation_submissions es
      JOIN artist_profiles ap ON es.artist_id = ap.id
      JOIN users u ON ap.user_id = u.id
      WHERE es.id = ${id}
    `);

    if (!result.rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });
    }

    res.json({ success: true, submission: result.rows[0] });
  }),
);

// ─── PUT /api/admin/evaluations/:id/score ────────────────────────────────────

const scoreSchema = z.object({
  scores: z.object({
    production: z.number().min(1).max(10),
    originality: z.number().min(1).max(10),
    craft: z.number().min(1).max(10),
    marketReadiness: z.number().min(1).max(10),
  }),
  decision: z.enum(["approved", "rejected", "resubmit"]),
  reviewerNotes: z.string().max(2000).optional(),
});

router.put(
  "/admin/evaluations/:id/score",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userRole = (req.user!.role || "").toLowerCase();
    if (!["superuser", "admin", "moderator"].includes(userRole)) {
      return res.status(403).json({ success: false, message: "Staff only" });
    }

    const submissionId = parseInt(req.params.id);
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: parsed.error.errors[0].message });
    }

    const { scores, decision, reviewerNotes } = parsed.data;

    // Compute final score (average of 4 axes)
    const finalScore =
      (scores.production +
        scores.originality +
        scores.craft +
        scores.marketReadiness) /
      4;

    // Get the submission to find artist
    const [submission] = await db
      .select({ artistId: schema.evaluationSubmissions.artistId })
      .from(schema.evaluationSubmissions)
      .where(eq(schema.evaluationSubmissions.id, submissionId))
      .limit(1);

    if (!submission) {
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });
    }

    const reviewerId = Number(req.user!.userId);

    // Update submission
    await db
      .update(schema.evaluationSubmissions)
      .set({
        scores,
        finalScore: finalScore.toFixed(1),
        status: decision,
        reviewerId,
        reviewerNotes: reviewerNotes || null,
        reviewedAt: new Date(),
        // If rejected, set 30-day resubmit cooldown
        resubmitAfter:
          decision === "rejected" || decision === "resubmit"
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : null,
      })
      .where(eq(schema.evaluationSubmissions.id, submissionId));

    // Update artist profile evaluation status + score
    const artistUpdates: Record<string, any> = {
      evaluationStatus: decision,
      evaluationScore: finalScore.toFixed(1),
    };

    // If approved and score >= 6.0, grant Discovery streaming access
    if (decision === "approved" && finalScore >= 6.0) {
      artistUpdates.contractAccess = "view"; // Discovery gets view-only contract access
      // Set first promotion review in 90 days
      artistUpdates.promotionEligibleAt = new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000,
      );

      // ── Auto-generate Artist Code on approval ──
      try {
        const [profile] = await db
          .select({
            stageName: schema.artistProfiles.stageName,
            legalName: schema.artistProfiles.legalName,
            countryCode: schema.artistProfiles.countryCode,
            lifetimeStreams: schema.artistProfiles.lifetimeStreams,
            division: schema.artistProfiles.division,
            artistCode: schema.artistProfiles.artistCode,
          })
          .from(schema.artistProfiles)
          .where(eq(schema.artistProfiles.id, submission.artistId))
          .limit(1);

        if (profile && !profile.artistCode) {
          const codeInput: ArtistCodeInput = {
            stageName: profile.stageName || "XX",
            lastName: profile.legalName || profile.stageName || "x",
            countryCode: isoToPhoneCode(profile.countryCode || ""),
            rank: scoreToRank(finalScore),
            accountType: "solo",
            verification: "verified",
            rights: finalScore >= 8 ? "full" : "emerging",
            genreClass: "indie",
            engagement: "active",
            monetization: finalScore >= 7 ? "paid" : "royalty_free",
            entityType: "artist",
            authority: "independent",
            grade: streamsToGrade(profile.lifetimeStreams || 0),
          };

          const code = generateArtistCode(codeInput);
          artistUpdates.artistCode = code;
          console.log(
            `[A&R] Generated artist code for profile ${submission.artistId}: ${code}`,
          );
        }
      } catch (codeErr) {
        console.error("[A&R] Failed to generate artist code:", codeErr);
        // Non-blocking — code generation failure should not block approval
      }
    }

    await db
      .update(schema.artistProfiles)
      .set(artistUpdates)
      .where(eq(schema.artistProfiles.id, submission.artistId));

    console.log(
      `[A&R] Evaluation ${submissionId} scored: ${finalScore.toFixed(1)}/10 → ${decision} (by reviewer ${reviewerId})`,
    );

    res.json({
      success: true,
      message: `Submission ${decision}. Final score: ${finalScore.toFixed(1)}/10`,
      finalScore: parseFloat(finalScore.toFixed(1)),
      decision,
    });
  }),
);

// ─── GET /api/artist/my-evaluation ───────────────────────────────────────────

router.get(
  "/artist/my-evaluation",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.user!.userId);

    const result = await db.execute(sql`
      SELECT
        es.id, es.project_title, es.status, es.ai_score, es.final_score,
        es.scores, es.reviewer_notes, es.submission_number,
        es.resubmit_after, es.created_at, es.reviewed_at,
        ap.artist_code, ap.division, ap.evaluation_status, ap.evaluation_score,
        ap.contract_access, ap.promotion_eligible_at
      FROM artist_profiles ap
      LEFT JOIN evaluation_submissions es ON es.artist_id = ap.id
      WHERE ap.user_id = ${userId}
      ORDER BY es.created_at DESC
      LIMIT 5
    `);

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "No artist profile found.",
      });
    }

    res.json({
      success: true,
      evaluations: result.rows,
    });
  }),
);

// ─── GET /api/artist/division-status ──────────────────────────────────────────

/**
 * Returns the artist's full division progress for the frontend UI.
 * Includes: current division, metrics, thresholds for next tier, contract access.
 */
router.get(
  "/artist/division-status",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.user!.userId);

    // Get artist profile with division data
    const profileResult = await db.execute(sql`
      SELECT
        ap.id, ap.stage_name, ap.artist_code, ap.division, ap.evaluation_status,
        ap.evaluation_score, ap.contract_access, ap.promotion_eligible_at,
        ap.lifetime_streams, ap.monthly_listeners, ap.weekly_streams,
        ap.total_releases, ap.created_at,
        EXTRACT(DAY FROM NOW() - ap.created_at) AS active_days
      FROM artist_profiles ap
      WHERE ap.user_id = ${userId}
      LIMIT 1
    `);

    if (!profileResult.rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "No artist profile found." });
    }

    const profile: any = profileResult.rows[0];
    const division = profile.division || "discovery";

    // Division hierarchy + display info
    const DIVISIONS = [
      {
        key: "discovery",
        label: "Discovery",
        color: "#6b7280",
        icon: "🔍",
        contractAccess: "none",
      },
      {
        key: "indie",
        label: "Indie",
        color: "#3b82f6",
        icon: "🎸",
        contractAccess: "view",
      },
      {
        key: "pro",
        label: "Pro",
        color: "#8b5cf6",
        icon: "🎤",
        contractAccess: "standard",
      },
      {
        key: "elite",
        label: "Elite",
        color: "#f59e0b",
        icon: "⭐",
        contractAccess: "priority",
      },
      {
        key: "signed",
        label: "Signed",
        color: "#ef4444",
        icon: "🏆",
        contractAccess: "full",
      },
    ];

    const currentIdx = DIVISIONS.findIndex((d) => d.key === division);
    const currentDiv = DIVISIONS[currentIdx] || DIVISIONS[0];
    const nextDiv =
      currentIdx < DIVISIONS.length - 1 ? DIVISIONS[currentIdx + 1] : null;

    // Get promotion thresholds for next tier (if applicable)
    let thresholds: any = null;
    let progress = 100; // maxed out if signed

    if (nextDiv) {
      const threshResult = await db.execute(sql`
        SELECT min_streams, min_releases, min_active_days, min_engagement_rate
        FROM promotion_thresholds
        WHERE from_division = ${division}
          AND to_division = ${nextDiv.key}
          AND league_id IS NULL
        LIMIT 1
      `);

      if (threshResult.rows.length) {
        thresholds = threshResult.rows[0];

        // Calculate progress as percentage toward next threshold
        const streams = Number(profile.lifetime_streams) || 0;
        const minStreams = Number(thresholds.min_streams) || 1;
        progress = Math.min(100, Math.round((streams / minStreams) * 100));
      } else {
        // Seed defaults when no thresholds exist yet
        const seedStreams: Record<string, number> = {
          discovery: 10000,
          indie: 100000,
          pro: 500000,
          elite: 1000000,
        };
        const minStreams = seedStreams[division] || 10000;
        const streams = Number(profile.lifetime_streams) || 0;
        progress = Math.min(100, Math.round((streams / minStreams) * 100));
        thresholds = {
          min_streams: minStreams,
          min_releases:
            division === "discovery" ? 3 : division === "indie" ? 8 : 15,
          min_active_days: 90,
          min_engagement_rate: 0.02,
        };
      }
    }

    // Latest evaluation submission
    const evalResult = await db.execute(sql`
      SELECT status, final_score, reviewed_at, resubmit_after
      FROM evaluation_submissions
      WHERE artist_id = ${profile.id}
      ORDER BY created_at DESC
      LIMIT 1
    `);

    res.json({
      success: true,
      division: {
        current: currentDiv,
        currentIndex: currentIdx,
        total: DIVISIONS.length,
        all: DIVISIONS,
      },
      next: nextDiv,
      thresholds,
      progress,
      metrics: {
        lifetimeStreams: Number(profile.lifetime_streams) || 0,
        monthlyListeners: Number(profile.monthly_listeners) || 0,
        weeklyStreams: Number(profile.weekly_streams) || 0,
        totalReleases: Number(profile.total_releases) || 0,
        activeDays: Math.round(Number(profile.active_days) || 0),
      },
      profile: {
        artistCode: profile.artist_code,
        stageName: profile.stage_name,
        evaluationStatus: profile.evaluation_status,
        evaluationScore: profile.evaluation_score,
        contractAccess: profile.contract_access,
        promotionEligibleAt: profile.promotion_eligible_at,
      },
      latestEvaluation: evalResult.rows[0] || null,
    });
  }),
);

// ─── AI Pre-Scoring (heuristic — Python ML replaces later) ──────────────────

/**
 * Simple heuristic pre-score based on submission metadata.
 * Real scoring will come from Python ML service analyzing audio features.
 *
 * Factors:
 *   - Track count (3 = base, 5+ = bonus)
 *   - Tracks have duration data (metadata quality)
 *   - Track URL diversity (not all same domain = more professional)
 */
function computeAIPreScore(
  tracks: Array<{ title: string; url: string; durationSec?: number }>,
): number {
  let score = 5.0; // baseline

  // Track count bonus: 3 = 0, 5 = +0.5, 8+ = +1.0
  if (tracks.length >= 8) score += 1.0;
  else if (tracks.length >= 5) score += 0.5;

  // Duration metadata present = +0.5 (shows professional upload)
  const withDuration = tracks.filter((t) => t.durationSec && t.durationSec > 0);
  if (withDuration.length === tracks.length) score += 0.5;
  else if (withDuration.length > 0) score += 0.2;

  // Average duration sanity check (30s–600s per track is reasonable)
  if (withDuration.length > 0) {
    const avgDuration =
      withDuration.reduce((sum, t) => sum + (t.durationSec || 0), 0) /
      withDuration.length;
    if (avgDuration >= 120 && avgDuration <= 360)
      score += 0.5; // sweet spot: 2-6 min
    else if (avgDuration >= 60) score += 0.2;
  }

  // URL variety = professional distribution (not all same provider)
  const domains = new Set(
    tracks.map((t) => {
      try {
        return new URL(t.url).hostname;
      } catch {
        return "";
      }
    }),
  );
  if (domains.size >= 2) score += 0.3;

  // Title quality — unique titles (no "Track 1, Track 2" pattern)
  const uniqueTitles = new Set(tracks.map((t) => t.title.toLowerCase().trim()));
  if (uniqueTitles.size === tracks.length) score += 0.5;

  // Cap at 10
  return Math.min(10.0, Math.max(1.0, score));

  // NOTE: Python ML service will override this with audio feature analysis:
  //   - Spectral quality, dynamic range, loudness (LUFS)
  //   - Genre classification confidence
  //   - Production quality fingerprint
  //   - Vocal/instrumental separation clarity
}

export default router;
