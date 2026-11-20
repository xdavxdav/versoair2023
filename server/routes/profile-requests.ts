import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { pool } from "../db";
import { optionalAuth, requireAuth, requireOwner } from "../middleware/auth";
import { ensureProfileRequestsSchema } from "../services/profile-requests-schema";
import {
  fetchProfileSnapshot,
  type ProfileSnapshot,
} from "../services/profile-link-fetcher";
import { generateArtistCode } from "../utils/artist-code";
import { parseProfileLink } from "@shared/profile-link";

const router = Router();

const RATE_WINDOW_MS = 10 * 60 * 1000;
const PREVIEW_MAX_PER_IP = 20;
const SUBMIT_MAX_PER_IP = 8;
const previewBuckets = new Map<string, number[]>();
const submitBuckets = new Map<string, number[]>();

function checkBucket(
  buckets: Map<string, number[]>,
  key: string,
  max: number,
): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

const previewBodySchema = z.object({
  url: z.string().trim().min(1).max(1000),
});

const submitBodySchema = z.object({
  url: z.string().trim().min(1).max(1000),
  requesterEmail: z.string().trim().email().max(255).optional(),
  displayName: z.string().trim().max(160).optional(),
  note: z.string().trim().max(1000).optional(),
});

const reviewRejectSchema = z.object({
  reviewNote: z.string().trim().min(3).max(2000),
});

const reviewApproveSchema = z.object({
  reviewNote: z.string().trim().max(2000).optional(),
  displayNameOverride: z.string().trim().max(160).optional(),
});

function parsePositiveId(raw: string): number | null {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function mapGenreList(snapshot: ProfileSnapshot): string[] {
  const genres = new Set<string>();
  for (const t of snapshot.tracks) {
    if (t.genre) genres.add(t.genre);
    if (genres.size >= 3) break;
  }
  return Array.from(genres);
}

/** POST /api/profile-requests/preview — parse & fetch public metadata preview */
router.post(
  "/preview",
  optionalAuth,
  async (req: Request, res: Response) => {
    const ip = req.ip || "unknown";
    if (!checkBucket(previewBuckets, ip, PREVIEW_MAX_PER_IP)) {
      return res
        .status(429)
        .json({ error: "Trop de prévisualisations, patientez un instant." });
    }
    const parsedBody = previewBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res
        .status(400)
        .json({ error: parsedBody.error.errors[0]?.message || "URL invalide" });
    }
    const parsedLink = parseProfileLink(parsedBody.data.url);
    if (!parsedLink.ok) {
      return res.status(400).json({ error: parsedLink.error });
    }
    const snapshot = await fetchProfileSnapshot(parsedLink.normalizedUrl);
    return res.json({
      parsed: parsedLink,
      snapshot,
    });
  },
);

/** POST /api/profile-requests — submit a pending staff-approved account request */
router.post("/", optionalAuth, async (req: Request, res: Response) => {
  const ip = req.ip || "unknown";
  if (!checkBucket(submitBuckets, ip, SUBMIT_MAX_PER_IP)) {
    return res
      .status(429)
      .json({ error: "Trop de demandes envoyées, réessayez plus tard." });
  }

  const parsedBody = submitBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      error: parsedBody.error.errors[0]?.message || "Données invalides",
    });
  }

  const parsedLink = parseProfileLink(parsedBody.data.url);
  if (!parsedLink.ok) {
    return res.status(400).json({ error: parsedLink.error });
  }

  const requesterUserId = req.user?.id ? Number(req.user.id) : null;
  const requesterEmail = (
    parsedBody.data.requesterEmail ||
    req.user?.email ||
    ""
  )
    .trim()
    .toLowerCase();
  if (!requesterEmail) {
    return res.status(400).json({
      error: "Une adresse e-mail de contact est requise pour la demande.",
    });
  }

  const snapshot = (await fetchProfileSnapshot(parsedLink.normalizedUrl)) ?? {
    provider: parsedLink.provider,
    normalizedUrl: parsedLink.normalizedUrl,
    sourceTier: "link_only" as const,
    externalId: null,
    displayName: parsedLink.handle,
    username: parsedLink.handle,
    bio: null,
    city: null,
    countryCode: null,
    avatarUrl: null,
    bannerUrl: null,
    externalStats: {},
    tracks: [],
  };

  const resolvedDisplayName =
    parsedBody.data.displayName?.trim() ||
    snapshot.displayName ||
    snapshot.username ||
    parsedLink.handle ||
    parsedLink.host;

  try {
    await ensureProfileRequestsSchema(pool);

    const inserted = await pool.query(
      `INSERT INTO profile_link_requests
         (requester_user_id, requester_email, display_name, provider, normalized_url, external_id, status, note, snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8::jsonb)
       RETURNING id, requester_email, display_name, provider, normalized_url, status, created_at`,
      [
        requesterUserId,
        requesterEmail,
        resolvedDisplayName,
        parsedLink.provider,
        parsedLink.normalizedUrl,
        snapshot.externalId,
        parsedBody.data.note || null,
        JSON.stringify(snapshot),
      ],
    );

    const reqRow = inserted.rows[0];
    for (const track of snapshot.tracks) {
      await pool.query(
        `INSERT INTO profile_import_tracks
           (request_id, artist_user_id, external_track_id, title, description, genre, duration_sec, artwork_url, external_url, license, external_created_at, status)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'awaiting_audio')`,
        [
          reqRow.id,
          track.externalTrackId,
          track.title,
          track.description,
          track.genre,
          track.durationSec,
          track.artworkUrl,
          track.externalUrl,
          track.license,
          track.externalCreatedAt ? new Date(track.externalCreatedAt) : null,
        ],
      );
    }

    return res.status(201).json({
      request: reqRow,
      stagedTracksCount: snapshot.tracks.length,
      snapshot,
    });
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({
        error: "Une demande est déjà en attente de validation pour ce profil.",
      });
    }
    console.error("[ProfileRequests] submit failed:", error);
    return res
      .status(500)
      .json({ error: "Impossible d'enregistrer la demande." });
  }
});

/** GET /api/profile-requests/mine — signed-in requester's requests and awaiting-audio drafts */
router.get("/mine", requireAuth(), async (req: Request, res: Response) => {
  const userId = Number(req.user?.id);
  const email = (req.user?.email || "").trim().toLowerCase();
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  try {
    await ensureProfileRequestsSchema(pool);
    const [requestsRes, draftsRes] = await Promise.all([
      pool.query(
        `SELECT id, requester_email, display_name, provider, normalized_url, status, note,
                review_note, reviewed_at, resulting_user_id, resulting_artist_profile_id, created_at
         FROM profile_link_requests
         WHERE requester_user_id = $1 OR ($2 <> '' AND LOWER(requester_email) = $2)
         ORDER BY created_at DESC`,
        [userId, email],
      ),
      pool.query(
        `SELECT id, request_id, external_track_id, title, description, genre, duration_sec,
                artwork_url, external_url, license, external_created_at, status, attached_track_id
         FROM profile_import_tracks
         WHERE artist_user_id = $1
         ORDER BY created_at ASC`,
        [userId],
      ),
    ]);

    return res.json({
      requests: requestsRes.rows,
      importTracks: draftsRes.rows,
    });
  } catch (error) {
    console.error("[ProfileRequests] GET /mine failed:", error);
    return res
      .status(500)
      .json({ error: "Impossible de charger vos demandes." });
  }
});

/** POST /api/profile-requests/:id/withdraw — withdraw own pending request */
router.post(
  "/:id/withdraw",
  requireAuth(),
  async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: "Identifiant invalide" });

    const userId = Number(req.user?.id);
    const email = (req.user?.email || "").trim().toLowerCase();

    try {
      await ensureProfileRequestsSchema(pool);
      const updated = await pool.query(
        `UPDATE profile_link_requests
         SET status = 'withdrawn', updated_at = NOW()
         WHERE id = $1
           AND status = 'pending'
           AND (requester_user_id = $2 OR ($3 <> '' AND LOWER(requester_email) = $3))
         RETURNING id, status`,
        [id, userId, email],
      );
      if (updated.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Demande en attente introuvable" });
      }
      return res.json({ request: updated.rows[0] });
    } catch (error) {
      console.error("[ProfileRequests] withdraw failed:", error);
      return res.status(500).json({ error: "Erreur lors du retrait" });
    }
  },
);

/** GET /api/profile-requests/admin/list — owner-only review queue */
router.get(
  "/admin/list",
  requireOwner,
  async (req: Request, res: Response) => {
    const status = String(req.query.status || "pending");
    if (
      !["pending", "approved", "rejected", "withdrawn", "all"].includes(status)
    ) {
      return res.status(400).json({ error: "Statut invalide" });
    }
    try {
      await ensureProfileRequestsSchema(pool);
      const where = status === "all" ? "" : "WHERE r.status = $1";
      const params = status === "all" ? [] : [status];
      const rows = await pool.query(
        `SELECT r.*,
                COALESCE(
                  (SELECT json_agg(t ORDER BY t.id ASC)
                   FROM profile_import_tracks t
                   WHERE t.request_id = r.id),
                  '[]'::json
                ) AS staged_tracks
         FROM profile_link_requests r
         ${where}
         ORDER BY r.created_at ASC`,
        params,
      );
      return res.json({ requests: rows.rows });
    } catch (error) {
      console.error("[ProfileRequests] admin/list failed:", error);
      return res
        .status(500)
        .json({ error: "Impossible de charger la file de modération." });
    }
  },
);

/**
 * POST /api/profile-requests/admin/:id/approve — owner-only approval.
 * Creates/links user (unusable password + verification token if new) and artist_profiles
 * with evaluation_status='pending', contract_access='none'. Never bypasses the upload gate.
 */
router.post(
  "/admin/:id/approve",
  requireOwner,
  async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: "Identifiant invalide" });

    const parsedBody = reviewApproveSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      return res.status(400).json({ error: "Paramètres invalides" });
    }

    const reviewerId = Number(req.user?.id) || null;

    await ensureProfileRequestsSchema(pool);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const lockRes = await client.query(
        `SELECT * FROM profile_link_requests WHERE id = $1 FOR UPDATE`,
        [id],
      );
      if (lockRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Demande introuvable" });
      }
      const requestRow = lockRes.rows[0];
      if (requestRow.status !== "pending") {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ error: "Cette demande a déjà été traitée." });
      }

      const snapshot: ProfileSnapshot = requestRow.snapshot || {};
      const stageName =
        parsedBody.data.displayNameOverride?.trim() ||
        requestRow.display_name ||
        snapshot.displayName ||
        snapshot.username ||
        "Artiste";

      // 1) Resolve or create user account (unusable password if new)
      let userId: number | null = requestRow.requester_user_id
        ? Number(requestRow.requester_user_id)
        : null;
      if (!userId) {
        const existingUser = await client.query(
          `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
          [String(requestRow.requester_email).toLowerCase()],
        );
        if (existingUser.rows.length > 0) {
          userId = Number(existingUser.rows[0].id);
        }
      }

      let createdNewUser = false;
      if (!userId) {
        const baseHandle = (snapshot.username || stageName)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 20) || "artist";
        const suffix = crypto.randomBytes(3).toString("hex");
        const username = `${baseHandle}_${suffix}`;
        const lockedPassword = `!locked_${crypto.randomBytes(32).toString("hex")}`;
        const createdUser = await client.query(
          `INSERT INTO users (email, username, password, display_name, role, portal_access, is_verified)
           VALUES ($1, $2, $3, $4, 'artist', '["artist","general"]'::jsonb, false)
           RETURNING id`,
          [
            String(requestRow.requester_email).toLowerCase(),
            username,
            lockedPassword,
            stageName,
          ],
        );
        userId = Number(createdUser.rows[0].id);
        createdNewUser = true;
      } else {
        await client.query(
          `UPDATE users
           SET role = CASE WHEN role = 'user' OR role IS NULL THEN 'artist' ELSE role END,
               portal_access = CASE
                 WHEN portal_access IS NULL THEN '["artist","general"]'::jsonb
                 WHEN NOT (portal_access @> '["artist"]'::jsonb) THEN portal_access || '["artist"]'::jsonb
                 ELSE portal_access
               END
           WHERE id = $1`,
          [userId],
        );
      }

      // 2) Ensure artist_profiles row with evaluation_status='pending', contract_access='none'
      const existingProfile = await client.query(
        `SELECT id FROM artist_profiles WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      let artistProfileId: number;
      if (existingProfile.rows.length > 0) {
        artistProfileId = Number(existingProfile.rows[0].id);
      } else {
        const artistCode = generateArtistCode(
          stageName,
          "discovery",
          new Date(),
          undefined,
          undefined,
          snapshot.countryCode || 0,
          "MOD",
          "x",
        );
        const genres = mapGenreList(snapshot);
        const createdProfile = await client.query(
          `INSERT INTO artist_profiles
             (user_id, stage_name, genre, country, country_code, bio, profile_image_url,
              artist_code, division, evaluation_status, contract_access)
           VALUES ($1, $2, $3::jsonb, NULL, $4, $5, $6, $7, 'discovery', 'pending', 'none')
           RETURNING id`,
          [
            userId,
            stageName,
            JSON.stringify(genres),
            snapshot.countryCode || null,
            snapshot.bio || null,
            snapshot.avatarUrl || null,
            artistCode,
          ],
        );
        artistProfileId = Number(createdProfile.rows[0].id);
      }

      // 3) Ensure artists row exists (never copying external follower/play counts)
      const existingArtist = await client.query(
        `SELECT id FROM artists WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      let artistId: number;
      if (existingArtist.rows.length > 0) {
        artistId = Number(existingArtist.rows[0].id);
      } else {
        const genres = mapGenreList(snapshot);
        const createdArtist = await client.query(
          `INSERT INTO artists (user_id, stage_name, genre, label_status, country_code)
           VALUES ($1, $2, $3, 'unsigned', $4)
           RETURNING id`,
          [userId, stageName, genres[0] || null, snapshot.countryCode || null],
        );
        artistId = Number(createdArtist.rows[0].id);
      }

      // 4) Assign artist_user_id on staged tracks (remain awaiting_audio)
      await client.query(
        `UPDATE profile_import_tracks
         SET artist_user_id = $1, updated_at = NOW()
         WHERE request_id = $2`,
        [userId, id],
      );

      // 5) Mark request approved
      const updatedReq = await client.query(
        `UPDATE profile_link_requests
         SET status = 'approved',
             reviewed_by = $1,
             reviewed_at = NOW(),
             review_note = $2,
             resulting_user_id = $3,
             resulting_artist_profile_id = $4,
             resulting_artist_id = $5,
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [
          reviewerId,
          parsedBody.data.reviewNote || null,
          userId,
          artistProfileId,
          artistId,
          id,
        ],
      );

      await client.query("COMMIT");

      return res.json({
        request: updatedReq.rows[0],
        createdNewUser,
        resultingUserId: userId,
        resultingArtistProfileId: artistProfileId,
        resultingArtistId: artistId,
      });
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Ignore rollback failure
      }
      console.error("[ProfileRequests] approve failed:", error);
      return res.status(500).json({ error: "Impossible d'approuver la demande." });
    } finally {
      client.release();
    }
  },
);

/** POST /api/profile-requests/admin/:id/reject — owner-only rejection */
router.post(
  "/admin/:id/reject",
  requireOwner,
  async (req: Request, res: Response) => {
    const id = parsePositiveId(req.params.id);
    if (!id) return res.status(400).json({ error: "Identifiant invalide" });

    const parsed = reviewRejectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Un motif de refus est requis (min. 3 caractères).",
      });
    }

    const reviewerId = Number(req.user?.id) || null;
    try {
      await ensureProfileRequestsSchema(pool);
      const updated = await pool.query(
        `UPDATE profile_link_requests
         SET status = 'rejected',
             reviewed_by = $1,
             reviewed_at = NOW(),
             review_note = $2,
             updated_at = NOW()
         WHERE id = $3 AND status = 'pending'
         RETURNING *`,
        [reviewerId, parsed.data.reviewNote, id],
      );
      if (updated.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Demande en attente introuvable." });
      }
      return res.json({ request: updated.rows[0] });
    } catch (error) {
      console.error("[ProfileRequests] reject failed:", error);
      return res.status(500).json({ error: "Impossible de refuser la demande." });
    }
  },
);

export default router;
