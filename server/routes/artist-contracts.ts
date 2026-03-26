/**
 * Artist Contract Application & Grade System — API Routes
 *
 * Grade tiers:
 *   S  — Elite / Exclusive  → 85% artist, featured homepage, priority support, FLAC, unlimited downloads
 *   A  — Established        → 75% artist, featured rotation, analytics pro, 320kbps, 50 downloads/mo
 *   B  — Rising             → 65% artist, standard featuring, basic analytics, 256kbps, 20 downloads/mo
 *   C  — Entry              → 55% artist, catalog listing only, 128kbps, 5 downloads/mo
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

// Grade tier definitions — single source of truth
const GRADE_TIERS: Record<
  string,
  {
    label: string;
    labelFr: string;
    revenueShareArtist: number;
    revenueSharePlatform: number;
    maxDownloads: number;
    audioQuality: string;
    canBeFeatured: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
    color: string;
    description: string;
    descriptionFr: string;
    requirements: string[];
  }
> = {
  S: {
    label: "Elite / Exclusive",
    labelFr: "Élite / Exclusif",
    revenueShareArtist: 85,
    revenueSharePlatform: 15,
    maxDownloads: -1, // unlimited
    audioQuality: "flac",
    canBeFeatured: true,
    hasAnalytics: true,
    hasPrioritySupport: true,
    color: "#FFD700",
    description:
      "Top-tier artists with exclusive platform deals, maximum revenue share, and full promotional support",
    descriptionFr:
      "Artistes de premier plan avec contrats exclusifs, part maximale de revenus et support promotionnel complet",
    requirements: [
      "50,000+ monthly listeners",
      "Verified social media presence",
      "Exclusive content commitment",
      "Professional portfolio & discography",
      "Platform exclusivity agreement (minimum 12 months)",
    ],
  },
  A: {
    label: "Established",
    labelFr: "Établi",
    revenueShareArtist: 75,
    revenueSharePlatform: 25,
    maxDownloads: 50,
    audioQuality: "320",
    canBeFeatured: true,
    hasAnalytics: true,
    hasPrioritySupport: false,
    color: "#C0C0C0",
    description:
      "Proven artists with significant following and consistent output",
    descriptionFr:
      "Artistes confirmés avec un public significatif et une production constante",
    requirements: [
      "10,000+ monthly listeners",
      "Active social media presence",
      "Minimum 1 album or 5 singles released",
      "Consistent release schedule",
    ],
  },
  B: {
    label: "Rising",
    labelFr: "Émergent",
    revenueShareArtist: 65,
    revenueSharePlatform: 35,
    maxDownloads: 20,
    audioQuality: "256",
    canBeFeatured: true,
    hasAnalytics: true,
    hasPrioritySupport: false,
    color: "#CD7F32",
    description: "Emerging artists showing growth potential and engagement",
    descriptionFr:
      "Artistes émergents avec un potentiel de croissance et d'engagement",
    requirements: [
      "1,000+ monthly listeners or strong local following",
      "Minimum 3 released tracks",
      "Active on at least one social platform",
      "Demo track submission",
    ],
  },
  C: {
    label: "Entry",
    labelFr: "Entrée",
    revenueShareArtist: 55,
    revenueSharePlatform: 45,
    maxDownloads: 5,
    audioQuality: "128",
    canBeFeatured: false,
    hasAnalytics: false,
    hasPrioritySupport: false,
    color: "#A0A0A0",
    description:
      "New artists getting started on the platform with basic distribution",
    descriptionFr:
      "Nouveaux artistes commençant sur la plateforme avec distribution de base",
    requirements: [
      "At least 1 original track",
      "Complete artist profile",
      "Agreement to platform terms",
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// Ensure table exists
// ═══════════════════════════════════════════════════════════
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS artist_contracts (
        id SERIAL PRIMARY KEY,
        artist_id INTEGER REFERENCES music_artists(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        email TEXT NOT NULL,
        stage_name TEXT NOT NULL,
        legal_name TEXT NOT NULL,
        genre VARCHAR(100),
        country VARCHAR(100),
        country_code VARCHAR(2),
        biography TEXT,
        portfolio_url TEXT,
        spotify_url TEXT,
        instagram_url TEXT,
        website_url TEXT,
        sample_track_url TEXT,
        motivation TEXT,
        monthly_listeners INTEGER DEFAULT 0,
        years_active INTEGER DEFAULT 0,
        grade VARCHAR(10) DEFAULT 'pending',
        revenue_share_artist INTEGER DEFAULT 0,
        revenue_share_platform INTEGER DEFAULT 0,
        max_downloads_per_month INTEGER DEFAULT 0,
        audio_quality VARCHAR(10) DEFAULT '128',
        can_be_featured BOOLEAN DEFAULT false,
        has_analytics_access BOOLEAN DEFAULT false,
        has_priority_support BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'pending' NOT NULL,
        reviewed_by INTEGER REFERENCES users(id),
        review_notes TEXT,
        rejection_reason TEXT,
        agreed_to_terms BOOLEAN DEFAULT false,
        agreed_to_rev_share BOOLEAN DEFAULT false,
        applied_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        contract_start_date TIMESTAMP,
        contract_end_date TIMESTAMP,
        last_modified TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS artist_contracts_email_idx ON artist_contracts(email);
      CREATE INDEX IF NOT EXISTS artist_contracts_status_idx ON artist_contracts(status);
      CREATE INDEX IF NOT EXISTS artist_contracts_grade_idx ON artist_contracts(grade);
      CREATE INDEX IF NOT EXISTS artist_contracts_artist_idx ON artist_contracts(artist_id);
    `);
    tableReady = true;
  } catch (err) {
    console.error("artist_contracts table setup error:", err);
  }
}

// ═══════════════════════════════════════════════════════════
// PUBLIC: GET /grades — Grade tier definitions
// ═══════════════════════════════════════════════════════════
router.get("/grades", async (_req: Request, res: Response) => {
  res.json({
    grades: Object.entries(GRADE_TIERS).map(([key, tier]) => ({
      grade: key,
      ...tier,
      maxDownloads: tier.maxDownloads === -1 ? "Illimité" : tier.maxDownloads,
    })),
  });
});

// ═══════════════════════════════════════════════════════════
// PUBLIC: POST /apply — Submit artist contract application
// ═══════════════════════════════════════════════════════════
router.post("/apply", async (req: Request, res: Response) => {
  await ensureTable();
  try {
    const {
      email,
      stageName,
      legalName,
      genre,
      country,
      countryCode,
      biography,
      portfolioUrl,
      spotifyUrl,
      instagramUrl,
      websiteUrl,
      sampleTrackUrl,
      motivation,
      monthlyListeners,
      yearsActive,
      agreedToTerms,
      userId,
    } = req.body;

    if (!email || !stageName || !legalName) {
      return res
        .status(400)
        .json({ error: "Email, nom de scène et nom légal sont requis" });
    }
    if (!agreedToTerms) {
      return res
        .status(400)
        .json({ error: "Vous devez accepter les conditions" });
    }

    // Check for existing pending/approved application
    const existing = await pool.query(
      `SELECT id, status, grade FROM artist_contracts WHERE email = $1 AND status IN ('pending', 'under_review', 'approved') LIMIT 1`,
      [email],
    );
    if (existing.rows.length > 0) {
      const ex = existing.rows[0];
      if (ex.status === "approved") {
        return res.status(409).json({
          error: "Vous avez déjà un contrat actif",
          contractId: ex.id,
          grade: ex.grade,
        });
      }
      return res.status(409).json({
        error: "Vous avez déjà une candidature en cours",
        contractId: ex.id,
        status: ex.status,
      });
    }

    // Check cooldown for rejected applications (30 day wait)
    const recentRejection = await pool.query(
      `SELECT id, reviewed_at FROM artist_contracts WHERE email = $1 AND status = 'rejected' ORDER BY reviewed_at DESC LIMIT 1`,
      [email],
    );
    if (
      recentRejection.rows.length > 0 &&
      recentRejection.rows[0].reviewed_at
    ) {
      const daysSinceRejection =
        (Date.now() - new Date(recentRejection.rows[0].reviewed_at).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceRejection < 30) {
        const daysLeft = Math.ceil(30 - daysSinceRejection);
        return res.status(429).json({
          error: `Veuillez attendre ${daysLeft} jours avant de soumettre une nouvelle candidature`,
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO artist_contracts (email, stage_name, legal_name, genre, country, country_code,
        biography, portfolio_url, spotify_url, instagram_url, website_url, sample_track_url,
        motivation, monthly_listeners, years_active, agreed_to_terms, user_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending')
       RETURNING id, status, applied_at`,
      [
        email,
        stageName,
        legalName,
        genre,
        country,
        countryCode,
        biography,
        portfolioUrl,
        spotifyUrl,
        instagramUrl,
        websiteUrl,
        sampleTrackUrl,
        motivation,
        monthlyListeners || 0,
        yearsActive || 0,
        agreedToTerms,
        userId || null,
      ],
    );

    res.status(201).json({
      success: true,
      message:
        "Candidature soumise avec succès. Notre équipe l'examinera sous 5 à 7 jours ouvrables.",
      contract: result.rows[0],
    });
  } catch (err: any) {
    console.error("Contract application error:", err);
    res.status(500).json({ error: "Erreur lors de la soumission" });
  }
});

// ═══════════════════════════════════════════════════════════
// PUBLIC: GET /status/:email — Check application status
// ═══════════════════════════════════════════════════════════
router.get("/status/:email", async (req: Request, res: Response) => {
  await ensureTable();
  try {
    const result = await pool.query(
      `SELECT id, email, stage_name, grade, status, rejection_reason,
              revenue_share_artist, revenue_share_platform, audio_quality,
              max_downloads_per_month, can_be_featured, has_analytics_access,
              applied_at, reviewed_at, contract_start_date, contract_end_date
       FROM artist_contracts WHERE email = $1 ORDER BY applied_at DESC`,
      [req.params.email],
    );
    res.json({ applications: result.rows });
  } catch (err: any) {
    console.error("Status check error:", err);
    res.status(500).json({ error: "Erreur" });
  }
});

// ═══════════════════════════════════════════════════════════
// PUBLIC: GET /my-contract — Get current user's active contract
// ═══════════════════════════════════════════════════════════
router.get("/my-contract", async (req: Request, res: Response) => {
  await ensureTable();
  try {
    // Try from session/cookie user
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const result = await pool.query(
      `SELECT ac.*, ma.name as artist_name, ma.image_url as artist_image
       FROM artist_contracts ac
       LEFT JOIN music_artists ma ON ac.artist_id = ma.id
       WHERE ac.user_id = $1 AND ac.status IN ('approved', 'pending', 'under_review')
       ORDER BY ac.applied_at DESC LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.json({ contract: null });
    }

    const contract = result.rows[0];
    const gradeTier = GRADE_TIERS[contract.grade as string];
    res.json({
      contract,
      gradeTier: gradeTier || null,
    });
  } catch (err: any) {
    console.error("My contract error:", err);
    res.status(500).json({ error: "Erreur" });
  }
});

// ═══════════════════════════════════════════════════════════
// PUBLIC: GET /check-artist/:artistId — Check if an artist has an active contract & grade
// (Used by streaming routes to gate benefits)
// ═══════════════════════════════════════════════════════════
router.get("/check-artist/:artistId", async (req: Request, res: Response) => {
  await ensureTable();
  try {
    const artistId = parseInt(req.params.artistId);
    const result = await pool.query(
      `SELECT id, grade, status, revenue_share_artist, revenue_share_platform,
              can_be_featured, has_analytics_access, audio_quality, max_downloads_per_month
       FROM artist_contracts WHERE artist_id = $1 AND status = 'approved' LIMIT 1`,
      [artistId],
    );

    if (result.rows.length === 0) {
      return res.json({
        hasContract: false,
        grade: null,
        benefits: null,
      });
    }

    const contract = result.rows[0];
    res.json({
      hasContract: true,
      grade: contract.grade,
      benefits: {
        revenueShareArtist: contract.revenue_share_artist,
        revenueSharePlatform: contract.revenue_share_platform,
        canBeFeatured: contract.can_be_featured,
        hasAnalyticsAccess: contract.has_analytics_access,
        audioQuality: contract.audio_quality,
        maxDownloads: contract.max_downloads_per_month,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur" });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN: GET /admin/applications — List all applications with filters
// ═══════════════════════════════════════════════════════════
router.get("/admin/applications", async (req: Request, res: Response) => {
  await ensureTable();
  try {
    const status = (req.query.status as string) || "";
    const grade = (req.query.grade as string) || "";
    const search = (req.query.search as string) || "";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    let where = "WHERE 1=1";
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      where += ` AND ac.status = $${paramIdx++}`;
      params.push(status);
    }
    if (grade && grade !== "all") {
      where += ` AND ac.grade = $${paramIdx++}`;
      params.push(grade);
    }
    if (search) {
      where += ` AND (ac.stage_name ILIKE $${paramIdx} OR ac.legal_name ILIKE $${paramIdx} OR ac.email ILIKE $${paramIdx++})`;
      params.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM artist_contracts ac ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT ac.*, u.username as reviewer_name
       FROM artist_contracts ac
       LEFT JOIN users u ON ac.reviewed_by = u.id
       ${where}
       ORDER BY
         CASE ac.status
           WHEN 'pending' THEN 1
           WHEN 'under_review' THEN 2
           WHEN 'approved' THEN 3
           WHEN 'rejected' THEN 4
           WHEN 'suspended' THEN 5
           WHEN 'expired' THEN 6
         END,
         ac.applied_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params,
    );

    // Stats summary
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'under_review') as review_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE grade = 'S' AND status = 'approved') as grade_s,
        COUNT(*) FILTER (WHERE grade = 'A' AND status = 'approved') as grade_a,
        COUNT(*) FILTER (WHERE grade = 'B' AND status = 'approved') as grade_b,
        COUNT(*) FILTER (WHERE grade = 'C' AND status = 'approved') as grade_c
      FROM artist_contracts
    `);

    res.json({
      applications: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: statsResult.rows[0],
    });
  } catch (err: any) {
    console.error("Admin applications error:", err);
    res.status(500).json({ error: "Erreur" });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN: GET /admin/applications/:id — Single application detail
// ═══════════════════════════════════════════════════════════
router.get("/admin/applications/:id", async (req: Request, res: Response) => {
  await ensureTable();
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT ac.*, u.username as reviewer_name
       FROM artist_contracts ac
       LEFT JOIN users u ON ac.reviewed_by = u.id
       WHERE ac.id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Candidature introuvable" });
    }
    res.json({ application: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur" });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN: PUT /admin/review/:id — Review: approve/reject + assign grade
// ═══════════════════════════════════════════════════════════
router.put("/admin/review/:id", async (req: Request, res: Response) => {
  await ensureTable();
  try {
    const id = parseInt(req.params.id);
    const { action, grade, reviewNotes, rejectionReason, reviewerId } =
      req.body;

    if (
      !action ||
      !["approve", "reject", "under_review", "suspend"].includes(action)
    ) {
      return res.status(400).json({
        error:
          "Action invalide. Utilisez: approve, reject, under_review, suspend",
      });
    }

    // Fetch current application
    const current = await pool.query(
      `SELECT * FROM artist_contracts WHERE id = $1`,
      [id],
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Candidature introuvable" });
    }

    const app = current.rows[0];

    if (action === "approve") {
      if (!grade || !GRADE_TIERS[grade]) {
        return res
          .status(400)
          .json({ error: "Grade invalide. Utilisez: S, A, B, C" });
      }

      const tier = GRADE_TIERS[grade];

      // Create or link music_artists entry
      let artistId = app.artist_id;
      if (!artistId) {
        // Create a new music_artists row for this approved artist
        const artistResult = await pool.query(
          `INSERT INTO music_artists (name, genre, biography, country, country_code, label_status,
            spotify_url, instagram_url, website_url, verified, monthly_listeners, followers)
           VALUES ($1,$2,$3,$4,$5,'signed',$6,$7,$8,$9,$10,0)
           RETURNING id`,
          [
            app.stage_name,
            app.genre,
            app.biography,
            app.country,
            app.country_code,
            app.spotify_url,
            app.instagram_url,
            app.website_url,
            grade === "S" || grade === "A", // auto-verify S and A tier
            app.monthly_listeners || 0,
          ],
        );
        artistId = artistResult.rows[0].id;
      }

      // ── Unified Identity: ensure artist_profiles exists and links to music_artists ──
      let artistProfileId: number | null = null;
      const existingProfile = await pool.query(
        `SELECT id FROM artist_profiles WHERE user_id = $1`,
        [app.user_id],
      );
      if (existingProfile.rows.length > 0) {
        artistProfileId = existingProfile.rows[0].id;
        // Update the profile to link to the music_artists entry + set division from grade
        const divisionMap: Record<string, string> = {
          S: "elite",
          A: "pro",
          B: "indie",
          C: "discovery",
        };
        await pool.query(
          `UPDATE artist_profiles
           SET music_artist_id = $1, division = $2, evaluation_status = 'approved',
               contract_access = $3, updated_at = NOW()
           WHERE id = $4`,
          [
            artistId,
            divisionMap[grade] || "discovery",
            grade === "S" ? "full" : grade === "A" ? "priority" : "standard",
            artistProfileId,
          ],
        );
      } else {
        // Create a new artist_profiles row linked to both user and music_artists
        const divisionMap: Record<string, string> = {
          S: "elite",
          A: "pro",
          B: "indie",
          C: "discovery",
        };
        const profileResult = await pool.query(
          `INSERT INTO artist_profiles (user_id, stage_name, genre, country, country_code, bio,
            spotify_url, instagram_handle, profile_image_url, music_artist_id, division,
            evaluation_status, contract_access, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'approved', $12, true)
           RETURNING id`,
          [
            app.user_id,
            app.stage_name,
            JSON.stringify(app.genre ? [app.genre] : []),
            app.country,
            app.country_code,
            app.biography,
            app.spotify_url,
            app.instagram_url,
            app.profile_image_url || null,
            artistId,
            divisionMap[grade] || "discovery",
            grade === "S" ? "full" : grade === "A" ? "priority" : "standard",
          ],
        );
        artistProfileId = profileResult.rows[0].id;
      }

      await pool.query(
        `UPDATE artist_contracts SET
          status = 'approved',
          grade = $1,
          artist_id = $2,
          revenue_share_artist = $3,
          revenue_share_platform = $4,
          max_downloads_per_month = $5,
          audio_quality = $6,
          can_be_featured = $7,
          has_analytics_access = $8,
          has_priority_support = $9,
          agreed_to_rev_share = true,
          reviewed_by = $10,
          review_notes = $11,
          reviewed_at = NOW(),
          contract_start_date = NOW(),
          last_modified = NOW()
         WHERE id = $12`,
        [
          grade,
          artistId,
          tier.revenueShareArtist,
          tier.revenueSharePlatform,
          tier.maxDownloads,
          tier.audioQuality,
          tier.canBeFeatured,
          tier.hasAnalytics,
          tier.hasPrioritySupport,
          reviewerId || null,
          reviewNotes || null,
          id,
        ],
      );

      // Update the music_artists label_status
      await pool.query(
        `UPDATE music_artists SET label_status = 'signed' WHERE id = $1`,
        [artistId],
      );

      return res.json({
        success: true,
        message: `Artiste approuvé au grade ${grade} (${tier.label})`,
        grade,
        tier,
        artistId,
        artistProfileId,
      });
    }

    if (action === "reject") {
      await pool.query(
        `UPDATE artist_contracts SET
          status = 'rejected',
          rejection_reason = $1,
          review_notes = $2,
          reviewed_by = $3,
          reviewed_at = NOW(),
          last_modified = NOW()
         WHERE id = $4`,
        [
          rejectionReason || "Candidature non retenue",
          reviewNotes || null,
          reviewerId || null,
          id,
        ],
      );

      return res.json({
        success: true,
        message: "Candidature refusée",
      });
    }

    if (action === "under_review") {
      await pool.query(
        `UPDATE artist_contracts SET status = 'under_review', reviewed_by = $1, review_notes = $2, last_modified = NOW() WHERE id = $3`,
        [reviewerId || null, reviewNotes || null, id],
      );
      return res.json({
        success: true,
        message: "Candidature en cours d'examen",
      });
    }

    if (action === "suspend") {
      await pool.query(
        `UPDATE artist_contracts SET status = 'suspended', review_notes = $1, reviewed_by = $2, last_modified = NOW() WHERE id = $3`,
        [reviewNotes || "Contrat suspendu", reviewerId || null, id],
      );
      // Also mark the artist as unsigned
      if (app.artist_id) {
        await pool.query(
          `UPDATE music_artists SET label_status = 'suspended' WHERE id = $1`,
          [app.artist_id],
        );
      }
      return res.json({ success: true, message: "Contrat suspendu" });
    }
  } catch (err: any) {
    console.error("Review error:", err);
    res.status(500).json({ error: "Erreur lors de l'examen" });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN: PUT /admin/upgrade/:id — Change grade for existing contract
// ═══════════════════════════════════════════════════════════
router.put("/admin/upgrade/:id", async (req: Request, res: Response) => {
  await ensureTable();
  try {
    const id = parseInt(req.params.id);
    const { grade, reviewerId, reviewNotes } = req.body;

    if (!grade || !GRADE_TIERS[grade]) {
      return res.status(400).json({ error: "Grade invalide" });
    }

    const tier = GRADE_TIERS[grade];

    await pool.query(
      `UPDATE artist_contracts SET
        grade = $1,
        revenue_share_artist = $2,
        revenue_share_platform = $3,
        max_downloads_per_month = $4,
        audio_quality = $5,
        can_be_featured = $6,
        has_analytics_access = $7,
        has_priority_support = $8,
        reviewed_by = $9,
        review_notes = COALESCE(review_notes || E'\n', '') || $10,
        last_modified = NOW()
       WHERE id = $11 AND status = 'approved'`,
      [
        grade,
        tier.revenueShareArtist,
        tier.revenueSharePlatform,
        tier.maxDownloads,
        tier.audioQuality,
        tier.canBeFeatured,
        tier.hasAnalytics,
        tier.hasPrioritySupport,
        reviewerId || null,
        `[${new Date().toISOString()}] Grade changed to ${grade}: ${reviewNotes || "No notes"}`,
        id,
      ],
    );

    res.json({
      success: true,
      message: `Grade mis à jour: ${grade} (${tier.label})`,
      tier,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur" });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN: GET /admin/stats — Overview statistics
// ═══════════════════════════════════════════════════════════
router.get("/admin/stats", async (_req: Request, res: Response) => {
  await ensureTable();
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
        COUNT(*) FILTER (WHERE grade = 'S' AND status = 'approved') as grade_s,
        COUNT(*) FILTER (WHERE grade = 'A' AND status = 'approved') as grade_a,
        COUNT(*) FILTER (WHERE grade = 'B' AND status = 'approved') as grade_b,
        COUNT(*) FILTER (WHERE grade = 'C' AND status = 'approved') as grade_c,
        AVG(revenue_share_artist) FILTER (WHERE status = 'approved') as avg_artist_share
      FROM artist_contracts
    `);
    res.json({ stats: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur" });
  }
});

export default router;
