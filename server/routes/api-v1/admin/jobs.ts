import { Router } from "express";
import { db } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { jobs, auditLogs } from "../../../../shared/schema";
import { eq, ilike, and, count, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

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
      const { page = "1", limit = "20", search } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
      const offset = (pageNum - 1) * limitNum;

      // Build where clause for search
      const whereConditions = [];
      if (search) {
        whereConditions.push(ilike(jobs.title, `%${search}%`));
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

      const [job] = await db
        .insert(jobs)
        .values({
          id: jobId,
          title,
          company: company || "Unknown",
          businessId: businessId || null,
          type: type || "full-time",
          location: location || null,
          salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
          salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
          currency: currency || "USD",
          description: description || null,
          status: isActive === false ? "inactive" : "active",
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

      const [updatedJob] = await db
        .update(jobs)
        .set({
          title,
          company: company || existing.company,
          businessId: businessId || existing.businessId,
          type: type || existing.type || "full-time",
          location: location || existing.location,
          salaryMin: salaryMin ? parseInt(salaryMin, 10) : existing.salaryMin,
          salaryMax: salaryMax ? parseInt(salaryMax, 10) : existing.salaryMax,
          currency: currency || existing.currency || "USD",
          description: description || existing.description,
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
