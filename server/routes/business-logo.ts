/**
 * Business Logo Upload API
 * Handles logo uploads for businesses with tier gating.
 * Only paid tiers (essential, verified, max, enterprise) can upload logos.
 * Mounted at /api/business-logo
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ── Upload Directory ──────────────────────────────────────────────────────────
const LOGO_UPLOADS_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "logos")
    : path.resolve("uploads", "logos");

try {
  if (!fs.existsSync(LOGO_UPLOADS_DIR)) {
    fs.mkdirSync(LOGO_UPLOADS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn(`⚠️  Could not create logo uploads dir: ${err.message}`);
}

// ── Multer Configuration ──────────────────────────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGO_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max for logos
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/gif",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Accepted: JPEG, PNG, WebP, SVG, GIF",
        ) as any,
        false,
      );
    }
  },
});

// Tiers that allow logo upload (all paid tiers)
const PAID_TIERS = ["essential", "verified", "max", "enterprise", "premium"];

/**
 * POST /api/business-logo/upload
 * Upload a logo for the authenticated user's business.
 * Requires: paid tier subscription on the user OR the business.
 * Body: multipart/form-data with "logo" file field + "businessId" field.
 */
router.post(
  "/upload",
  requireAuth(),
  (req: Request, res: Response, next) => {
    logoUpload.single("logo")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: "Logo file too large. Maximum size is 5 MB.",
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
          .json({ success: false, message: "No logo file provided" });
      }

      // Verify the user owns the business
      const ownerCheck = await pool.query(
        `SELECT b.id, b.tier, b.name, u.subscription_tier
         FROM businesses b
         LEFT JOIN users u ON u.id = b.owner_id
         WHERE b.id = $1 AND b.owner_id = $2`,
        [businessId, userId],
      );

      if (ownerCheck.rows.length === 0) {
        // Remove uploaded file since we won't use it
        fs.unlink(req.file.path, () => {});
        return res.status(403).json({
          success: false,
          message: "You don't own this business or it doesn't exist.",
        });
      }

      const business = ownerCheck.rows[0];
      const userTier = (business.subscription_tier || "free").toLowerCase();
      const bizTier = (business.tier || "free").toLowerCase();

      // Check if either the user or business has a paid tier
      const hasPaidTier =
        PAID_TIERS.includes(userTier) || PAID_TIERS.includes(bizTier);

      if (!hasPaidTier) {
        // Remove uploaded file
        fs.unlink(req.file.path, () => {});
        return res.status(403).json({
          success: false,
          message:
            "Logo upload requires a paid subscription tier. Upgrade to Essential or higher to add your business logo.",
          requiredTier: "essential",
        });
      }

      // Delete old logo if exists
      const oldLogoResult = await pool.query(
        `SELECT logo_url FROM businesses WHERE id = $1`,
        [businessId],
      );
      const oldLogoUrl = oldLogoResult.rows[0]?.logo_url;
      if (oldLogoUrl) {
        const oldFilename = path.basename(oldLogoUrl);
        const oldPath = path.join(LOGO_UPLOADS_DIR, oldFilename);
        fs.unlink(oldPath, () => {}); // Non-blocking cleanup
      }

      // Build the URL path
      const logoUrl = `/api/business-logo/file/${path.basename(req.file.path)}`;

      // Update business with new logo_url
      await pool.query(`UPDATE businesses SET logo_url = $1 WHERE id = $2`, [
        logoUrl,
        businessId,
      ]);

      res.json({
        success: true,
        logoUrl,
        message: "Logo uploaded successfully!",
      });
    } catch (error: any) {
      console.error("[LOGO] Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload logo. Please try again.",
      });
    }
  },
);

/**
 * DELETE /api/business-logo/:businessId
 * Remove the logo from a business.
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

      // Verify ownership
      const ownerCheck = await pool.query(
        `SELECT logo_url FROM businesses WHERE id = $1 AND owner_id = $2`,
        [businessId, userId],
      );

      if (ownerCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You don't own this business or it doesn't exist.",
        });
      }

      const logoUrl = ownerCheck.rows[0].logo_url;
      if (logoUrl) {
        const filename = path.basename(logoUrl);
        const filePath = path.join(LOGO_UPLOADS_DIR, filename);
        fs.unlink(filePath, () => {}); // Delete file
      }

      await pool.query(`UPDATE businesses SET logo_url = NULL WHERE id = $1`, [
        businessId,
      ]);

      res.json({ success: true, message: "Logo removed successfully." });
    } catch (error: any) {
      console.error("[LOGO] Delete error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove logo.",
      });
    }
  },
);

/**
 * GET /api/business-logo/file/:filename
 * Serve a logo file statically.
 */
router.get("/file/:filename", (req: Request, res: Response) => {
  const { filename } = req.params;

  // Sanitize: only allow safe filenames
  if (/[^a-zA-Z0-9._-]/.test(filename)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid filename" });
  }

  const filePath = path.join(LOGO_UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "Logo not found" });
  }

  // Set caching headers
  res.set("Cache-Control", "public, max-age=86400"); // 24h cache
  res.sendFile(filePath);
});

export default router;
