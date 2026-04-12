/**
 * Contractor Pipeline — apply → verify → assign workflow
 *
 * Endpoints:
 *   POST   /api/contractor-pipeline/apply            — submit application to contractor pool
 *   GET    /api/contractor-pipeline/my-application    — check own application status
 *   GET    /api/contractor-pipeline/applications      — admin: list all applications
 *   POST   /api/contractor-pipeline/applications/:id/approve  — admin: approve application
 *   POST   /api/contractor-pipeline/applications/:id/reject   — admin: reject application
 *   POST   /api/contractor-pipeline/assign            — admin: assign a contract to a contractor
 *   GET    /api/contractor-pipeline/my-contracts      — contractor: view assigned contracts
 *   POST   /api/contractor-pipeline/contracts/:id/accept   — contractor: accept contract
 *   POST   /api/contractor-pipeline/contracts/:id/decline  — contractor: decline contract
 *   POST   /api/contractor-pipeline/contracts/:id/complete — contractor: mark contract complete
 */

import { Router, Request, Response } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { z } from "zod";

const router = Router();

// ─── Application Schema ────────────────────────────────────────────────────

const applySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(30).optional(),
  specialization: z.string().max(200).optional(),
  hourlyRate: z.string().max(50).optional(),
  portfolioUrl: z.string().url().max(500).optional().or(z.literal("")),
  coverLetter: z.string().max(2000).optional(),
});

/**
 * POST /api/contractor-pipeline/apply
 * Submit a contractor application to the pool
 */
router.post(
  "/apply",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number((req as any).user.userId);
    const email = (req as any).user.email;

    // Check if already has an active application
    const existing = await db.execute(
      sql`SELECT id, status FROM contractor_applications
          WHERE user_id = ${userId} AND status = 'pending'
          LIMIT 1`,
    );
    if (existing.rows?.length) {
      res.status(409).json({
        success: false,
        message: "You already have a pending application",
      });
      return;
    }

    // Check if already an approved contractor
    const alreadyContractor = await db.execute(
      sql`SELECT id FROM contractors WHERE user_id = ${userId} LIMIT 1`,
    );
    if (alreadyContractor.rows?.length) {
      res.status(409).json({
        success: false,
        message: "You are already an approved contractor",
      });
      return;
    }

    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: parsed.error.errors[0].message,
      });
      return;
    }

    const {
      name,
      phone,
      specialization,
      hourlyRate,
      portfolioUrl,
      coverLetter,
    } = parsed.data;

    const [application] = await db
      .insert(schema.contractorApplications)
      .values({
        userId,
        name,
        email: email || "",
        phone: phone || null,
        specialization: specialization || "",
        hourlyRate: hourlyRate || null,
        portfolioUrl: portfolioUrl || null,
        coverLetter: coverLetter || null,
        status: "pending",
      })
      .returning();

    console.log(
      `[CONTRACTOR] New application from ${email} (user ${userId}): ${name}`,
    );

    res.json({
      success: true,
      message:
        "Application submitted! We'll review your profile and get back to you.",
      application,
    });
  }),
);

/**
 * GET /api/contractor-pipeline/my-application
 * Check own application status
 */
router.get(
  "/my-application",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number((req as any).user.userId);

    const result = await db.execute(
      sql`SELECT ca.*, u.username AS reviewer_name
          FROM contractor_applications ca
          LEFT JOIN users u ON u.id = ca.reviewed_by
          WHERE ca.user_id = ${userId}
          ORDER BY ca.created_at DESC
          LIMIT 1`,
    );

    if (!result.rows?.length) {
      res.json({ success: true, application: null });
      return;
    }

    res.json({ success: true, application: result.rows[0] });
  }),
);

/**
 * GET /api/contractor-pipeline/applications
 * Admin: list all contractor applications
 */
router.get(
  "/applications",
  requireAuth(["admin", "superuser", "moderator"]),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || "pending";

    const applications = await db.execute(
      sql`SELECT ca.*, u.username, u.email AS user_email,
                 u.subscription_tier, r.username AS reviewer_name
          FROM contractor_applications ca
          JOIN users u ON u.id = ca.user_id
          LEFT JOIN users r ON r.id = ca.reviewed_by
          WHERE ca.status = ${status}
          ORDER BY ca.created_at ASC
          LIMIT ${limit} OFFSET ${offset}`,
    );

    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int AS total FROM contractor_applications WHERE status = ${status}`,
    );

    res.json({
      success: true,
      applications: applications.rows,
      total: (countResult.rows[0] as any)?.total || 0,
      page,
      limit,
    });
  }),
);

/**
 * POST /api/contractor-pipeline/applications/:id/approve
 * Admin: approve application → create contractors row → grant portal
 */
router.post(
  "/applications/:id/approve",
  requireAuth(["admin", "superuser", "moderator"]),
  asyncHandler(async (req: Request, res: Response) => {
    const appId = parseInt(req.params.id);
    const reviewerId = Number((req as any).user.userId);
    const { reviewNotes } = req.body;

    const [application] = await db
      .select()
      .from(schema.contractorApplications)
      .where(eq(schema.contractorApplications.id, appId))
      .limit(1);

    if (!application) {
      res
        .status(404)
        .json({ success: false, message: "Application not found" });
      return;
    }

    if (application.status !== "pending") {
      res.status(400).json({
        success: false,
        message: `Application already ${application.status}`,
      });
      return;
    }

    // 1. Update application status
    await db
      .update(schema.contractorApplications)
      .set({
        status: "approved",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || "Approved",
      })
      .where(eq(schema.contractorApplications.id, appId));

    // 2. Create contractors row (the actual profile)
    await db.insert(schema.contractors).values({
      userId: application.userId,
      name: application.name,
      email: application.email,
      phone: application.phone,
      specialization: application.specialization,
      hourlyRate: application.hourlyRate,
    });

    // 3. Grant contractor portal access
    await db.execute(
      sql`UPDATE users
          SET portal_access = COALESCE(portal_access, '[]'::jsonb) || '["contractor"]'::jsonb
          WHERE id = ${application.userId}`,
    );

    console.log(
      `[CONTRACTOR] Application #${appId} approved for user ${application.userId} by admin ${reviewerId}`,
    );

    res.json({
      success: true,
      message: `Contractor application approved for ${application.name}`,
    });
  }),
);

/**
 * POST /api/contractor-pipeline/applications/:id/reject
 * Admin: reject an application
 */
router.post(
  "/applications/:id/reject",
  requireAuth(["admin", "superuser", "moderator"]),
  asyncHandler(async (req: Request, res: Response) => {
    const appId = parseInt(req.params.id);
    const reviewerId = Number((req as any).user.userId);
    const { reviewNotes } = req.body;

    const [application] = await db
      .select()
      .from(schema.contractorApplications)
      .where(eq(schema.contractorApplications.id, appId))
      .limit(1);

    if (!application) {
      res
        .status(404)
        .json({ success: false, message: "Application not found" });
      return;
    }

    if (application.status !== "pending") {
      res.status(400).json({
        success: false,
        message: `Application already ${application.status}`,
      });
      return;
    }

    await db
      .update(schema.contractorApplications)
      .set({
        status: "rejected",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || "Rejected",
      })
      .where(eq(schema.contractorApplications.id, appId));

    console.log(
      `[CONTRACTOR] Application #${appId} rejected by admin ${reviewerId}`,
    );

    res.json({
      success: true,
      message: `Application rejected for ${application.name}`,
    });
  }),
);

/**
 * GET /api/contractor-pipeline/contractors
 * Admin: list approved contractors (for assignment dropdown)
 */
router.get(
  "/contractors",
  requireAuth(["admin", "superuser", "moderator"]),
  asyncHandler(async (req: Request, res: Response) => {
    const search = (req.query.search as string) || "";
    const searchClause = search
      ? sql` AND (c.name ILIKE ${"%" + search + "%"} OR c.email ILIKE ${"%" + search + "%"} OR c.specialization ILIKE ${"%" + search + "%"})`
      : sql``;

    const contractors = await db.execute(
      sql`SELECT c.id, c.user_id, c.name, c.email, c.phone, c.specialization,
                 c.hourly_rate, c.created_at, u.username, u.subscription_tier
          FROM contractors c
          JOIN users u ON u.id = c.user_id
          WHERE 1=1 ${searchClause}
          ORDER BY c.name ASC`,
    );

    res.json({ success: true, contractors: contractors.rows });
  }),
);

/**
 * GET /api/contractor-pipeline/assignments
 * Admin: list all assigned contracts across all contractors
 */
router.get(
  "/assignments",
  requireAuth(["admin", "superuser", "moderator"]),
  asyncHandler(async (req: Request, res: Response) => {
    const status = (req.query.status as string) || "";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;

    const statusClause = status ? sql` AND ac.status = ${status}` : sql``;

    const assignments = await db.execute(
      sql`SELECT ac.*, c.name AS contractor_name, c.email AS contractor_email,
                 c.specialization, u.username AS assigned_by_name
          FROM assigned_contracts ac
          JOIN contractors c ON c.id = ac.contractor_id
          LEFT JOIN users u ON u.id = ac.assigned_by
          WHERE 1=1 ${statusClause}
          ORDER BY ac.created_at DESC
          LIMIT ${limit} OFFSET ${offset}`,
    );

    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int AS total FROM assigned_contracts ac WHERE 1=1 ${statusClause}`,
    );

    res.json({
      success: true,
      assignments: assignments.rows,
      total: (countResult.rows[0] as any)?.total || 0,
      page,
      limit,
    });
  }),
);

/**
 * POST /api/contractor-pipeline/assign
 * Admin: assign a contract to an approved contractor
 */
router.post(
  "/assign",
  requireAuth(["admin", "superuser", "moderator"]),
  asyncHandler(async (req: Request, res: Response) => {
    const adminId = Number((req as any).user.userId);
    const { contractorId, title, description, terms, deadline, paymentAmount } =
      req.body;

    if (!contractorId || !title) {
      res.status(400).json({
        success: false,
        message: "contractorId and title are required",
      });
      return;
    }

    // Verify contractor exists
    const [contractor] = await db
      .select()
      .from(schema.contractors)
      .where(eq(schema.contractors.id, Number(contractorId)))
      .limit(1);

    if (!contractor) {
      res.status(404).json({ success: false, message: "Contractor not found" });
      return;
    }

    const [contract] = await db
      .insert(schema.assignedContracts)
      .values({
        contractorId: Number(contractorId),
        assignedBy: adminId,
        title,
        description: description || null,
        terms: terms || null,
        deadline: deadline ? new Date(deadline) : null,
        paymentAmount: paymentAmount || null,
        status: "offered",
      })
      .returning();

    console.log(
      `[CONTRACTOR] Contract "${title}" assigned to contractor #${contractorId} by admin ${adminId}`,
    );

    res.json({
      success: true,
      message: `Contract "${title}" offered to contractor`,
      contract,
    });
  }),
);

/**
 * GET /api/contractor-pipeline/my-contracts
 * Contractor: view their assigned contracts
 */
router.get(
  "/my-contracts",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = Number((req as any).user.userId);

    // Find contractor id for this user
    const contractorResult = await db.execute(
      sql`SELECT id FROM contractors WHERE user_id = ${userId} LIMIT 1`,
    );
    const contractor = contractorResult.rows?.[0] as any;

    if (!contractor) {
      res.json({ success: true, contracts: [], message: "Not a contractor" });
      return;
    }

    const contracts = await db.execute(
      sql`SELECT ac.*, u.username AS assigned_by_name
          FROM assigned_contracts ac
          LEFT JOIN users u ON u.id = ac.assigned_by
          WHERE ac.contractor_id = ${contractor.id}
          ORDER BY ac.created_at DESC`,
    );

    res.json({ success: true, contracts: contracts.rows });
  }),
);

/**
 * POST /api/contractor-pipeline/contracts/:id/accept
 * Contractor: accept an offered contract
 */
router.post(
  "/contracts/:id/accept",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const contractId = parseInt(req.params.id);
    const userId = Number((req as any).user.userId);

    // Verify ownership
    const contract = await db.execute(
      sql`SELECT ac.id, ac.status, ac.contractor_id, c.user_id
          FROM assigned_contracts ac
          JOIN contractors c ON c.id = ac.contractor_id
          WHERE ac.id = ${contractId} AND c.user_id = ${userId}
          LIMIT 1`,
    );

    if (!contract.rows?.length) {
      res.status(404).json({ success: false, message: "Contract not found" });
      return;
    }

    const row = contract.rows[0] as any;
    if (row.status !== "offered") {
      res.status(400).json({
        success: false,
        message: `Contract is already ${row.status}`,
      });
      return;
    }

    await db
      .update(schema.assignedContracts)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(schema.assignedContracts.id, contractId));

    res.json({ success: true, message: "Contract accepted" });
  }),
);

/**
 * POST /api/contractor-pipeline/contracts/:id/decline
 * Contractor: decline an offered contract
 */
router.post(
  "/contracts/:id/decline",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const contractId = parseInt(req.params.id);
    const userId = Number((req as any).user.userId);

    const contract = await db.execute(
      sql`SELECT ac.id, ac.status, c.user_id
          FROM assigned_contracts ac
          JOIN contractors c ON c.id = ac.contractor_id
          WHERE ac.id = ${contractId} AND c.user_id = ${userId}
          LIMIT 1`,
    );

    if (!contract.rows?.length) {
      res.status(404).json({ success: false, message: "Contract not found" });
      return;
    }

    const row = contract.rows[0] as any;
    if (row.status !== "offered") {
      res.status(400).json({
        success: false,
        message: `Contract is already ${row.status}`,
      });
      return;
    }

    await db
      .update(schema.assignedContracts)
      .set({ status: "declined" })
      .where(eq(schema.assignedContracts.id, contractId));

    res.json({ success: true, message: "Contract declined" });
  }),
);

/**
 * POST /api/contractor-pipeline/contracts/:id/complete
 * Contractor: mark an in-progress contract as completed
 */
router.post(
  "/contracts/:id/complete",
  requireAuth(),
  asyncHandler(async (req: Request, res: Response) => {
    const contractId = parseInt(req.params.id);
    const userId = Number((req as any).user.userId);

    const contract = await db.execute(
      sql`SELECT ac.id, ac.status, c.user_id
          FROM assigned_contracts ac
          JOIN contractors c ON c.id = ac.contractor_id
          WHERE ac.id = ${contractId} AND c.user_id = ${userId}
          LIMIT 1`,
    );

    if (!contract.rows?.length) {
      res.status(404).json({ success: false, message: "Contract not found" });
      return;
    }

    const row = contract.rows[0] as any;
    if (!["accepted", "in_progress"].includes(row.status)) {
      res.status(400).json({
        success: false,
        message: `Cannot complete a contract with status: ${row.status}`,
      });
      return;
    }

    await db
      .update(schema.assignedContracts)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(schema.assignedContracts.id, contractId));

    res.json({ success: true, message: "Contract marked as completed" });
  }),
);

export default router;
