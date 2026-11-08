/**
 * VersaVids API Routes
 * Video production services: briefs, deliverables, revisions, licensing
 * Mirrors the beatmaker request/brief workflow for videastes
 */
import { Router, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { parsePositiveInt } from "../utils/positive-int";
import {
  DELIVERABLE_DECISIONS,
  PROJECT_STATUS_UPDATES,
  projectAccess,
} from "../utils/versavids-access";
import {
  DELIVERY_ACCEPTING_STATUSES,
  parseDeliveryUrl,
} from "../../shared/versavids-rules";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────
// TABLE AUTO-CREATION (idempotent)
// ─────────────────────────────────────────────────────────────────────────

async function ensureVersaVidsTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS video_projects (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        project_type VARCHAR(50) NOT NULL DEFAULT 'music_video',
        genre VARCHAR(50),
        budget DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        deadline TIMESTAMP,
        status VARCHAR(30) NOT NULL DEFAULT 'open',
        claimed_by INTEGER REFERENCES users(id),
        claimed_at TIMESTAMP,
        priority VARCHAR(10) DEFAULT 'normal',
        tags JSONB DEFAULT '[]',
        reference_urls JSONB DEFAULT '[]',
        mood VARCHAR(100),
        target_audience TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS video_briefs (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
        visual_style TEXT,
        color_palette TEXT,
        editing_pace VARCHAR(30),
        duration VARCHAR(30),
        aspect_ratio VARCHAR(20) DEFAULT '16:9',
        resolution VARCHAR(10) DEFAULT '4K',
        has_music_track BOOLEAN DEFAULT false,
        music_track_url TEXT,
        needs_sound_design BOOLEAN DEFAULT false,
        needs_voiceover BOOLEAN DEFAULT false,
        deliverable_formats JSONB DEFAULT '["mp4"]',
        includes_raw_footage BOOLEAN DEFAULT false,
        includes_project_files BOOLEAN DEFAULT false,
        reference_links JSONB DEFAULT '[]',
        moodboard_url TEXT,
        storyboard_url TEXT,
        script_text TEXT,
        additional_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS video_deliverables (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
        videaste_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        thumbnail_url TEXT,
        file_size INTEGER,
        duration INTEGER,
        format VARCHAR(20) DEFAULT 'mp4',
        resolution VARCHAR(10),
        version INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(20) NOT NULL DEFAULT 'submitted',
        client_feedback TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS video_revisions (
        id SERIAL PRIMARY KEY,
        deliverable_id INTEGER NOT NULL REFERENCES video_deliverables(id) ON DELETE CASCADE,
        requested_by INTEGER NOT NULL REFERENCES users(id),
        revision_notes TEXT NOT NULL,
        priority VARCHAR(10) DEFAULT 'normal',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        revised_file_url TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS video_licenses (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
        license_type VARCHAR(30) NOT NULL DEFAULT 'standard',
        usage_rights TEXT,
        territory VARCHAR(50) DEFAULT 'worldwide',
        duration VARCHAR(50) DEFAULT 'perpetual',
        price DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        accepted_by_client BOOLEAN DEFAULT false,
        accepted_by_videaste BOOLEAN DEFAULT false,
        signed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS video_proj_client_idx ON video_projects(client_id);
      CREATE INDEX IF NOT EXISTS video_proj_status_idx ON video_projects(status);
      CREATE INDEX IF NOT EXISTS video_proj_claimed_idx ON video_projects(claimed_by);
    `);
  } catch (err) {
    console.warn("[VersaVids] Table creation check:", err);
  }
}

// Ensure tables on module load
ensureVersaVidsTables();

// ─────────────────────────────────────────────────────────────────────────
// PROJECTS — Client creates video project requests
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /api/versavids/projects — Get user's video projects (as client or videaste)
 */
router.get("/projects", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const role = (req.query.role as string) || "client"; // 'client' | 'videaste'

    let result;
    if (role === "videaste") {
      // Videaste sees projects they've claimed or open projects
      result = await db.execute(sql`
        SELECT vp.*, u.display_name as client_name, u.email as client_email
        FROM video_projects vp
        LEFT JOIN users u ON vp.client_id = u.id
        WHERE vp.claimed_by = ${userId} OR vp.status = 'open'
        ORDER BY 
          CASE WHEN vp.claimed_by = ${userId} THEN 0 ELSE 1 END,
          vp.created_at DESC
        LIMIT 50
      `);
    } else {
      // Client sees their own projects
      result = await db.execute(sql`
        SELECT vp.*, u.display_name as videaste_name
        FROM video_projects vp
        LEFT JOIN users u ON vp.claimed_by = u.id
        WHERE vp.client_id = ${userId}
        ORDER BY vp.created_at DESC
        LIMIT 50
      `);
    }

    const projects = (result.rows as any[]).map((p) =>
      Number(p.claimed_by) === Number(userId)
        ? p
        : { ...p, client_email: undefined },
    );
    res.json({ success: true, projects });
  } catch (error: any) {
    console.error("[VersaVids] Error fetching projects:", error);
    res.json({ success: true, projects: [] });
  }
});

/**
 * GET /api/versavids/projects/open — Browse all open projects (for videastes)
 */
router.get("/projects/open", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT vp.*, u.display_name as client_name
      FROM video_projects vp
      LEFT JOIN users u ON vp.client_id = u.id
      WHERE vp.status = 'open'
      ORDER BY 
        CASE WHEN vp.priority = 'urgent' THEN 0 WHEN vp.priority = 'high' THEN 1 ELSE 2 END,
        vp.created_at DESC
      LIMIT 100
    `);

    res.json({ success: true, projects: result.rows });
  } catch (error: any) {
    console.error("[VersaVids] Error fetching open projects:", error);
    res.json({ success: true, projects: [] });
  }
});

/**
 * POST /api/versavids/projects — Create a new video project
 */
router.post("/projects", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      title,
      description,
      project_type,
      genre,
      budget,
      currency,
      deadline,
      priority,
      tags,
      reference_urls,
      mood,
      target_audience,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const result = await db.execute(sql`
      INSERT INTO video_projects (client_id, title, description, project_type, genre, budget, currency, deadline, priority, tags, reference_urls, mood, target_audience)
      VALUES (${userId}, ${title}, ${description || null}, ${project_type || "music_video"}, ${genre || null}, ${budget || null}, ${currency || "USD"}, ${deadline ? new Date(deadline) : null}, ${priority || "normal"}, ${JSON.stringify(tags || [])}, ${JSON.stringify(reference_urls || [])}, ${mood || null}, ${target_audience || null})
      RETURNING *
    `);

    res.status(201).json({ success: true, project: result.rows[0] });
  } catch (error: any) {
    console.error("[VersaVids] Error creating project:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

/**
 * PATCH /api/versavids/projects/:id — Update project (status, claim, etc.)
 */
router.patch(
  "/projects/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req as any).user?.userId);
      const projectId = parsePositiveInt(req.params.id);
      const { status, claimed_by } = req.body;

      if (!projectId) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify ownership or claim eligibility
      const [project] = (
        await db.execute(sql`
      SELECT client_id, status, claimed_by FROM video_projects WHERE id = ${projectId}
    `)
      ).rows as any[];

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const access = projectAccess(project, (req as any).user);

      // Claim: only open projects can be claimed, by an artist, not by the client
      if (claimed_by !== undefined) {
        if (project.status !== "open") {
          return res.status(409).json({ error: "Project is no longer open" });
        }
        if (access.isClient) {
          return res
            .status(403)
            .json({ error: "You cannot take your own project" });
        }
        const artist = await db.execute(sql`
        SELECT id FROM artist_profiles WHERE user_id = ${userId} AND is_active = true LIMIT 1
      `);
        if (!artist.rows.length) {
          return res.status(403).json({
            error: "Only artists with an active profile can take a project",
          });
        }
        const claimed = await db.execute(sql`
        UPDATE video_projects SET claimed_by = ${userId}, claimed_at = NOW(), status = 'claimed', updated_at = NOW()
        WHERE id = ${projectId} AND status = 'open'
        RETURNING id
      `);
        if (!claimed.rows.length) {
          return res.status(409).json({ error: "Project is no longer open" });
        }
        return res.json({ success: true, message: "Project claimed" });
      }

      // Status update: only the client, the assigned videaste or staff
      if (status && (access.isClient || access.isVideaste || access.isStaff)) {
        if (!PROJECT_STATUS_UPDATES.includes(status)) {
          return res.status(400).json({ error: "Invalid status" });
        }
        if (status === "completed") {
          await db.execute(
            sql`UPDATE video_projects SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = ${projectId}`,
          );
        } else {
          await db.execute(
            sql`UPDATE video_projects SET status = ${status}, updated_at = NOW() WHERE id = ${projectId}`,
          );
        }
        return res.json({
          success: true,
          message: `Status updated to ${status}`,
        });
      }

      res.status(403).json({ error: "Not authorized to update this project" });
    } catch (error: any) {
      console.error("[VersaVids] Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  },
);

/**
 * GET /api/versavids/projects/:id — Get project details with brief & deliverables
 */
router.get(
  "/projects/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const projectId = parsePositiveInt(req.params.id);
      if (!projectId) {
        return res.status(404).json({ error: "Project not found" });
      }

      const [project] = (
        await db.execute(sql`
      SELECT vp.*, u.display_name as client_name, u.email as client_email,
             v.display_name as videaste_name
      FROM video_projects vp
      LEFT JOIN users u ON vp.client_id = u.id
      LEFT JOIN users v ON vp.claimed_by = v.id
      WHERE vp.id = ${projectId}
    `)
      ).rows as any[];

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // The client, the artist who took the project and staff see the delivered
      // work and the client's email; everyone else only sees the open request.
      const access = projectAccess(project, (req as any).user);
      const isParty = access.isClient || access.isVideaste || access.isStaff;
      if (!isParty) delete project.client_email;

      // Get brief
      const briefResult = await db.execute(sql`
      SELECT * FROM video_briefs WHERE project_id = ${projectId} LIMIT 1
    `);

      // Get deliverables
      const deliverableResult = isParty
        ? await db.execute(sql`
      SELECT vd.*, u.display_name as videaste_name
      FROM video_deliverables vd
      LEFT JOIN users u ON vd.videaste_id = u.id
      WHERE vd.project_id = ${projectId}
      ORDER BY vd.version DESC
    `)
        : { rows: [] };

      // Get license
      const licenseResult = await db.execute(sql`
      SELECT * FROM video_licenses WHERE project_id = ${projectId} LIMIT 1
    `);

      res.json({
        success: true,
        project,
        brief: briefResult.rows[0] || null,
        deliverables: deliverableResult.rows,
        license: licenseResult.rows[0] || null,
      });
    } catch (error: any) {
      console.error("[VersaVids] Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// BRIEFS — Detailed creative specs for a project
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /api/versavids/briefs — Create/update a brief for a project
 */
router.post("/briefs", requireAuth(), async (req: Request, res: Response) => {
  try {
    const {
      project_id,
      visual_style,
      color_palette,
      editing_pace,
      duration,
      aspect_ratio,
      resolution,
      has_music_track,
      music_track_url,
      needs_sound_design,
      needs_voiceover,
      deliverable_formats,
      includes_raw_footage,
      includes_project_files,
      reference_links,
      moodboard_url,
      storyboard_url,
      script_text,
      additional_notes,
    } = req.body;

    const projectId = parsePositiveInt(project_id);
    if (projectId === null) {
      return res.status(400).json({ error: "project_id is required" });
    }

    // Only the project's client (or staff) writes its brief
    const [project] = (
      await db.execute(
        sql`SELECT client_id, claimed_by FROM video_projects WHERE id = ${projectId}`,
      )
    ).rows as any[];
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const access = projectAccess(project, (req as any).user);
    if (!access.isClient && !access.isStaff) {
      return res
        .status(403)
        .json({ error: "Only the project client can edit its brief" });
    }

    // Upsert — one brief per project
    const existing = await db.execute(
      sql`SELECT id FROM video_briefs WHERE project_id = ${projectId} LIMIT 1`,
    );

    if (existing.rows.length > 0) {
      await db.execute(sql`
        UPDATE video_briefs SET
          visual_style = ${visual_style || null}, color_palette = ${color_palette || null},
          editing_pace = ${editing_pace || null}, duration = ${duration || null},
          aspect_ratio = ${aspect_ratio || "16:9"}, resolution = ${resolution || "4K"},
          has_music_track = ${has_music_track || false}, music_track_url = ${music_track_url || null},
          needs_sound_design = ${needs_sound_design || false}, needs_voiceover = ${needs_voiceover || false},
          deliverable_formats = ${JSON.stringify(deliverable_formats || ["mp4"])},
          includes_raw_footage = ${includes_raw_footage || false}, includes_project_files = ${includes_project_files || false},
          reference_links = ${JSON.stringify(reference_links || [])},
          moodboard_url = ${moodboard_url || null}, storyboard_url = ${storyboard_url || null},
          script_text = ${script_text || null}, additional_notes = ${additional_notes || null},
          updated_at = NOW()
        WHERE project_id = ${projectId}
      `);
      return res.json({ success: true, message: "Brief updated" });
    }

    const result = await db.execute(sql`
      INSERT INTO video_briefs (project_id, visual_style, color_palette, editing_pace, duration, aspect_ratio, resolution, has_music_track, music_track_url, needs_sound_design, needs_voiceover, deliverable_formats, includes_raw_footage, includes_project_files, reference_links, moodboard_url, storyboard_url, script_text, additional_notes)
      VALUES (${projectId}, ${visual_style || null}, ${color_palette || null}, ${editing_pace || null}, ${duration || null}, ${aspect_ratio || "16:9"}, ${resolution || "4K"}, ${has_music_track || false}, ${music_track_url || null}, ${needs_sound_design || false}, ${needs_voiceover || false}, ${JSON.stringify(deliverable_formats || ["mp4"])}, ${includes_raw_footage || false}, ${includes_project_files || false}, ${JSON.stringify(reference_links || [])}, ${moodboard_url || null}, ${storyboard_url || null}, ${script_text || null}, ${additional_notes || null})
      RETURNING *
    `);

    res.status(201).json({ success: true, brief: result.rows[0] });
  } catch (error: any) {
    console.error("[VersaVids] Error saving brief:", error);
    res.status(500).json({ error: "Failed to save brief" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// DELIVERABLES — Videaste uploads completed work
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /api/versavids/deliverables — Upload a deliverable
 */
router.post(
  "/deliverables",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const videasteId = (req as any).user?.userId;
      const {
        project_id,
        title,
        description,
        file_url,
        thumbnail_url,
        file_size,
        duration,
        format,
        resolution,
        version,
      } = req.body;

      const projectId = parsePositiveInt(project_id);
      if (projectId === null || !title || !file_url) {
        return res
          .status(400)
          .json({ error: "project_id, title, and file_url are required" });
      }

      // Links are clicked by the client: plain http(s) only
      const fileUrl = parseDeliveryUrl(file_url);
      const thumbnailUrl = thumbnail_url
        ? parseDeliveryUrl(thumbnail_url)
        : null;
      if (!fileUrl || (thumbnail_url && !thumbnailUrl)) {
        return res.status(400).json({
          error: "file_url and thumbnail_url must be http(s) links",
        });
      }

      // Only the videaste assigned to the project (or staff) uploads work to it
      const [project] = (
        await db.execute(
          sql`SELECT client_id, status, claimed_by FROM video_projects WHERE id = ${projectId}`,
        )
      ).rows as any[];
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      const access = projectAccess(project, (req as any).user);
      if (!access.isVideaste && !access.isStaff) {
        return res.status(403).json({
          error: "Only the assigned videaste can upload deliverables",
        });
      }

      // A finished or cancelled project must not be pulled back into review
      if (!DELIVERY_ACCEPTING_STATUSES.includes(project.status)) {
        return res
          .status(409)
          .json({ error: "This project is not accepting deliveries" });
      }

      const result = await db.execute(sql`
      INSERT INTO video_deliverables (project_id, videaste_id, title, description, file_url, thumbnail_url, file_size, duration, format, resolution, version)
      VALUES (${projectId}, ${videasteId}, ${title}, ${description || null}, ${fileUrl}, ${thumbnailUrl}, ${file_size || null}, ${duration || null}, ${format || "mp4"}, ${resolution || null}, ${version || 1})
      RETURNING *
    `);

      // Update project status to 'review'
      await db.execute(
        sql`UPDATE video_projects SET status = 'review', updated_at = NOW() WHERE id = ${projectId}`,
      );

      res.status(201).json({ success: true, deliverable: result.rows[0] });
    } catch (error: any) {
      console.error("[VersaVids] Error uploading deliverable:", error);
      res.status(500).json({ error: "Failed to upload deliverable" });
    }
  },
);

/**
 * PATCH /api/versavids/deliverables/:id — Approve/request revision
 */
router.patch(
  "/deliverables/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const { status, client_feedback } = req.body;
      const deliverableId = parsePositiveInt(req.params.id);
      if (deliverableId === null) {
        return res.status(404).json({ error: "Deliverable not found" });
      }

      // Only the project's client (or staff) can approve or ask for changes
      const [deliv] = (
        await db.execute(sql`
        SELECT vd.project_id, vp.client_id, vp.claimed_by
        FROM video_deliverables vd
        JOIN video_projects vp ON vp.id = vd.project_id
        WHERE vd.id = ${deliverableId}
      `)
      ).rows as any[];
      if (!deliv) {
        return res.status(404).json({ error: "Deliverable not found" });
      }
      const access = projectAccess(deliv, (req as any).user);
      if (!access.isClient && !access.isStaff) {
        return res.status(403).json({
          error: "Only the project client can review deliverables",
        });
      }

      if (!DELIVERABLE_DECISIONS.includes(status)) {
        return res.status(400).json({
          error: "status must be approved or revision_requested",
        });
      }

      if (status === "approved") {
        await db.execute(sql`
        UPDATE video_deliverables SET status = 'approved', client_feedback = ${client_feedback || null}, approved_at = NOW()
        WHERE id = ${deliverableId}
      `);

        // Also update project status
        await db.execute(
          sql`UPDATE video_projects SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = ${deliv.project_id}`,
        );
      } else {
        await db.execute(sql`
        UPDATE video_deliverables SET status = 'revision_requested', client_feedback = ${client_feedback || null}
        WHERE id = ${deliverableId}
      `);

        // Create a revision record
        const userId = (req as any).user?.userId;
        await db.execute(sql`
        INSERT INTO video_revisions (deliverable_id, requested_by, revision_notes)
        VALUES (${deliverableId}, ${userId}, ${client_feedback || "Revision requested"})
      `);

        // Update project status
        await db.execute(
          sql`UPDATE video_projects SET status = 'revision', updated_at = NOW() WHERE id = ${deliv.project_id}`,
        );
      }

      res.json({ success: true, message: `Deliverable ${status}` });
    } catch (error: any) {
      console.error("[VersaVids] Error updating deliverable:", error);
      res.status(500).json({ error: "Failed to update deliverable" });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────
// STATS — Dashboard analytics
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /api/versavids/stats — Get VersaVids platform stats
 */
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM video_projects) as total_projects,
        (SELECT COUNT(*) FROM video_projects WHERE status = 'open') as open_projects,
        (SELECT COUNT(*) FROM video_projects WHERE status = 'completed') as completed_projects,
        (SELECT COUNT(*) FROM video_deliverables) as total_deliverables,
        (SELECT COUNT(*) FROM video_revisions) as total_revisions
    `);

    res.json({ success: true, stats: result.rows[0] || {} });
  } catch (error: any) {
    // Tables might not exist yet
    res.json({
      success: true,
      stats: {
        total_projects: 0,
        open_projects: 0,
        completed_projects: 0,
        total_deliverables: 0,
        total_revisions: 0,
      },
    });
  }
});

export default router;
