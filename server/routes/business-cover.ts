/**
 * Business Cover Photo API
 * Banner photo for a business profile, stored in PostgreSQL like the logo.
 * Uploads follow the logo rules: the owner, on a paid tier once subscriptions
 * are on sale. Mounted at /api/business-cover
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { pool } from "../db";
import { publicBusinessVisibilitySql } from "../utils/business-visibility";
import { commercialSubscriptionsEnabled } from "../utils/commercial-gates";
import { requireAuth } from "../middleware/auth";
import {
  PAID_TIERS,
  identify,
  isStaff,
  validateLogoFile,
} from "./business-logo";

const router = Router();

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    try {
      validateLogoFile(file);
      cb(null, true);
    } catch (error: any) {
      cb(new Error(error.message));
    }
  },
});

/**
 * POST /api/business-cover/upload
 * Body: multipart/form-data with "cover" file field + "businessId" field.
 */
router.post(
  "/upload",
  requireAuth(),
  (req: Request, res: Response, next) => {
    coverUpload.single("cover")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: "Cover photo too large. Maximum size is 5 MB.",
          });
        }
        return res.status(400).json({ success: false, message: err.message });
      }
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const businessId = req.body.businessId;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      if (!businessId) {
        return res
          .status(400)
          .json({ success: false, message: "businessId is required" });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No cover photo provided" });
      }

      const ownerCheck = await pool.query(
        `SELECT b.id, b.tier, u.subscription_tier
         FROM businesses b
         LEFT JOIN users u ON u.id = $2
         WHERE b.id = $1
           AND (b.owner_id = $2 OR EXISTS (
             SELECT 1 FROM business_owners bo
              WHERE bo.business_id = b.id AND bo.user_id = $2
                AND bo.status = 'active'
           ))`,
        [businessId, userId],
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You don't own this business or it doesn't exist.",
        });
      }

      const business = ownerCheck.rows[0];
      const userTier = (business.subscription_tier || "free").toLowerCase();
      const bizTier = (business.tier || "free").toLowerCase();
      const hasPaidTier =
        PAID_TIERS.includes(userTier) || PAID_TIERS.includes(bizTier);

      if (commercialSubscriptionsEnabled() && !hasPaidTier) {
        return res.status(403).json({
          success: false,
          message:
            "Cover photo requires a paid subscription tier. Upgrade to Essential or higher to add a cover photo.",
          requiredTier: "essential",
        });
      }

      // A new address per upload, so a replaced cover is not hidden by the cache.
      const coverUrl = `/api/business-cover/file/${businessId}?v=${Date.now()}`;

      await pool.query(
        `UPDATE businesses
         SET cover_url = $1, cover_data = $2, cover_mime = $3
         WHERE id = $4`,
        [coverUrl, req.file.buffer, req.file.mimetype, businessId],
      );

      res.json({
        success: true,
        coverUrl,
        message: "Cover photo uploaded successfully!",
      });
    } catch (error: any) {
      console.error("[COVER] Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload cover photo. Please try again.",
      });
    }
  },
);

/**
 * DELETE /api/business-cover/:businessId
 * Remove the cover photo from a business.
 */
router.delete(
  "/:businessId",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const { businessId } = req.params;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Authentication required" });
      }

      const ownerCheck = await pool.query(
        `SELECT b.id FROM businesses b
          WHERE b.id = $1
            AND (b.owner_id = $2 OR EXISTS (
              SELECT 1 FROM business_owners bo
               WHERE bo.business_id = b.id AND bo.user_id = $2
                 AND bo.status = 'active'
            ))`,
        [businessId, userId],
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You don't own this business or it doesn't exist.",
        });
      }

      await pool.query(
        `UPDATE businesses
         SET cover_url = NULL, cover_data = NULL, cover_mime = NULL
         WHERE id = $1`,
        [businessId],
      );

      res.json({ success: true, message: "Cover photo removed." });
    } catch (error: any) {
      console.error("[COVER] Delete error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove cover photo.",
      });
    }
  },
);

/**
 * GET /api/business-cover/file/:businessId
 * Serve the stored cover photo. Visibility matches the logo: public once the
 * business is listed, otherwise only the owner and the team.
 */
router.get("/file/:businessId", async (req: Request, res: Response) => {
  const { businessId } = req.params;
  if (!/^\d+$/.test(businessId)) {
    return res
      .status(404)
      .json({ success: false, message: "Cover photo not found" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT b.cover_data, b.cover_mime, b.owner_id,
              (${publicBusinessVisibilitySql("b")}) AS is_public
         FROM businesses b
        WHERE b.id = $1`,
      [businessId],
    );
    const cover = rows[0];
    const notFound = () =>
      res
        .status(404)
        .json({ success: false, message: "Cover photo not found" });
    if (!cover?.cover_data) return notFound();

    if (!cover.is_public) {
      const user = await identify(req, res);
      if (user === null) return;
      const membership = user
        ? await pool.query(
            `SELECT EXISTS (
               SELECT 1 FROM business_owners bo
                WHERE bo.business_id = $1 AND bo.user_id = $2
                  AND bo.status = 'active'
             ) AS is_owner`,
            [businessId, Number(user.id)],
          )
        : null;
      if (
        !user ||
        (String(cover.owner_id) !== user.id &&
          membership?.rows[0]?.is_owner !== true &&
          !isStaff(user.role))
      ) {
        return notFound();
      }
    }

    res.set({
      "Cache-Control": cover.is_public
        ? "public, max-age=86400"
        : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    });
    res.type(cover.cover_mime || "application/octet-stream");
    res.send(cover.cover_data);
  } catch (error) {
    console.error("[COVER] Database read error:", error);
    res
      .status(500)
      .json({ success: false, message: "Cover photo unavailable" });
  }
});

export default router;
