import { Router } from "express";
import { db, pool } from "../db";
import { sql, eq, and, or, ilike, desc, count } from "drizzle-orm";
import * as schema from "@shared/schema";
import jwt from "jsonwebtoken";
import { sendGeoAdminCrudNotificationEmail } from "../services/email-service";

const ADMIN_NOTIFICATION_EMAIL =
  process.env.SMTP_USER || process.env.ADMIN_EMAIL || "luqjoey@gmail.com";
const router = Router();

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

// POST /api/jobs/generate-random
router.post("/generate-random", async (req, res) => {
  try {
    const { count: jobCount = 3 } = req.body;
    console.log(`🎲 [JOBS] Generating ${jobCount} random jobs...`);

    const companies = [
      "TechNova Solutions",
      "DataFlow Analytics",
      "CloudNine Systems",
      "AI Innovations Lab",
      "NextGen Tech Corp",
      "Digital Future Inc",
      "Smart Systems Ltd",
      "InnovateX Group",
      "Quantum Labs",
      "ByteWorks Studio",
    ];
    const titles = [
      "Senior Software Engineer",
      "Data Analyst",
      "DevOps Specialist",
      "UX/UI Designer",
      "Product Manager",
      "Machine Learning Engineer",
      "Cloud Architect",
      "Security Analyst",
      "Mobile Developer",
      "QA Engineer",
      "Full Stack Developer",
      "Backend Engineer",
    ];

    const newJobs = [];
    for (let i = 0; i < jobCount; i++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      const salaryMin = 80000 + Math.floor(Math.random() * 70000);
      const salaryMax = salaryMin + 30000 + Math.floor(Math.random() * 50000);

      const result = await db
        .insert(schema.jobs)
        .values({
          id: crypto.randomUUID(),
          company,
          title,
          type: Math.random() > 0.3 ? "full-time" : "contract",
          salaryMin,
          salaryMax,
          currency: "USD",
          status: "active",
        })
        .returning();
      newJobs.push(result[0]);
    }

    console.log(`✅ [JOBS] Generated ${newJobs.length} new jobs`);
    res.json({ success: true, count: newJobs.length, jobs: newJobs });
  } catch (error: any) {
    console.error("❌ Generate jobs error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate jobs",
      details: error.message,
    });
  }
});

// POST /api/jobs/:id/apply
router.post("/:id/apply", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      applicant_name,
      applicant_email,
      applicant_phone,
      linkedin,
      portfolio,
      cover_letter,
      resume_url,
      notes,
    } = req.body;

    let applicantId = "anonymous";
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET not set");
        const decoded = jwt.verify(token, secret) as any;
        applicantId = decoded.userId || decoded.email || "authenticated-user";
      } catch {
        // Token invalid — continue with anonymous
      }
    }

    const fullNotes = [
      notes,
      applicant_phone ? `Phone: ${applicant_phone}` : null,
      linkedin ? `LinkedIn: ${linkedin}` : null,
      portfolio ? `Portfolio: ${portfolio}` : null,
      applicant_name ? `Name: ${applicant_name}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const insertResult = await pool.query(
      `INSERT INTO job_applications (job_id, applicant_id, status, cover_letter, resume_url, notes, applied_date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, status, applied_date`,
      [
        id,
        applicant_email || applicantId,
        "submitted",
        cover_letter || null,
        resume_url || null,
        fullNotes || null,
      ],
    );

    await pool.query(
      `UPDATE jobs SET application_count = COALESCE(application_count, 0) + 1, updated_at = NOW() WHERE id = $1`,
      [id],
    );

    const application = insertResult.rows[0];
    res.json({
      success: true,
      message: "Application submitted successfully",
      jobId: id,
      applicationId: application?.id,
      status: application?.status,
    });
  } catch (error: any) {
    console.error("❌ Job application error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit application",
      details: error.message,
    });
  }
});

// POST /api/jobs/:id/save
router.post("/:id/save", (req, res) => {
  res.json({
    success: true,
    message: "Job saved successfully",
    jobId: req.params.id,
  });
});

// POST /api/jobs/:id/unsave
router.post("/:id/unsave", (req, res) => {
  res.json({
    success: true,
    message: "Job removed from saved list",
    jobId: req.params.id,
  });
});

// POST /api/jobs — create a new job listing
router.post("/", async (req, res) => {
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
