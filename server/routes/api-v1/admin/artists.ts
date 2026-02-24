import { Router } from "express";
import { db } from "../../../db";
import { requireAuth } from "../../../middleware/auth";
import { asyncHandler } from "../../../middleware/asyncHandler";
import { artists, auditLogs } from "../../../../shared/schema";
import { eq, ilike, and, count, desc } from "drizzle-orm";

const router = Router();

/**
 * GET /api/v1/admin/artists
 * List all artists with pagination and filtering
 */
router.get(
  "/",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { page = "1", limit = "20", search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(ilike(artists.stageName, `%${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch total count and paginated data
    const [totalResult, data] = await Promise.all([
      db.select({ total: count() }).from(artists).where(where),
      db
        .select()
        .from(artists)
        .where(where)
        .orderBy(desc(artists.id))
        .limit(limitNum)
        .offset(offset),
    ]);

    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      status: 200,
      data,
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
  }),
);

/**
 * POST /api/v1/admin/artists
 * Create a new artist
 */
router.post(
  "/",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const { stageName, genre, labelStatus, spotifyUrl, businessId, userId } = req.body;

    // Validate required fields
    if (!stageName) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Stage name is required",
        },
      });
    }

    const [artist] = await db
      .insert(artists)
      .values({
        stageName,
        genre,
        labelStatus,
        spotifyUrl,
        businessId,
        userId,
      })
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      action: "CREATE",
      entityType: "artist",
      entityId: String(artist.id),
    });

    res.status(201).json({
      success: true,
      status: 201,
      data: artist,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * GET /api/v1/admin/artists/:id
 * Get a specific artist
 */
router.get(
  "/:id",
  requireAuth(["admin", "moderator"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const artistId = parseInt(id);

    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Artist not found",
        },
      });
    }

    res.json({
      success: true,
      status: 200,
      data: artist,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * PUT /api/v1/admin/artists/:id
 * Update an artist
 */
router.put(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { stageName, genre, labelStatus, spotifyUrl, businessId, userId } = req.body;
    const artistId = parseInt(id);

    // Validate required fields
    if (!stageName) {
      return res.status(400).json({
        success: false,
        status: 400,
        error: {
          code: "VALIDATION_ERROR",
          message: "Stage name is required",
        },
      });
    }

    // Check if artist exists
    const existing = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Artist not found",
        },
      });
    }

    const [updatedArtist] = await db
      .update(artists)
      .set({
        stageName,
        genre,
        labelStatus,
        spotifyUrl,
        businessId,
        userId,
      })
      .where(eq(artists.id, artistId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      action: "UPDATE",
      entityType: "artist",
      entityId: String(artistId),
    });

    res.json({
      success: true,
      status: 200,
      data: updatedArtist,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

/**
 * DELETE /api/v1/admin/artists/:id
 * Delete an artist
 */
router.delete(
  "/:id",
  requireAuth(["admin"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const artistId = parseInt(id);

    // Check if artist exists
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Artist not found",
        },
      });
    }

    const [deletedArtist] = await db
      .delete(artists)
      .where(eq(artists.id, artistId))
      .returning();

    // Audit log
    await db.insert(auditLogs).values({
      action: "DELETE",
      entityType: "artist",
      entityId: String(artistId),
    });

    res.json({
      success: true,
      status: 200,
      data: deletedArtist,
      metadata: { timestamp: new Date().toISOString() },
    });
  }),
);

export default router;