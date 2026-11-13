import { Router, type RequestHandler } from "express";
import { db, pool } from "../db";
import { sql, eq, and, or, ilike, desc, count } from "drizzle-orm";
import * as schema from "@shared/schema";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { sendGeoAdminCrudNotificationEmail } from "../services/email-service";

const ADMIN_NOTIFICATION_EMAIL =
  process.env.ADMIN_EMAIL || process.env.SMTP_USER || "";
import { uuidRouteParam } from "../middleware/uuid-route-param";
import { withSavedJobsTable } from "../utils/saved-jobs";
import {
  RESUME_MAX_BYTES,
  cleanResumeName,
  decodeMultipartFileName,
  isGenuineResume,
  resumeFormatOf,
  resumeMimeOf,
  withJobApplicationsTable,
} from "../utils/job-applications";

const router = Router();
// jobs.id is a UUID column, so the serial-integer guard used elsewhere would
// turn every real job id into a 404
router.param("id", uuidRouteParam);
router.param("applicationId", uuidRouteParam);

// The CV stays in memory and goes straight into the application row.
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: RESUME_MAX_BYTES,
    files: 1,
    fields: 20,
    fieldSize: 64 * 1024,
  },
});

// The apply form sends multipart when a CV is attached; plain JSON still works.
const readApplicationBody: RequestHandler = (req, res, next) => {
  if (!req.is("multipart/form-data")) return next();
  resumeUpload.single("resume")(req, res, (error: unknown) => {
    if (!error) return next();
    const tooBig =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    res.status(tooBig ? 413 : 400).json({
      success: false,
      error: tooBig
        ? "Your resume must be 5 MB or smaller."
        : "Your application could not be read.",
    });
  });
};

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const asText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

// GET /api/jobs — list all jobs
router.get("/", async (req, res) => {
  try {
    const {
      type,
      department,
      remote,
      featured,
      countryCode,
      status = "active",
    } = req.query;

    console.log(
      `📋 [JOBS] Fetching jobs from database...${countryCode ? ` country=${countryCode}` : ""}`,
    );

    const conditions: any[] = [];

    if (type && typeof type === "string") {
      conditions.push(eq(schema.jobs.type, type));
    }

    if (
      countryCode &&
      typeof countryCode === "string" &&
      countryCode !== "all"
    ) {
      conditions.push(eq(schema.jobs.countryCode, countryCode.toUpperCase()));
    }

    const jobResults = await db
      .select()
      .from(schema.jobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(schema.jobs.createdAt);

    console.log(`✅ [JOBS] Found ${jobResults.length} jobs from database`);

    const formatDate = (
      dateValue: any,
      defaultValue: string | null = null,
    ): string | null => {
      if (!dateValue) return defaultValue;
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return defaultValue;
        return date.toISOString();
      } catch {
        return defaultValue;
      }
    };

    const formattedJobs = jobResults.map((job) => ({
      id: job.id.toString(),
      businessId: job.businessId,
      title: job.title,
      type: job.type || "Full-time",
      salaryRange:
        job.salaryMin && job.salaryMax
          ? `${job.salaryMin}-${job.salaryMax} ${job.currency || "USD"}`
          : "Negotiable",
      isActive: job.status !== "inactive",
      created_at:
        formatDate(job.createdAt, new Date().toISOString()) ||
        new Date().toISOString(),
    }));

    res.json(formattedJobs);
  } catch (error: any) {
    console.error("❌ Jobs fetch error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch jobs",
      details: error.message,
      data: [],
    });
  }
});

// GET /api/jobs/search — search with filters + pagination
router.get("/search", async (req, res) => {
  try {
    const {
      search,
      query: queryParam = "",
      type = "",
      sector = "",
      department,
      experience_level,
      remote = "",
      is_remote,
      featured = "",
      countryCode = "",
      status: jobStatus,
      page = "1",
      limit = "20",
    } = req.query;

    // Merge "search" alias used by the public jobs endpoint
    const searchTerm = (search as string) || (queryParam as string) || "";

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    // Status filter (default to active)
    if (jobStatus && typeof jobStatus === "string") {
      conditions.push(eq(schema.jobs.status, jobStatus));
    } else {
      conditions.push(eq(schema.jobs.status, "active"));
    }

    if (searchTerm.trim()) {
      const searchCond = or(
        ilike(schema.jobs.title, `${searchTerm}%`),
        ilike(schema.jobs.company, `${searchTerm}%`),
        ilike(schema.jobs.description, `${searchTerm}%`),
      );
      if (searchCond) conditions.push(searchCond);
    }

    if (type && typeof type === "string") {
      conditions.push(eq(schema.jobs.type, type));
    }

    if (sector && typeof sector === "string" && sector !== "all") {
      conditions.push(eq(schema.jobs.sector, sector));
    }

    if (department && typeof department === "string") {
      conditions.push(ilike(schema.jobs.department, `${department}%`));
    }

    if (experience_level && typeof experience_level === "string") {
      conditions.push(eq(schema.jobs.experienceLevel, experience_level));
    }

    if (is_remote === "true" || remote === "true") {
      conditions.push(eq(schema.jobs.isRemote, true));
    }

    if (featured === "true") {
      conditions.push(eq(schema.jobs.isFeatured, true));
    }

    if (
      countryCode &&
      typeof countryCode === "string" &&
      countryCode !== "all"
    ) {
      conditions.push(eq(schema.jobs.countryCode, countryCode.toUpperCase()));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(schema.jobs)
      .where(where);

    // Fetch jobs
    const rows = await db
      .select()
      .from(schema.jobs)
      .where(where)
      .orderBy(desc(schema.jobs.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Parse field helper
    const parseField = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try {
        return JSON.parse(val);
      } catch {
        return val
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    };

    const mapped = rows.map((r) => ({
      id: r.id,
      title: r.title,
      company: r.company,
      location: r.location || "Remote",
      type: r.type || "full-time",
      sector: r.sector || "general",
      salary_min: r.salaryMin || 0,
      salary_max: r.salaryMax || 0,
      currency: r.currency || "USD",
      description: r.description || "",
      requirements: parseField(r.requirements),
      benefits: parseField(r.benefits),
      skills: parseField(r.skills),
      experience_level: r.experienceLevel || "entry",
      education_level: r.educationLevel || "bachelor",
      department: r.department || "General",
      posted_date:
        r.postedDate || r.createdAt?.toISOString() || new Date().toISOString(),
      application_deadline: r.applicationDeadline || null,
      is_featured: r.isFeatured || false,
      is_remote: r.isRemote || false,
      application_count: r.applicationCount || 0,
      view_count: r.viewCount || 0,
      status: r.status || "active",
      company_logo: r.companyLogo || null,
      company_description: r.companyDescription || null,
      apply_url: r.applyUrl || null,
      created_at: r.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: r.updatedAt?.toISOString() || new Date().toISOString(),
      business_id: r.businessId || null,
      country_code: r.countryCode || null,
    }));

    // Attach company review data if businessIds present
    const businessIds = [
      ...new Set(rows.filter((r) => r.businessId).map((r) => r.businessId!)),
    ] as number[];
    let reviewMap: Record<
      number,
      { avg_rating: number; review_count: number }
    > = {};

    if (businessIds.length > 0) {
      try {
        const reviewData = await db.execute(
          sql`SELECT business_id, ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as review_count
           FROM business_reviews
           WHERE business_id = ANY(${businessIds})
           GROUP BY business_id`,
        );
        for (const row of reviewData.rows as any[]) {
          reviewMap[row.business_id] = {
            avg_rating: parseFloat(row.avg_rating) || 0,
            review_count: parseInt(row.review_count) || 0,
          };
        }
      } catch {
        // Reviews lookup skipped
      }
    }

    const result = mapped.map((job) => ({
      ...job,
      company_rating:
        job.business_id && reviewMap[job.business_id]
          ? reviewMap[job.business_id].avg_rating
          : null,
      company_review_count:
        job.business_id && reviewMap[job.business_id]
          ? reviewMap[job.business_id].review_count
          : 0,
    }));

    console.log(`✅ [JOBS] Search returned ${result.length} jobs`);

    res.json({
      success: true,
      data: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(Number(total) / limitNum),
      },
      metadata: { timestamp: new Date().toISOString() },
    });
  } catch (error: any) {
    console.error("❌ Jobs search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search jobs",
      details: error.message,
      data: [],
    });
  }
});

// ─── Careers portal (authenticated) ────────────────────────────────────────

// GET /api/jobs/mine — postings of businesses the user owns
router.get("/mine", requireAuth(), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT j.id, j.title, j.company, j.location, j.type, j.status,
              j.posted_date, COALESCE(j.application_count, 0) AS application_count,
              b.name AS business_name
         FROM jobs j JOIN businesses b ON b.id = j.business_id
        WHERE (b.owner_id = $1 OR EXISTS (
          SELECT 1 FROM business_owners bo
           WHERE bo.business_id = b.id AND bo.user_id = $1
             AND bo.status = 'active'
        ))
        ORDER BY j.created_at DESC NULLS LAST LIMIT 200`,
      [Number(req.user!.id)],
    );
    res.json({ success: true, jobs: rows });
  } catch (error) {
    console.error("[jobs] mine:", error);
    res.status(500).json({ success: false, error: "Failed to load postings" });
  }
});

const isStaff = (role: unknown) => role === "admin" || role === "superuser";

// GET /api/jobs/my-applications — applications the user submitted
router.get(
  "/my-applications",
  requireAuth(),
  withJobApplicationsTable,
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT a.id, a.job_id, a.status, a.applied_date, j.title, j.company, j.location
           FROM job_applications a LEFT JOIN jobs j ON j.id::text = a.job_id::text
          WHERE a.applicant_id = $1
          ORDER BY a.applied_date DESC NULLS LAST LIMIT 200`,
        [String(req.user!.id)],
      );
      res.json({ success: true, applications: rows });
    } catch (error) {
      console.error("[jobs] my-applications:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to load applications" });
    }
  },
);

// GET /api/jobs/:id/applications — applicants for a posting the user owns
// (or any posting, for the team)
router.get(
  "/:id/applications",
  requireAuth(),
  withJobApplicationsTable,
  async (req, res) => {
    try {
      const owned = await pool.query(
        `SELECT 1 FROM jobs j JOIN businesses b ON b.id = j.business_id
          WHERE j.id::text = $1
            AND (b.owner_id = $2 OR EXISTS (
              SELECT 1 FROM business_owners bo
               WHERE bo.business_id = b.id AND bo.user_id = $2
                 AND bo.status = 'active'
            ))`,
        [req.params.id, Number(req.user!.id)],
      );
      if (!owned.rowCount && !isStaff(req.user!.role)) {
        return res
          .status(404)
          .json({ success: false, error: "Posting not found" });
      }
      // The CV itself is never listed: it is fetched one application at a time.
      const { rows } = await pool.query(
        `SELECT id, applicant_id, applicant_name, applicant_email, status,
                cover_letter, resume_url, resume_name,
                (resume_data IS NOT NULL) AS has_resume, notes, applied_date
           FROM job_applications WHERE job_id::text = $1
          ORDER BY applied_date DESC NULLS LAST LIMIT 500`,
        [req.params.id],
      );
      res.json({ success: true, applications: rows });
    } catch (error) {
      console.error("[jobs] applications:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to load applications" });
    }
  },
);

// GET /api/jobs/:id/applications/:applicationId/resume — the CV that came
// with an application. Only the applicant, the posting's owner and the team
// can read it; anyone else gets the same 404 as for a missing file.
router.get(
  "/:id/applications/:applicationId/resume",
  requireAuth(),
  withJobApplicationsTable,
  async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT a.applicant_id, a.resume_name, a.resume_mime, a.resume_data,
                b.owner_id,
                EXISTS (
                  SELECT 1 FROM business_owners bo
                   WHERE bo.business_id = b.id AND bo.user_id = $3
                     AND bo.status = 'active'
                ) AS is_owner
           FROM job_applications a
           JOIN jobs j ON j.id::text = a.job_id::text
           LEFT JOIN businesses b ON b.id = j.business_id
          WHERE a.id::text = $1 AND a.job_id::text = $2`,
        [req.params.applicationId, req.params.id, Number(req.user!.id)],
      );
      const row = rows[0];
      const userId = String(req.user!.id);
      const allowed =
        row &&
        (isStaff(req.user!.role) ||
          row.applicant_id === userId ||
        (row.owner_id != null && String(row.owner_id) === userId) ||
        row.is_owner === true);
      if (!allowed || !row.resume_data) {
        return res
          .status(404)
          .json({ success: false, error: "Resume not found" });
      }

      const name = cleanResumeName(row.resume_name || "resume");
      const asciiName = name.replace(/[^\x20-\x7e]/g, "_");
      const encodedName = encodeURIComponent(name).replace(
        /['()*]/g,
        (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
      );
      res.set({
        "Content-Type": row.resume_mime || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(row.resume_data.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      });
      res.send(row.resume_data);
    } catch (error) {
      console.error("[jobs] resume:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to load the resume" });
    }
  },
);

// POST /api/jobs/:id/apply — sign-in required, so every application belongs to
// someone who can follow it. The CV comes as a file (multipart) or, for older
// clients, as a link.
router.post(
  "/:id/apply",
  requireAuth(),
  withJobApplicationsTable,
  readApplicationBody,
  async (req, res) => {
    const { id } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const email =
      asText(body.applicant_email, 254) || String(req.user!.email || "");
    if (!EMAIL_SHAPE.test(email)) {
      return res
        .status(400)
        .json({ success: false, error: "A valid email address is required." });
    }

    let resume: { name: string; mime: string; data: Buffer } | null = null;
    if (req.file) {
      const name = cleanResumeName(
        decodeMultipartFileName(req.file.originalname),
      );
      const format = resumeFormatOf(name);
      if (!format || !isGenuineResume(req.file.buffer, format)) {
        return res.status(400).json({
          success: false,
          error: "Your resume must be a PDF, DOC or DOCX file.",
        });
      }
      resume = { name, mime: resumeMimeOf(format), data: req.file.buffer };
    }
    const resumeLink = asText(body.resume_url, 2000);

    const phone = asText(body.applicant_phone, 60);
    const linkedin = asText(body.linkedin, 300);
    const portfolio = asText(body.portfolio, 300);
    const notes = [
      asText(body.notes, 5000),
      phone && `Phone: ${phone}`,
      linkedin && `LinkedIn: ${linkedin}`,
      portfolio && `Portfolio: ${portfolio}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const job = await pool.query(`SELECT status FROM jobs WHERE id = $1`, [
        id,
      ]);
      if (!job.rows.length) {
        return res.status(404).json({ success: false, error: "Job not found" });
      }
      if (job.rows[0].status !== "active") {
        return res.status(409).json({
          success: false,
          code: "JOB_CLOSED",
          error: "This position is no longer accepting applications.",
        });
      }

      const client = await pool.connect();
      let application: { id: string; status: string } | undefined;
      try {
        await client.query("BEGIN");
        const applicantId = String(req.user!.id);
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
          [id, applicantId],
        );
        const existing = await client.query(
          `SELECT 1 FROM job_applications
            WHERE job_id = $1 AND applicant_id = $2
            LIMIT 1`,
          [id, applicantId],
        );
        if (!existing.rows.length) {
          const inserted = await client.query(
            `INSERT INTO job_applications
               (job_id, applicant_id, applicant_name, applicant_email, status,
                cover_letter, resume_url, resume_name, resume_mime, resume_data,
                notes, applied_date)
             VALUES ($1, $2, $3, $4, 'submitted', $5, $6, $7, $8, $9, $10, NOW())
             RETURNING id, status`,
            [
              id,
              applicantId,
              asText(body.applicant_name, 200) || null,
              email,
              asText(body.cover_letter, 10000) || null,
              /^https?:\/\//i.test(resumeLink) ? resumeLink : null,
              resume?.name ?? null,
              resume?.mime ?? null,
              resume?.data ?? null,
              notes || null,
            ],
          );
          application = inserted.rows[0];
        }
        if (application) {
          await client.query(
            `UPDATE jobs SET application_count = COALESCE(application_count, 0) + 1, updated_at = NOW() WHERE id = $1`,
            [id],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }

      if (!application) {
        return res.status(409).json({
          success: false,
          code: "ALREADY_APPLIED",
          error: "You already applied to this position.",
        });
      }
      res.json({
        success: true,
        message: "Application submitted successfully",
        jobId: id,
        applicationId: application.id,
        status: application.status,
        resumeSaved: Boolean(resume),
      });
    } catch (error) {
      console.error("❌ Job application error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to submit application" });
    }
  },
);

// GET /api/jobs/saved — ids of the jobs the signed-in user saved
router.get("/saved", requireAuth(), withSavedJobsTable, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT job_id FROM saved_jobs WHERE user_id = $1
        ORDER BY saved_date DESC LIMIT 500`,
      [Number(req.user!.id)],
    );
    res.json({ success: true, jobIds: rows.map((row) => String(row.job_id)) });
  } catch (error) {
    console.error("[jobs] saved:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to load saved jobs" });
  }
});

// POST /api/jobs/:id/save — save a job for the signed-in user (idempotent)
router.post(
  "/:id/save",
  requireAuth(),
  withSavedJobsTable,
  async (req, res) => {
    try {
      const job = await pool.query(`SELECT 1 FROM jobs WHERE id = $1`, [
        req.params.id,
      ]);
      if (job.rows.length === 0) {
        return res.status(404).json({ success: false, error: "Job not found" });
      }
      await pool.query(
        `INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2)
         ON CONFLICT (user_id, job_id) DO NOTHING`,
        [Number(req.user!.id), req.params.id],
      );
      res.json({
        success: true,
        message: "Job saved successfully",
        jobId: req.params.id,
      });
    } catch (error) {
      console.error("[jobs] save:", error);
      res.status(500).json({ success: false, error: "Failed to save job" });
    }
  },
);

// POST /api/jobs/:id/unsave — remove a job from the signed-in user's saved list
router.post(
  "/:id/unsave",
  requireAuth(),
  withSavedJobsTable,
  async (req, res) => {
    try {
      await pool.query(
        `DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2`,
        [Number(req.user!.id), req.params.id],
      );
      res.json({
        success: true,
        message: "Job removed from saved list",
        jobId: req.params.id,
      });
    } catch (error) {
      console.error("[jobs] unsave:", error);
      res.status(500).json({ success: false, error: "Failed to unsave job" });
    }
  },
);

// POST /api/jobs — create a new job listing
router.post("/", requireAuth(["admin", "superuser"]), async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      type,
      sector,
      countryCode,
      salaryMin,
      salaryMax,
      currency,
      description,
      requirements,
      experienceLevel,
      department,
      isRemote,
    } = req.body;

    if (!title || !company) {
      return res
        .status(400)
        .json({ success: false, error: "title and company are required" });
    }

    const result = await pool.query(
      `INSERT INTO jobs (id, title, company, location, type, sector, country_code,
         salary_min, salary_max, currency, description, requirements,
         experience_level, department, is_remote, status, posted_date, created_at, updated_at)
       VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',
               CURRENT_DATE, NOW(), NOW())
       RETURNING *`,
      [
        title,
        company,
        location || null,
        type || "Full-time",
        sector || "general",
        countryCode || null,
        salaryMin || null,
        salaryMax || null,
        currency || "USD",
        description || null,
        requirements || null,
        experienceLevel || null,
        department || null,
        isRemote || false,
      ],
    );

    res.status(201).json({ success: true, data: result.rows[0] });

    // 📬 Send SMTP notification (non-blocking)
    const created = result.rows[0];
    sendGeoAdminCrudNotificationEmail(ADMIN_NOTIFICATION_EMAIL, {
      action: "created",
      entityType: "job",
      entityName: created?.title || title,
      entityId: created?.id || "unknown",
      details: { company, location, type, sector, experienceLevel, isRemote },
    }).catch((err) => console.error("[JOB] Email notification error:", err));
  } catch (error: any) {
    console.error("[JOBS] Create error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
