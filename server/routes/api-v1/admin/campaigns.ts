import { Router } from "express";
import { db } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { adCampaigns, auditLogs } from "../../../../shared/schema";
import { eq, ilike, and, count, desc } from "drizzle-orm";

const router = Router();

/**
 * GET /api/v1/admin/campaigns
 * List all ad campaigns with pagination and filtering
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

      // Build where conditions
      const conditions = [];

      if (search) {
        conditions.push(ilike(adCampaigns.name, `%${search}%`));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Fetch total count and paginated data
      const [totalResult, data] = await Promise.all([
        db.select({ total: count() }).from(adCampaigns).where(where),
        db
          .select()
          .from(adCampaigns)
          .where(where)
          .orderBy(desc(adCampaigns.createdAt))
          .limit(limitNum)
          .offset(offset),
      ]);

      const total = totalResult[0]?.total || 0;

      // Explicitly return 200 with data, even if empty
      res.status(200).json({
        success: true,
        status: 200,
        data: data || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("🔴 Campaigns GET Error:", error);
      res.status(500).json({
        success: false,
        status: 500,
        error: {
          code: "FETCH_ERROR",
          message: "Failed to fetch campaigns - check server logs",
        },
      });
    }
  }),
);

/**
 * POST /api/v1/admin/campaigns
 * Create a new campaign
 */
router.post(
  "/",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    try {
      const {
        name,
        businessId,
        objective,
        budget,
        startDate,
        endDate,
        status,
      } = req.body;

      // Validate required fields
      if (!name || !businessId) {
        return res.status(400).json({
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Name and businessId are required",
          },
        });
      }

      console.log("📝 Creating campaign with data:", req.body);

      const [campaign] = await db
        .insert(adCampaigns)
        .values({
          name,
          businessId: parseInt(businessId),
          budget: budget ? String(parseFloat(budget).toFixed(2)) : "0.00",
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          status: status || "active",
        })
        .returning();

      if (!campaign) {
        throw new Error("Insert returned no data - check database connection");
      }

      console.log("✅ Campaign created successfully:", campaign.id);

      // Audit log
      await db.insert(auditLogs).values({
        action: "CREATE",
        entityType: "campaign",
        entityId: String(campaign.id),
        changes: {
          name: campaign.name,
          businessId: campaign.businessId,
          budget: campaign.budget,
        },
      });

      res.status(201).json({
        success: true,
        status: 201,
        data: campaign,
        metadata: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("🔴 Campaign POST Error:", error);
      res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "INSERT_ERROR",
          message:
            "Failed to create campaign - check data types and database logs",
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }),
);

/**
 * GET /api/v1/admin/campaigns/:id
 * Get a specific campaign
 */
router.get(
  "/:id",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [campaign] = await db
      .select()
      .from(adCampaigns)
      .where(eq(adCampaigns.id, String(id)))
      .limit(1);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Campaign not found",
        },
      });
    }

    res.json({
      success: true,
      status: 200,
      data: campaign,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * PUT /api/v1/admin/campaigns/:id
 * Update a campaign
 */
router.put(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        businessId,
        objective,
        budget,
        startDate,
        endDate,
        status,
      } = req.body;
      const campaignId = String(id);

      // Validate required fields
      if (!name || !businessId) {
        return res.status(400).json({
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Name and businessId are required",
          },
        });
      }

      // Check if campaign exists
      const [existing] = await db
        .select()
        .from(adCampaigns)
        .where(eq(adCampaigns.id, campaignId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: {
            code: "NOT_FOUND",
            message: `Campaign with ID ${campaignId} not found`,
          },
        });
      }

      console.log("📝 Updating campaign ID:", campaignId);

      const [updatedCampaign] = await db
        .update(adCampaigns)
        .set({
          name,
          businessId: parseInt(businessId),
          budget: budget ? String(parseFloat(budget).toFixed(2)) : "0.00",
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          status: status || "active",
        })
        .where(eq(adCampaigns.id, campaignId))
        .returning();

      if (!updatedCampaign) {
        throw new Error("Update returned no data");
      }

      console.log("✅ Campaign updated successfully:", campaignId);

      // Audit log
      await db.insert(auditLogs).values({
        action: "UPDATE",
        entityType: "campaign",
        entityId: campaignId,
        changes: {
          before: {
            name: existing.name,
            budget: existing.budget,
            status: existing.status,
          },
          after: {
            name: updatedCampaign.name,
            budget: updatedCampaign.budget,
            status: updatedCampaign.status,
          },
        },
      });

      res.json({
        success: true,
        status: 200,
        data: updatedCampaign,
        metadata: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("🔴 Campaign PUT Error:", error);
      res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "UPDATE_ERROR",
          message: "Failed to update campaign",
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }),
);

/**
 * DELETE /api/v1/admin/campaigns/:id
 * Delete a campaign
 */
router.delete(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;
      const campaignId = String(id);

      // Check if campaign exists
      const [campaign] = await db
        .select()
        .from(adCampaigns)
        .where(eq(adCampaigns.id, campaignId))
        .limit(1);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          status: 404,
          error: {
            code: "NOT_FOUND",
            message: `Campaign with ID ${campaignId} not found`,
          },
        });
      }

      console.log("🗑️ Deleting campaign ID:", campaignId);

      const [deletedCampaign] = await db
        .delete(adCampaigns)
        .where(eq(adCampaigns.id, campaignId))
        .returning();

      if (!deletedCampaign) {
        throw new Error("Delete returned no data");
      }

      console.log("✅ Campaign deleted successfully:", campaignId);

      // Audit log
      await db.insert(auditLogs).values({
        action: "DELETE",
        entityType: "campaign",
        entityId: campaignId,
        changes: {
          deleted: {
            id: campaign.id,
            name: campaign.name,
            budget: campaign.budget,
            businessId: campaign.businessId,
          },
        },
      });

      res.json({
        success: true,
        status: 200,
        data: deletedCampaign,
        metadata: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("🔴 Campaign DELETE Error:", error);
      res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "DELETE_ERROR",
          message: "Failed to delete campaign",
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }),
);

export default router;
