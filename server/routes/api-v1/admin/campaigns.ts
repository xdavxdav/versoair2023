import { Router, type Response } from "express";
import { db, pool } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { auditLogs } from "../../../../shared/schema";

const router = Router();

// Mirrors the real `ad_campaigns` table (shared/schema.ts, ensure-tables.ts):
// uuid id, `description` + `budget` columns, real `updated_at`. The API keeps
// returning `objective` / `dailyBudget` aliases for the existing admin UIs.
const CAMPAIGN_COLUMNS = `id, business_id, name, description, budget, status,
         start_date, end_date, impressions, clicks, conversions,
         created_at, updated_at`;

// A scalar subquery (not a JOIN) so `id`, `name`, `status` ... stay unambiguous in the shared filters.
const CAMPAIGN_RESULT_COLUMNS = `${CAMPAIGN_COLUMNS},
         (SELECT b.name FROM businesses b WHERE b.id = ad_campaigns.business_id LIMIT 1) AS business_name`;

const campaignSelect = `SELECT ${CAMPAIGN_RESULT_COLUMNS} FROM ad_campaigns`;

function toCampaign(row: any) {
  const budget = String(row.budget ?? "0");
  return {
    id: String(row.id),
    businessId: row.business_id,
    businessName: row.business_name ?? null,
    name: row.name,
    description: row.description || null,
    objective: row.description || null,
    budget,
    dailyBudget: budget,
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCampaignId(value: string): string | null {
  return UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function parseBusinessId(value: unknown): number | null {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: string,
) {
  return res.status(status).json({
    success: false,
    status,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

// numeric(12,2) holds at most 9,999,999,999.99
const MAX_BUDGET = 9_999_999_999.99;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

function parseBudget(raw: unknown): Parsed<number | undefined> {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: undefined };
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || value < 0 || value > MAX_BUDGET) {
    return {
      ok: false,
      message: "budget must be a number between 0 and 9999999999.99",
    };
  }
  return { ok: true, value };
}

// undefined = not provided, null = explicitly cleared.
function parseDate(raw: unknown, field: string): Parsed<string | null | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null || raw === "") return { ok: true, value: null };
  const text = String(raw).trim();
  if (!ISO_DATE_PATTERN.test(text) || Number.isNaN(Date.parse(text))) {
    return { ok: false, message: `${field} must be a valid date` };
  }
  return { ok: true, value: text };
}

interface CampaignInput {
  name: string;
  businessId: number;
  description: string | null | undefined;
  budget: number | undefined;
  status: string | undefined;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
}

function parseCampaignBody(body: any): Parsed<CampaignInput> {
  const { name, businessId, objective, description, budget, dailyBudget, status } =
    body ?? {};
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName || !businessId) {
    return { ok: false, message: "Name and businessId are required" };
  }
  const parsedBusinessId = parseBusinessId(businessId);
  if (!parsedBusinessId) {
    return { ok: false, message: "businessId must be a positive integer" };
  }

  const parsedBudget = parseBudget(budget ?? dailyBudget);
  if (!parsedBudget.ok) return parsedBudget;
  const startDate = parseDate(body?.startDate, "startDate");
  if (!startDate.ok) return startDate;
  const endDate = parseDate(body?.endDate, "endDate");
  if (!endDate.ok) return endDate;

  const rawDescription = description ?? objective;
  const parsedDescription =
    rawDescription === undefined
      ? undefined
      : typeof rawDescription === "string" && rawDescription.trim()
        ? rawDescription.trim()
        : null;

  const trimmedStatus = typeof status === "string" ? status.trim() : "";
  if (status !== undefined && status !== null && (!trimmedStatus || trimmedStatus.length > 32)) {
    return { ok: false, message: "status must be a non-empty string of at most 32 characters" };
  }

  return {
    ok: true,
    value: {
      name: trimmedName,
      businessId: parsedBusinessId,
      description: parsedDescription,
      budget: parsedBudget.value,
      status: trimmedStatus || undefined,
      startDate: startDate.value,
      endDate: endDate.value,
    },
  };
}

function toMillis(value: string | Date | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const millis = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(millis) ? null : millis;
}

async function businessExists(businessId: number): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM businesses WHERE id = $1 LIMIT 1",
    [businessId],
  );
  return result.rows.length > 0;
}

async function writeAudit(action: string, campaignId: string, changes: any) {
  try {
    await db
      .insert(auditLogs)
      .values({
        action,
        entityType: "campaign",
        entityId: campaignId,
        changes,
      });
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
      const limitNum = Math.min(
        100,
        Math.max(1, parseInt(limit as string, 10) || 20),
      );
      const offset = (pageNum - 1) * limitNum;
      const searchValue = typeof search === "string" ? search.trim() : "";
      const filter = searchValue ? " WHERE name ILIKE $1" : "";
      const filterParams = searchValue ? [`${searchValue}%`] : [];
      const totalResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM ad_campaigns${filter}`,
        filterParams,
      );
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
      const parsed = parseCampaignBody(req.body);
      if (!parsed.ok) {
        return sendError(res, 400, "VALIDATION_ERROR", parsed.message);
      }
      const input = parsed.value;

      const startDate = input.startDate ?? new Date().toISOString();
      if (
        input.endDate &&
        (toMillis(input.endDate) ?? 0) < (toMillis(startDate) ?? 0)
      ) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "endDate must not be before startDate",
        );
      }

      if (!(await businessExists(input.businessId))) {
        return sendError(res, 404, "BUSINESS_NOT_FOUND", "Business not found");
      }

      const result = await pool.query(
        `INSERT INTO ad_campaigns
           (business_id, name, description, budget, status, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${CAMPAIGN_RESULT_COLUMNS}`,
        [
          input.businessId,
          input.name,
          input.description ?? null,
          input.budget ?? 0,
          input.status || "draft",
          startDate,
          input.endDate ?? null,
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
        budget: campaign.budget,
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
      return res
        .status(400)
        .json({
          success: false,
          status: 400,
          error: { code: "INVALID_ID", message: "Invalid campaign ID" },
        });
    }
    const result = await pool.query(`${campaignSelect} WHERE id = $1 LIMIT 1`, [
      campaignId,
    ]);
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
      const campaignId = parseCampaignId(req.params.id);
      if (!campaignId) {
        return sendError(res, 400, "INVALID_ID", "Invalid campaign ID");
      }

      const parsed = parseCampaignBody(req.body);
      if (!parsed.ok) {
        return sendError(res, 400, "VALIDATION_ERROR", parsed.message);
      }
      const input = parsed.value;

      const existingResult = await pool.query(
        `${campaignSelect} WHERE id = $1 LIMIT 1`,
        [campaignId],
      );
      const existing = existingResult.rows[0];

      if (!existing) {
        return sendError(
          res,
          404,
          "NOT_FOUND",
          `Campaign with ID ${campaignId} not found`,
        );
      }

      // Fields that are not sent keep their stored value; endDate/description
      // sent as null/"" are cleared. start_date is NOT NULL so it is never cleared.
      const startDate = input.startDate ?? existing.start_date;
      const endDate =
        input.endDate === undefined ? existing.end_date : input.endDate;
      if (
        endDate &&
        startDate &&
        (toMillis(endDate) ?? 0) < (toMillis(startDate) ?? 0)
      ) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "endDate must not be before startDate",
        );
      }

      if (!(await businessExists(input.businessId))) {
        return sendError(res, 404, "BUSINESS_NOT_FOUND", "Business not found");
      }

      console.log("📝 Updating campaign ID:", campaignId);

      const updatedResult = await pool.query(
        `UPDATE ad_campaigns
         SET business_id = $1, name = $2, description = $3, budget = $4,
             status = $5, start_date = $6, end_date = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING ${CAMPAIGN_RESULT_COLUMNS}`,
        [
          input.businessId,
          input.name,
          input.description === undefined
            ? existing.description
            : input.description,
          input.budget ?? existing.budget,
          input.status || existing.status || "active",
          startDate,
          endDate,
          campaignId,
        ],
      );
      const updatedCampaign = updatedResult.rows[0];

      if (!updatedCampaign) {
        throw new Error("Update returned no data");
      }

      console.log("✅ Campaign updated successfully:", campaignId);

      // Audit log
      await writeAudit("UPDATE", String(campaignId), {
        before: toCampaign(existing),
        after: toCampaign(updatedCampaign),
      });

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
        return res
          .status(400)
          .json({
            success: false,
            status: 400,
            error: { code: "INVALID_ID", message: "Invalid campaign ID" },
          });
      }
      const existingResult = await pool.query(
        `${campaignSelect} WHERE id = $1 LIMIT 1`,
        [campaignId],
      );
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

      const deletedResult = await pool.query(
        "DELETE FROM ad_campaigns WHERE id = $1 RETURNING id",
        [campaignId],
      );
      const deletedCampaign = deletedResult.rows[0];

      if (!deletedCampaign) {
        throw new Error("Delete returned no data");
      }

      console.log("✅ Campaign deleted successfully:", campaignId);

      // Audit log
      await writeAudit("DELETE", String(campaignId), {
        deleted: toCampaign(campaign),
      });

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
