import { Router } from "express";
import { db } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { jobs, auditLogs } from "../../../../shared/schema";
import { eq, ilike, and, count, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { notifyNewJobPosted } from "../../../services/notification-service";
import { sendGeoAdminCrudNotificationEmail } from "../../../services/email-service";

const ADMIN_NOTIFICATION_EMAIL = process.env.SMTP_USER || process.env.ADMIN_EMAIL || "luqjoey@gmail.com";

const router = Router();

/**
 * GET /api/v1/admin/jobs
 * List all jobs with pagination and filtering
 */
router.get(
  "/",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    try {
      const { page = "1", limit = "20", search, countryCode } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(500, parseInt(limit as string, 10) || 50);
      const offset = (pageNum - 1) * limitNum;

      // Build where clause for search and country filter
      const whereConditions = [];
      if (search) {
        whereConditions.push(ilike(jobs.title, `${search}%`));
      }
      if (
        countryCode &&
        typeof countryCode === "string" &&
        countryCode.length === 2
      ) {
        whereConditions.push(eq(jobs.countryCode, countryCode.toUpperCase()));
      }
      const where =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(jobs)
        .where(where);

      // Get paginated results
      const result = await db
        .select()
        .from(jobs)
        .where(where)
        .orderBy(desc(jobs.createdAt))
        .limit(limitNum)
        .offset(offset);

      console.log("✅ Jobs fetched successfully - count:", result.length);

      res.status(200).json({
        success: true,
        status: 200,
        data: result || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
        metadata: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("🔴 Jobs GET Error:", error);
      res.status(500).json({
        success: false,
        status: 500,
        error: {
          code: "FETCH_ERROR",
          message: "Failed to fetch jobs - check server logs",
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }),
);

/**
 * POST /api/v1/admin/jobs
 * Create a new job
 */
router.post(
  "/",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    try {
      const {
        title,
        company,
        businessId,
        type,
        location,
        salaryMin,
        salaryMax,
        currency,
        salaryRange,
        description,
        isActive,
        sector,
        department,
        experienceLevel,
        educationLevel,
        skills,
        requirements,
        benefits,
        isRemote,
        isFeatured,
      } = req.body;

      // Validate required fields — accept either company or businessId
      if (!title || (!company && !businessId)) {
        return res.status(400).json({
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Title and company (or businessId) are required",
          },
        });
      }

      console.log("📝 Creating job with data:", req.body);

      const jobId = randomUUID();

      // Serialize arrays to JSON strings for text columns
      const serializeArray = (val: any): string | null => {
        if (!val) return null;
        if (Array.isArray(val)) return JSON.stringify(val);
        return String(val);
      };

      const [job] = await db
        .insert(jobs)
        .values({
          id: jobId,
          title,
          company: company || "Unknown",
          businessId: businessId || null,
          type: type || "full-time",
          location: location || null,
          sector: sector || "general",
          salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
          salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
          currency: currency || "USD",
          description: description || null,
          department: department || null,
          experienceLevel: experienceLevel || null,
          educationLevel: educationLevel || null,
          skills: serializeArray(skills),
          requirements: serializeArray(requirements),
          benefits: serializeArray(benefits),
          isRemote: isRemote === true || isRemote === "true" || false,
          isFeatured: isFeatured === true || isFeatured === "true" || false,
          status: isActive === false ? "inactive" : "active",
          postedDate: new Date().toISOString().split("T")[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!job) {
        throw new Error("Insert returned no data - check database connection");
      }

      console.log("✅ Job created successfully:", job.id);

      // Audit log
      await db.insert(auditLogs).values({
        action: "CREATE",
        entityType: "job",
        entityId: job.id,
      });

      // 📬 Trigger email notifications for matching job_alerts subscribers
      notifyNewJobPosted({
        id: parseInt(job.id) || 0,
        title: job.title,
        company: job.company,
        location: job.location || "Remote",
        salary:
          job.salaryMin && job.salaryMax
            ? `${job.currency || "USD"} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`
            : undefined,
        type: job.type || "Full-time",
        sector: job.sector || undefined,
      }).catch((err) =>
        console.error("[JOB] Notification trigger error:", err),
      );

      // 📬 Send admin SMTP notification
      sendGeoAdminCrudNotificationEmail(ADMIN_NOTIFICATION_EMAIL, {
        action: "created",
        entityType: "job",
        entityName: title,
        entityId: job.id,
        details: { company, location, type, sector, experienceLevel, isRemote },
      }).catch((err) => console.error("[JOB] Email notification error:", err));

      res.status(201).json({
        success: true,
        status: 201,
        data: job,
        metadata: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("🔴 Job POST Error:", error);
      res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "INSERT_ERROR",
          message: "Failed to create job - check data types and database logs",
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }),
);

/**
 * GET /api/v1/admin/jobs/:id
 * Get a specific job
 */
router.get(
  "/:id",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);

    if (!job) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Job not found",
        },
      });
    }

    res.json({
      success: true,
      status: 200,
      data: job,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * PUT /api/v1/admin/jobs/:id
 * Update a job
 */
router.put(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        company,
        businessId,
        type,
        location,
        salaryMin,
        salaryMax,
        currency,
        salaryRange,
        description,
        isActive,
        sector,
        department,
        experienceLevel,
        educationLevel,
        skills,
        requirements,
        benefits,
        isRemote,
        isFeatured,
      } = req.body;

      // Validate required fields
      if (!title) {
        return res.status(400).json({
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Title is required",
          },
        });
      }

      // Check if job exists
      const [existing] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: {
            code: "NOT_FOUND",
            message: `Job with ID ${id} not found`,
          },
        });
      }

      console.log("📝 Updating job ID:", id);

      // Serialize arrays to JSON strings for text columns
      const serializeArray = (val: any): string | null => {
        if (val === undefined) return undefined as any; // keep existing
        if (!val) return null;
        if (Array.isArray(val)) return JSON.stringify(val);
        return String(val);
      };

      const [updatedJob] = await db
        .update(jobs)
        .set({
          title,
          company: company || existing.company,
          businessId: businessId ?? existing.businessId,
          type: type || existing.type || "full-time",
          location: location ?? existing.location,
          sector: sector || existing.sector || "general",
          salaryMin: salaryMin ? parseInt(salaryMin, 10) : existing.salaryMin,
          salaryMax: salaryMax ? parseInt(salaryMax, 10) : existing.salaryMax,
          currency: currency || existing.currency || "USD",
          description: description ?? existing.description,
          department: department ?? existing.department,
          experienceLevel: experienceLevel ?? existing.experienceLevel,
          educationLevel: educationLevel ?? existing.educationLevel,
          skills: serializeArray(skills) ?? existing.skills,
          requirements: serializeArray(requirements) ?? existing.requirements,
          benefits: serializeArray(benefits) ?? existing.benefits,
          isRemote:
            isRemote !== undefined
              ? isRemote === true || isRemote === "true"
              : existing.isRemote,
          isFeatured:
            isFeatured !== undefined
              ? isFeatured === true || isFeatured === "true"
              : existing.isFeatured,
          status: isActive === false ? "inactive" : "active",
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, id))
        .returning();

      if (!updatedJob) {
        throw new Error("Update returned no data");
      }

      console.log("✅ Job updated successfully:", id);

      // Audit log
      await db.insert(auditLogs).values({
        action: "UPDATE",
        entityType: "job",
        entityId: id,
      });

      // 📬 Send admin SMTP notification
      sendGeoAdminCrudNotificationEmail(ADMIN_NOTIFICATION_EMAIL, {
        action: "updated",
        entityType: "job",
        entityName: updatedJob.title,
        entityId: id,
        details: { company: updatedJob.company, location: updatedJob.location, type: updatedJob.type, sector: updatedJob.sector },
      }).catch((err) => console.error("[JOB] Email notification error:", err));

      res.json({
        success: true,
        status: 200,
        data: updatedJob,
        metadata: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("🔴 Job PUT Error:", error);
      res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "UPDATE_ERROR",
          message: "Failed to update job",
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }),
);

/**
 * DELETE /api/v1/admin/jobs/:id
 * Delete a job
 */
router.delete(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      // Check if job exists
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, id))
        .limit(1);

      if (!job) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: {
            code: "NOT_FOUND",
            message: `Job with ID ${id} not found`,
          },
        });
      }

      console.log("🗑️ Deleting job ID:", id);

      const [deletedJob] = await db
        .delete(jobs)
        .where(eq(jobs.id, id))
        .returning();

      if (!deletedJob) {
        throw new Error("Delete returned no data");
      }

      console.log("✅ Job deleted successfully:", id);

      // Audit log
      await db.insert(auditLogs).values({
        action: "DELETE",
        entityType: "job",
        entityId: id,
      });

      // 📬 Send admin SMTP notification
      sendGeoAdminCrudNotificationEmail(ADMIN_NOTIFICATION_EMAIL, {
        action: "deleted",
        entityType: "job",
        entityName: job.title || `Job #${id}`,
        entityId: id,
      }).catch((err) => console.error("[JOB] Email notification error:", err));

      res.json({
        success: true,
        status: 200,
        data: deletedJob,
        metadata: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("🔴 Job DELETE Error:", error);
      res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "DELETE_ERROR",
          message: "Failed to delete job",
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }),
);

export default router;
