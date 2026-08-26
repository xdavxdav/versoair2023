import { Router } from "express";
import { db, pool } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { auditLogs } from "../../../../shared/schema";

const router = Router();

const campaignSelect = `
  SELECT id, business_id, name, objective, daily_budget, status,
         start_date, end_date, impressions, clicks, conversions,
         created_at, created_at AS updated_at
  FROM ad_campaigns`;

function toCampaign(row: any) {
  return {
    id: String(row.id),
    businessId: row.business_id,
    name: row.name,
    description: row.objective || null,
    objective: row.objective || null,
    budget: String(row.daily_budget ?? "0"),
    dailyBudget: String(row.daily_budget ?? "0"),
    status: row.status || "active",
    startDate: row.start_date,
    endDate: row.end_date,
    impressions: row.impressions || 0,
    clicks: row.clicks || 0,
    conversions: row.conversions || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function parseCampaignId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseBusinessId(value: unknown): number | null {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function writeAudit(action: string, campaignId: string, changes: any) {
  try {
    await db.insert(auditLogs).values({ action, entityType: "campaign", entityId: campaignId, changes });
  } catch (error) {
    console.warn("Campaign audit log unavailable:", (error as Error).message);
  }
}

/**
 * GET /api/v1/admin/campaigns
 * List all ad campaigns with pagination and filtering
 * Requires at least verified tier for business owners
 */
router.get(
  "/",
  requireAuth(["admin", "moderator", "business_owner"]),
  asyncHandler(async (req, res) => {
    try {
      const { page = "1", limit = "20", search } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const offset = (pageNum - 1) * limitNum;
      const searchValue = typeof search === "string" ? search.trim() : "";
      const filter = searchValue ? " WHERE name ILIKE $1" : "";
      const filterParams = searchValue ? [`${searchValue}%`] : [];
      const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM ad_campaigns${filter}`, filterParams);
      const dataResult = await pool.query(
        `${campaignSelect}${filter} ORDER BY created_at DESC NULLS LAST LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}`,
        [...filterParams, limitNum, offset],
      );
      const total = totalResult.rows[0]?.total || 0;
      const totalPages = Math.ceil(total / limitNum);

      // Explicitly return 200 with data, even if empty
      res.status(200).json({
        success: true,
        status: 200,
        data: dataResult.rows.map(toCampaign),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
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
        dailyBudget,
        dailyBudget,
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

      const parsedBusinessId = parseBusinessId(businessId);
      if (!parsedBusinessId) {
        return res.status(400).json({
          success: false,
          status: 400,
          error: { code: "VALIDATION_ERROR", message: "businessId must be a positive integer" },
        });
      }

      const budgetValue = Number.parseFloat(String(budget ?? dailyBudget ?? "0"));
      const result = await pool.query(
        `INSERT INTO ad_campaigns
           (business_id, name, objective, daily_budget, status, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, business_id, name, objective, daily_budget, status,
                   start_date, end_date, impressions, clicks, conversions,
                   created_at, created_at AS updated_at`,
        [
          parsedBusinessId,
          name.trim(),
          objective || null,
          Number.isFinite(budgetValue) && budgetValue >= 0 ? budgetValue : 0,
          status || "active",
          startDate || new Date().toISOString().slice(0, 10),
          endDate || null,
        ],
      );
      const campaign = result.rows[0];

      if (!campaign) {
        throw new Error("Insert returned no data - check database connection");
      }

      console.log("✅ Campaign created successfully:", campaign.id);

      // Audit log
      await writeAudit("CREATE", String(campaign.id), {
        name: campaign.name,
        businessId: campaign.business_id,
        budget: campaign.daily_budget,
      });

      res.status(201).json({
        success: true,
        status: 201,
        data: toCampaign(campaign),
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
    const campaignId = parseCampaignId(req.params.id);
    if (!campaignId) {
      return res.status(400).json({ success: false, status: 400, error: { code: "INVALID_ID", message: "Invalid campaign ID" } });
    }
    const result = await pool.query(`${campaignSelect} WHERE id = $1 LIMIT 1`, [campaignId]);
    const campaign = result.rows[0];

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
      data: toCampaign(campaign),
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
      const campaignId = parseCampaignId(id);

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

      const parsedBusinessId = parseBusinessId(businessId);
      if (!campaignId || !parsedBusinessId) {
        return res.status(400).json({ success: false, status: 400, error: { code: "VALIDATION_ERROR", message: "Invalid campaign or business ID" } });
      }

      const existingResult = await pool.query(`${campaignSelect} WHERE id = $1 LIMIT 1`, [campaignId]);
      const existing = existingResult.rows[0];

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

      const budgetValue = Number.parseFloat(String(budget ?? dailyBudget ?? "0"));
      const updatedResult = await pool.query(
        `UPDATE ad_campaigns
         SET business_id = $1, name = $2, objective = $3, daily_budget = $4,
             status = $5, start_date = $6, end_date = $7
         WHERE id = $8
         RETURNING id, business_id, name, objective, daily_budget, status,
                   start_date, end_date, impressions, clicks, conversions,
                   created_at, created_at AS updated_at`,
        [parsedBusinessId, name.trim(), objective || null, Number.isFinite(budgetValue) && budgetValue >= 0 ? budgetValue : 0, status || "active", startDate || existing.start_date, endDate || null, campaignId],
      );
      const updatedCampaign = updatedResult.rows[0];

      if (!updatedCampaign) {
        throw new Error("Update returned no data");
      }

      console.log("✅ Campaign updated successfully:", campaignId);

      // Audit log
      await writeAudit("UPDATE", String(campaignId), { before: toCampaign(existing), after: toCampaign(updatedCampaign) });

      res.json({
        success: true,
        status: 200,
        data: toCampaign(updatedCampaign),
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
      const campaignId = parseCampaignId(req.params.id);
      if (!campaignId) {
        return res.status(400).json({ success: false, status: 400, error: { code: "INVALID_ID", message: "Invalid campaign ID" } });
      }
      const existingResult = await pool.query(`${campaignSelect} WHERE id = $1 LIMIT 1`, [campaignId]);
      const campaign = existingResult.rows[0];

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

      const deletedResult = await pool.query("DELETE FROM ad_campaigns WHERE id = $1 RETURNING id", [campaignId]);
      const deletedCampaign = deletedResult.rows[0];

      if (!deletedCampaign) {
        throw new Error("Delete returned no data");
      }

      console.log("✅ Campaign deleted successfully:", campaignId);

      // Audit log
      await writeAudit("DELETE", String(campaignId), { deleted: toCampaign(campaign) });

      res.json({
        success: true,
        status: 200,
        data: { id: String(deletedCampaign.id) },
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
