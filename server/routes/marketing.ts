/**
 * Marketing Platform API Routes
 * Handles: Ad Journal, Marketing Packs, Print Services, Cart, Orders, Newsletters
 * Mounted at /api/marketing
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth, optionalAuth, requireOwner } from "../middleware/auth";
import { newsletterLimiter } from "../middleware/rate-limiter";
import { queueNewsletterCampaign } from "../services/newsletter-delivery";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateJournalPDF } from "../services/journal-pdf-generator";
import {
  basicValidation,
  advancedValidation,
} from "../services/print-validator";
import { requireMarketingCheckout } from "../utils/commercial-gates";
import { getPublicBaseUrl } from "../utils/base-url";
import { getStripeClient } from "../utils/stripe-client";
import { getPaymentsModeStatus } from "../utils/payments-mode";
import {
  createMarketingCheckoutHandler,
  findSellableProduct,
  isSellableItemType,
  MAX_LINE_QUANTITY,
  parseItemId,
  parseQuantity,
} from "../services/marketing-checkout";

import { numericRouteParam } from "../middleware/numeric-route-param";

const router = Router();
router.param("id", numericRouteParam);

// Operational accounts are allowed to administer the marketplace, but their
// test/internal content must not be presented as a public seller offering.
const INTERNAL_MARKETPLACE_USERNAMES = ["joel_007", "admin_025"] as const;
const INTERNAL_MARKETPLACE_ACCOUNT_EXCLUSION = `
  AND NOT EXISTS (
    SELECT 1
    FROM users marketplace_owner
    WHERE marketplace_owner.id = jl.user_id
      AND (
        LOWER(COALESCE(marketplace_owner.username, '')) IN ('${INTERNAL_MARKETPLACE_USERNAMES.join("', '")}')
        OR LOWER(COALESCE(marketplace_owner.gate_username, '')) IN ('${INTERNAL_MARKETPLACE_USERNAMES.join("', '")}')
      )
  )`;

// ──────────────────────────────────────────────────────────────────────────────
// Multer: print file uploads
// ──────────────────────────────────────────────────────────────────────────────
const PRINT_UPLOADS_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "print")
    : path.resolve("uploads", "print");

try {
  if (!fs.existsSync(PRINT_UPLOADS_DIR)) {
    fs.mkdirSync(PRINT_UPLOADS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn(`⚠️  Could not create print uploads dir: ${err.message}`);
}

const allowedPrintTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/svg+xml",
  "application/postscript",
]);
const allowedPrintExtensions = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".svg",
  ".eps",
  ".ai",
]);

function sanitizeStoredName(originalName: string): string {
  const safe = (originalName || "print-file")
    .replace(/[\\/]+/g, "/")
    .split("/")
    .pop()!
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .trim();

  if (!safe || safe === "." || safe === "..") return "print-file.bin";
  return safe.length > 150 ? safe.slice(0, 150) : safe;
}

function validatePrintFile(file: Express.Multer.File) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (!file.originalname || file.originalname.includes("..")) {
    throw new Error("Invalid file name.");
  }
  if (
    !allowedPrintTypes.has(file.mimetype) ||
    !allowedPrintExtensions.has(extension)
  ) {
    throw new Error(`Unsupported print file format: ${file.mimetype}`);
  }
  return sanitizeStoredName(file.originalname);
}

const printUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB for print files
  fileFilter: (_req, file, cb) => {
    try {
      validatePrintFile(file);
      cb(null, true);
    } catch (error: any) {
      cb(new Error(error.message));
    }
  },
});

// ──────────────────────────────────────────────────────────────────────────────
// Multer: marketplace listing media uploads (images + videos)
// ──────────────────────────────────────────────────────────────────────────────
const LISTING_UPLOADS_DIR =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "listings")
    : path.resolve("uploads", "listings");

try {
  if (!fs.existsSync(LISTING_UPLOADS_DIR)) {
    fs.mkdirSync(LISTING_UPLOADS_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn(`⚠️  Could not create listing uploads dir: ${err.message}`);
}

const ALLOWED_LISTING_IMAGES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
const ALLOWED_LISTING_VIDEOS = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
]);
const ALLOWED_LISTING_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
]);
const ALLOWED_LISTING_VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
]);

function validateListingMedia(file: Express.Multer.File) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const isImage = ALLOWED_LISTING_IMAGES.has(file.mimetype);
  const isVideo = ALLOWED_LISTING_VIDEOS.has(file.mimetype);
  const isImageExtAllowed = ALLOWED_LISTING_IMAGE_EXTENSIONS.has(extension);
  const isVideoExtAllowed = ALLOWED_LISTING_VIDEO_EXTENSIONS.has(extension);

  if (!file.originalname || file.originalname.includes("..")) {
    throw new Error("Invalid file name.");
  }

  if (
    (!isImage && !isVideo) ||
    (isImage && !isImageExtAllowed) ||
    (isVideo && !isVideoExtAllowed)
  ) {
    throw new Error(
      `Unsupported file format: ${file.mimetype}. Accepted: JPG, PNG, WebP, GIF, MP4, WebM, MOV`,
    );
  }

  return sanitizeStoredName(file.originalname);
}

const listingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max per file
  fileFilter: (_req, file, cb) => {
    try {
      validateListingMedia(file);
      cb(null, true);
    } catch (error: any) {
      cb(new Error(error.message));
    }
  },
}).fields([
  { name: "images", maxCount: 10 },
  { name: "videos", maxCount: 3 },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// 📰  AD JOURNAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/marketing/journal/listings
 * Public: Browse active journal listings (with optional filters)
 */
router.get("/journal/listings", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { category, status, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT jl.*, COALESCE(u.display_name, u.username) as owner_name
                 FROM ad_journal_listings jl
                 LEFT JOIN users u ON jl.user_id = u.id
                 WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (category) {
      query += ` AND jl.category = $${idx++}`;
      params.push(category);
    }

    // Default to active listings for public view
    const isStaff = ["admin", "moderator", "superuser"].includes(req.user?.role || "");
    const filterStatus = isStaff && typeof status === "string" ? status : "active";
    query += ` AND jl.status = $${idx++}`;
    params.push(filterStatus);
    query += INTERNAL_MARKETPLACE_ACCOUNT_EXCLUSION;

    query += ` ORDER BY (jl.type = 'premium') DESC, jl.created_at DESC`;
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM ad_journal_listings jl WHERE status = $1`;
    const countParams: any[] = [filterStatus];
    if (category) {
      countQuery += ` AND category = $2`;
      countParams.push(category);
    }
    countQuery += INTERNAL_MARKETPLACE_ACCOUNT_EXCLUSION;
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(
          parseInt(countResult.rows[0].count) / limitNum,
        ),
      },
    });
  } catch (error: any) {
    console.error("[MARKETING] Journal listings error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/journal/listings
 * Auth: Create a new ad listing with optional image/video uploads
 * Accepts multipart/form-data with fields: images[] (up to 10), videos[] (up to 3)
 */
router.post(
  "/journal/listings",
  requireAuth(),
  (req: Request, res: Response, next: Function) => {
    listingUpload(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        return res
          .status(400)
          .json({ success: false, error: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const {
        title,
        description,
        category,
        contact_phone,
        contact_email,
        address,
        city,
        website_url,
      } = req.body;

      if (!title || !category) {
        return res.status(400).json({
          success: false,
          error: "Title and category are required",
        });
      }

      // Collect uploaded file paths — persisted in Neon DB
      const files = req.files as
        | Record<string, Express.Multer.File[]>
        | undefined;
      const imagePaths: string[] = [];
      for (const f of files?.images || []) {
        const mRes = await pool.query(
          `INSERT INTO marketplace_media (user_id, file_name, mime_type, file_data, file_size, media_type)
           VALUES ($1, $2, $3, $4, $5, 'image') RETURNING id`,
          [Number(userId), f.originalname, f.mimetype, f.buffer, f.size],
        );
        imagePaths.push(`/api/marketing/media/${mRes.rows[0].id}`);
      }
      const videoPaths: string[] = [];
      for (const f of files?.videos || []) {
        const mRes = await pool.query(
          `INSERT INTO marketplace_media (user_id, file_name, mime_type, file_data, file_size, media_type)
           VALUES ($1, $2, $3, $4, $5, 'video') RETURNING id`,
          [Number(userId), f.originalname, f.mimetype, f.buffer, f.size],
        );
        videoPaths.push(`/api/marketing/media/${mRes.rows[0].id}`);
      }

      const result = await pool.query(
        `INSERT INTO ad_journal_listings
       (user_id, title, description, category, contact_phone, contact_email, location, business_name, images, videos, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
        [
          userId,
          title,
          description || null,
          category,
          contact_phone || null,
          contact_email || null,
          address || city || null,
          website_url || null,
          JSON.stringify(imagePaths),
          JSON.stringify(videoPaths),
        ],
      );

      console.log(
        `📦 [LISTING] New listing "${title}" by user ${userId} — ${imagePaths.length} images, ${videoPaths.length} videos`,
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        media: { images: imagePaths, videos: videoPaths },
      });
    } catch (error: any) {
      console.error("[MARKETING] Create listing error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * GET /api/marketing/journal/my-listings
 * Auth: Get current user's listings
 */
router.get(
  "/journal/my-listings",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const result = await pool.query(
        `SELECT * FROM ad_journal_listings WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      );
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * PUT /api/marketing/journal/listings/:id
 * Auth: Update own listing
 */
router.put(
  "/journal/listings/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const listingId = parseInt(req.params.id);
      const {
        title,
        description,
        category,
        contact_phone,
        contact_email,
        address,
        city,
        website_url,
      } = req.body;

      // Verify ownership (admins can edit any)
      const existing = await pool.query(
        `SELECT user_id FROM ad_journal_listings WHERE id = $1`,
        [listingId],
      );

      if (existing.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Listing not found" });
      }

      if (
        existing.rows[0].user_id !== parseInt(userId) &&
        req.user!.role !== "admin" &&
        req.user!.role !== "superuser"
      ) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to edit this listing",
        });
      }

      const { images, videos } = req.body;

      const result = await pool.query(
        `UPDATE ad_journal_listings
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           contact_phone = COALESCE($4, contact_phone),
           contact_email = COALESCE($5, contact_email),
           address = COALESCE($6, address),
           city = COALESCE($7, city),
           website_url = COALESCE($8, website_url),
           images = COALESCE($10, images),
           videos = COALESCE($11, videos),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
        [
          title,
          description,
          category,
          contact_phone,
          contact_email,
          address,
          city,
          website_url,
          listingId,
          images ? JSON.stringify(images) : null,
          videos ? JSON.stringify(videos) : null,
        ],
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * DELETE /api/marketing/journal/listings/:id
 * Auth: Delete own listing
 */
router.delete(
  "/journal/listings/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const listingId = parseInt(req.params.id);

      const existing = await pool.query(
        `SELECT user_id FROM ad_journal_listings WHERE id = $1`,
        [listingId],
      );

      if (existing.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Listing not found" });
      }

      if (
        existing.rows[0].user_id !== parseInt(userId) &&
        req.user!.role !== "admin" &&
        req.user!.role !== "superuser"
      ) {
        return res
          .status(403)
          .json({ success: false, error: "Not authorized" });
      }

      await pool.query(`DELETE FROM ad_journal_listings WHERE id = $1`, [
        listingId,
      ]);
      res.json({ success: true, message: "Listing deleted" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * GET /api/marketing/journal/pdf/:type
 * Public: Download the latest journal PDF (type = weekly | monthly)
 */
router.get("/journal/pdf/:type", async (req: Request, res: Response) => {
  try {
    const type = req.params.type as "weekly" | "monthly";
    if (type !== "weekly" && type !== "monthly") {
      return res
        .status(400)
        .json({ success: false, error: "Type must be 'weekly' or 'monthly'" });
    }

    // Check for latest existing edition
    const latest = await pool.query(
      `SELECT * FROM journal_editions WHERE type = $1 ORDER BY generated_at DESC LIMIT 1`,
      [type],
    );

    if (latest.rows.length > 0 && (latest.rows[0].pdf_url || latest.rows[0].file_path)) {
      const filePath = latest.rows[0].pdf_url || latest.rows[0].file_path;
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="verso-journal-${type}.pdf"`,
        );
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    res.status(404).json({ success: false, error: "No published journal edition available" });
  } catch (error: any) {
    console.error("[MARKETING] Journal PDF error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/journal/generate
 * Admin: Force-generate a journal edition
 */
router.post(
  "/journal/generate",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const { type = "weekly" } = req.body;
      const pdfPath = await generateJournalPDF(type);
      res.json({
        success: true,
        message: `${type} journal generated`,
        path: pdfPath,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * GET /api/marketing/journal/editions
 * Public: List past journal editions
 */
router.get("/journal/editions", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, type, listing_count, generated_at,
              '/api/marketing/journal/pdf/' || type AS pdf_url
       FROM journal_editions ORDER BY generated_at DESC LIMIT 20`,
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/marketing/journal/listings/:id/status
 * Admin: Approve/reject a listing
 */
router.patch(
  "/journal/listings/:id/status",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!["active", "rejected", "pending", "expired"].includes(status)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid status" });
      }
      const result = await pool.query(
        `UPDATE ad_journal_listings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, parseInt(req.params.id)],
      );
      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Listing not found" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📦  MARKETING PACKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/marketing/packs
 * Public: List all marketing pack tiers
 */
router.get("/packs", async (_req: Request, res: Response) => {
  try {
    const packs = await pool.query(
      `SELECT mp.*, 
              json_agg(json_build_object(
                'id', pi.id, 'name', COALESCE(to_jsonb(pi)->>'name', to_jsonb(pi)->>'item_type'),
                'description', pi.description, 'included', COALESCE((to_jsonb(pi)->>'included')::boolean, true)
              ) ORDER BY pi.id) AS items
       FROM marketing_packs mp
       LEFT JOIN pack_items pi ON pi.pack_id = mp.id
       WHERE COALESCE((to_jsonb(mp)->>'is_active')::boolean, (to_jsonb(mp)->>'active')::boolean, false) = true
       GROUP BY mp.id
       ORDER BY mp.price_cents ASC`,
    );

    res.json({ success: true, data: packs.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketing/packs/:id
 * Public: Get single pack details
 */
router.get("/packs/:id", async (req: Request, res: Response) => {
  try {
    const pack = await pool.query(
      `SELECT mp.*,
              json_agg(json_build_object(
                'id', pi.id, 'name', COALESCE(to_jsonb(pi)->>'name', to_jsonb(pi)->>'item_type'),
                'description', pi.description, 'included', COALESCE((to_jsonb(pi)->>'included')::boolean, true)
              ) ORDER BY pi.id) AS items
       FROM marketing_packs mp
       LEFT JOIN pack_items pi ON pi.pack_id = mp.id
       WHERE mp.id = $1
         AND COALESCE((to_jsonb(mp)->>'is_active')::boolean, (to_jsonb(mp)->>'active')::boolean, false) = true
       GROUP BY mp.id`,
      [parseInt(req.params.id)],
    );

    if (pack.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Pack not found" });
    }

    res.json({ success: true, data: pack.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🖨️  PRINT SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/marketing/print/products
 * Public: List all available print products
 */
router.get("/print/products", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM print_products pp
       WHERE COALESCE((to_jsonb(pp)->>'is_active')::boolean, (to_jsonb(pp)->>'active')::boolean, false) = true
       ORDER BY price_cents ASC`,
    );
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/print/upload
 * Auth: Upload a print-ready file + validate
 */
router.post(
  "/print/upload",
  requireAuth(),
  printUpload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No file uploaded" });
      }

      const { product_id, advanced_check } = req.body;

      // Basic validation (always runs)
      const basicChecks = basicValidation(req.file);
      const basicFailed = basicChecks.some((c) => c.status === "fail");
      if (basicFailed) {
        return res.status(400).json({
          success: false,
          error: "File validation failed",
          details: basicChecks,
        });
      }

      // Advanced validation (opt-in)
      let advancedResult = null;
      if (advanced_check === "true" || advanced_check === "1") {
        advancedResult = await advancedValidation(
          req.file.buffer,
          req.file.mimetype,
        );
      }

      // Save print file buffer into Neon DB (Render ephemeral FS safe)
      const printFileRes = await pool.query(
        `INSERT INTO marketing_print_files (user_id, file_name, mime_type, file_data, file_size)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          Number(req.user!.userId),
          req.file.originalname,
          req.file.mimetype,
          req.file.buffer,
          req.file.size,
        ],
      );
      const fileId = printFileRes.rows[0].id;
      const fileUrl = `/api/marketing/print/files/${fileId}`;

      // Create a print job record
      const result = await pool.query(
        `INSERT INTO print_jobs
       (user_id, product_id, file_url, file_name, file_size_bytes, status, specs)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
        [
          req.user!.userId,
          product_id ? parseInt(product_id) : null,
          fileUrl,
          req.file.originalname,
          req.file.size,
          JSON.stringify({
            mimetype: req.file.mimetype,
            basic_validation: basicChecks,
            advanced_validation: advancedResult,
          }),
        ],
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
        validation: { basic: basicChecks, advanced: advancedResult },
      });
    } catch (error: any) {
      console.error("[MARKETING] Print upload error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * GET /api/marketing/print/files/:id
 * Public: Serve uploaded print file directly from Neon DB
 */
router.get("/print/files/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT file_name, mime_type, file_data, file_size FROM marketing_print_files WHERE id = $1`,
      [parseInt(id)],
    );
    if (!result.rows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Print file not found" });
    }
    const { mime_type, file_data, file_name } = result.rows[0];
    res.setHeader("Content-Type", mime_type || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file_name || "print.pdf")}"`,
    );
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Length", file_data.length);
    res.end(file_data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/marketing/media/:id
 * Public: Serve marketplace listing image/video directly from Neon DB
 */
router.get("/media/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT mime_type, file_data, file_size FROM marketplace_media WHERE id = $1`,
      [parseInt(id)],
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: "Media not found" });
    }
    const { mime_type, file_data } = result.rows[0];
    res.setHeader("Content-Type", mime_type || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Length", file_data.length);
    res.end(file_data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/marketing/print/jobs
 * Auth: Get user's print jobs (admin sees all)
 */
router.get(
  "/print/jobs",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const isAdmin =
        req.user!.role === "admin" || req.user!.role === "superuser";
      const { status, page = "1", limit = "20" } = req.query;
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = `SELECT pj.*, pp.name as product_name, u.name as user_name
                 FROM print_jobs pj
                 LEFT JOIN print_products pp ON pj.product_id = pp.id
                 LEFT JOIN users u ON pj.user_id = u.id
                 WHERE 1=1`;
      const params: any[] = [];
      let idx = 1;

      if (!isAdmin) {
        query += ` AND pj.user_id = $${idx++}`;
        params.push(req.user!.userId);
      }

      if (status) {
        query += ` AND pj.status = $${idx++}`;
        params.push(status);
      }

      query += ` ORDER BY pj.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(parseInt(limit as string), offset);

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * PATCH /api/marketing/print/jobs/:id/status
 * Admin: Update print job status (in_production, printing, shipped, completed)
 */
router.patch(
  "/print/jobs/:id/status",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const { status, tracking_number } = req.body;
      const validStatuses = [
        "pending",
        "approved",
        "in_production",
        "printing",
        "quality_check",
        "shipped",
        "completed",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Valid: ${validStatuses.join(", ")}`,
        });
      }

      let query = `UPDATE print_jobs SET status = $1, updated_at = NOW()`;
      const params: any[] = [status];
      let idx = 2;

      if (tracking_number) {
        query += `, tracking_number = $${idx++}`;
        params.push(tracking_number);
      }
      if (status === "completed") {
        query += `, completed_at = NOW()`;
      }

      query += ` WHERE id = $${idx++} RETURNING *`;
      params.push(parseInt(req.params.id));

      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Print job not found" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🛒  CART
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/marketing/cart
 * Auth: Get user's server-side cart
 */
router.get("/cart", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    // price_cents is the current catalogue price, i.e. what checkout will
    // charge. The stored snapshot only backs up products that were removed.
    const result = await pool.query(
      `SELECT ci.id, ci.user_id, ci.item_type, ci.item_id, ci.quantity,
              ci.price_snapshot_cents, ci.created_at,
              COALESCE(
                CASE
                  WHEN ci.item_type = 'pack' THEN (SELECT price_cents FROM marketing_packs WHERE id = ci.item_id)
                  WHEN ci.item_type = 'print_product' THEN (SELECT price_cents FROM print_products WHERE id = ci.item_id)
                END,
                ci.price_snapshot_cents
              ) as price_cents,
              CASE
                WHEN ci.item_type = 'pack' THEN (SELECT name FROM marketing_packs WHERE id = ci.item_id)
                WHEN ci.item_type = 'print_product' THEN (SELECT name FROM print_products WHERE id = ci.item_id)
                ELSE NULL
              END as item_name
       FROM cart_items ci
       WHERE ci.user_id = $1
       ORDER BY ci.created_at ASC, ci.id ASC`,
      [userId],
    );

    const total = result.rows.reduce(
      (sum: number, item: any) =>
        sum + Number(item.price_cents) * Number(item.quantity ?? 0),
      0,
    );

    res.json({
      success: true,
      data: {
        items: result.rows,
        total_cents: total,
        item_count: result.rows.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/cart
 * Auth: Add item to cart
 */
router.post("/cart", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { item_type, item_id } = req.body;

    if (!item_type || !item_id) {
      return res
        .status(400)
        .json({ success: false, error: "item_type and item_id are required" });
    }
    if (!isSellableItemType(item_type)) {
      return res.status(400).json({
        success: false,
        error: "item_type must be 'pack' or 'print_product'",
      });
    }
    const itemId = parseItemId(item_id);
    const quantity =
      req.body.quantity === undefined ? 1 : parseQuantity(req.body.quantity);
    if (itemId === null || quantity === null) {
      return res.status(400).json({
        success: false,
        error: "item_id must be a positive integer and quantity a whole number from 1 to 1000",
      });
    }

    // The price always comes from the catalogue; any client-sent price is ignored
    const product = await findSellableProduct(pool, item_type, itemId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: item_type === "pack" ? "Pack not found" : "Product not found",
      });
    }

    // Check if item already in cart — increment quantity
    const existing = await pool.query(
      `SELECT id, quantity FROM cart_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3`,
      [userId, item_type, itemId],
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE cart_items
            SET quantity = LEAST(COALESCE(quantity, 0) + $1, $2), price_snapshot_cents = $3
          WHERE id = $4 RETURNING *`,
        [quantity, MAX_LINE_QUANTITY, product.priceCents, existing.rows[0].id],
      );
    } else {
      result = await pool.query(
        `INSERT INTO cart_items (user_id, item_type, item_id, quantity, price_snapshot_cents)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, item_type, itemId, quantity, product.priceCents],
      );
    }

    res.status(201).json({
      success: true,
      data: { ...result.rows[0], price_cents: product.priceCents },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/marketing/cart/:id
 * Auth: Update cart item quantity
 */
router.put("/cart/:id", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const quantity = parseQuantity(req.body.quantity);

    if (quantity === null) {
      return res.status(400).json({
        success: false,
        error: "quantity must be a whole number from 1 to 1000",
      });
    }

    const result = await pool.query(
      `UPDATE cart_items SET quantity = $1
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [quantity, parseInt(req.params.id), userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Cart item not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/marketing/cart/:id
 * Auth: Remove item from cart
 */
router.delete(
  "/cart/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const result = await pool.query(
        `DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id`,
        [parseInt(req.params.id), userId],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Cart item not found" });
      }

      res.json({ success: true, message: "Item removed from cart" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * DELETE /api/marketing/cart
 * Auth: Clear entire cart
 */
router.delete("/cart", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
    res.json({ success: true, message: "Cart cleared" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/cart/merge
 * Auth: Merge localStorage cart items into server cart (called on login)
 * Handles price reconciliation — uses current server prices, not client prices
 */
router.post(
  "/cart/merge",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { items } = req.body; // Array of { item_type, item_id, quantity }

      if (!Array.isArray(items) || items.length === 0) {
        return res.json({
          success: true,
          message: "No items to merge",
          merged: 0,
        });
      }

      let merged = 0;
      const reconciled: any[] = [];

      for (const item of items) {
        const { item_type } = item;
        if (!isSellableItemType(item_type)) continue;
        const itemId = parseItemId(item.item_id);
        const quantity =
          item.quantity === undefined ? 1 : parseQuantity(item.quantity);
        if (itemId === null || quantity === null) continue;

        // Get current server price (price reconciliation)
        const product = await findSellableProduct(pool, item_type, itemId);
        if (!product) {
          reconciled.push({
            item_type,
            item_id: itemId,
            status: "skipped",
            reason: "product not found or inactive",
          });
          continue;
        }
        const priceCents = product.priceCents;

        // Check if already in server cart
        const existing = await pool.query(
          `SELECT id, quantity FROM cart_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3`,
          [userId, item_type, itemId],
        );

        if (existing.rows.length > 0) {
          // Take the higher quantity (don't lose items)
          const newQty = Math.max(existing.rows[0].quantity ?? 0, quantity);
          await pool.query(
            `UPDATE cart_items SET quantity = $1, price_snapshot_cents = $2 WHERE id = $3`,
            [newQty, priceCents, existing.rows[0].id],
          );
        } else {
          await pool.query(
            `INSERT INTO cart_items (user_id, item_type, item_id, quantity, price_snapshot_cents)
           VALUES ($1, $2, $3, $4, $5)`,
            [userId, item_type, itemId, quantity, priceCents],
          );
        }

        // Track price changes for client notification
        if (item.client_price_cents && item.client_price_cents !== priceCents) {
          reconciled.push({
            item_type,
            item_id: itemId,
            status: "price_changed",
            old_price_cents: item.client_price_cents,
            new_price_cents: priceCents,
          });
        }

        merged++;
      }

      res.json({ success: true, merged, reconciled });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * POST /api/marketing/cart/checkout
 * Auth: Create a Stripe checkout session for cart contents.
 * The payments gate runs first so a disabled checkout never touches auth,
 * the database or Stripe. Prices are re-read from the database in the handler.
 */
router.post(
  "/cart/checkout",
  requireMarketingCheckout,
  requireAuth(),
  createMarketingCheckoutHandler({
    pool,
    getStripe: () => getStripeClient(),
    getBaseUrl: () => getPublicBaseUrl(),
  }),
);

/**
 * GET /api/marketing/admin/payments-status
 * Owner only: which Stripe key mode and payment switches are active.
 * Reports the key mode from its prefix only; no key material is returned.
 */
router.get(
  "/admin/payments-status",
  requireOwner,
  (_req: Request, res: Response) => {
    const status = getPaymentsModeStatus();
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, ...status, data: status });
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📋  ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/marketing/orders
 * Auth: List user's orders (admin sees all)
 */
router.get("/orders", requireAuth(), async (req: Request, res: Response) => {
  try {
    const isAdmin =
      req.user!.role === "admin" || req.user!.role === "superuser";
    const { status, page = "1", limit = "20" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `SELECT o.*, u.name as user_name, u.email as user_email,
                        json_agg(json_build_object(
                          'id', oi.id, 'item_type', oi.item_type, 'item_id', oi.item_id,
                          'quantity', oi.quantity, 'unit_price_cents', oi.unit_price_cents
                        )) as items
                 FROM orders o
                 LEFT JOIN users u ON o.user_id = u.id
                 LEFT JOIN order_items oi ON oi.order_id = o.id
                 WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (!isAdmin) {
      query += ` AND o.user_id = $${idx++}`;
      params.push(req.user!.userId);
    }

    if (status) {
      query += ` AND o.status = $${idx++}`;
      params.push(status);
    }

    query += ` GROUP BY o.id, u.name, u.email ORDER BY o.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketing/orders/:id
 * Auth: Get order details
 */
router.get(
  "/orders/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.id);
      const isAdmin =
        req.user!.role === "admin" || req.user!.role === "superuser";

      let query = `SELECT o.*,
                        json_agg(json_build_object(
                          'id', oi.id, 'item_type', oi.item_type, 'item_id', oi.item_id,
                          'quantity', oi.quantity, 'unit_price_cents', oi.unit_price_cents
                        )) as items
                 FROM orders o
                 LEFT JOIN order_items oi ON oi.order_id = o.id
                 WHERE o.id = $1`;
      const params: any[] = [orderId];

      if (!isAdmin) {
        query += ` AND o.user_id = $2`;
        params.push(req.user!.userId);
      }

      query += ` GROUP BY o.id`;

      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Order not found" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * PATCH /api/marketing/orders/:id/status
 * Admin: Update order status
 */
router.patch(
  "/orders/:id/status",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const validStatuses = [
        "pending",
        "paid",
        "processing",
        "shipped",
        "completed",
        "cancelled",
        "refunded",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Valid: ${validStatuses.join(", ")}`,
        });
      }

      const result = await pool.query(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, parseInt(req.params.id)],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Order not found" });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📧  NEWSLETTERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/marketing/newsletters/subscribe
 * Public: Subscribe to newsletter
 */
router.post(
  "/newsletters/subscribe",
  newsletterLimiter,
  async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      if (!email) {
        return res
          .status(400)
          .json({ success: false, error: "Email is required" });
      }

      // Generate a unique unsubscribe token
      const crypto = await import("crypto");
      const unsubscribeToken = crypto.randomUUID();

      const result = await pool.query(
        `INSERT INTO newsletter_subscribers (email, name, is_active, unsubscribe_token)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (email) DO UPDATE SET is_active = true, name = COALESCE($2, newsletter_subscribers.name)
       RETURNING *`,
        [email, name || null, unsubscribeToken],
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * POST /api/marketing/newsletters/unsubscribe
 * Public: Unsubscribe from newsletter
 */
router.post(
  "/newsletters/unsubscribe",
  newsletterLimiter,
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res
          .status(400)
          .json({ success: false, error: "Email is required" });
      }

      await pool.query(
        `UPDATE newsletter_subscribers SET is_active = false WHERE email = $1`,
        [email],
      );

      res.json({ success: true, message: "Successfully unsubscribed" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * GET /api/marketing/newsletters/archive
 * Public: Browse past newsletter campaigns
 */
router.get("/newsletters/archive", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const result = await pool.query(
      `SELECT id, title, subject, content, sent_at, recipient_count
       FROM newsletter_campaigns
       WHERE status = 'sent'
       ORDER BY sent_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit as string), offset],
    );

    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketing/newsletters/subscribers
 * Admin: List all subscribers
 */
router.get(
  "/newsletters/subscribers",
  requireAuth(["admin", "superuser"]),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC`,
      );
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * GET /api/marketing/newsletters/campaigns
 * Admin: List all campaigns (including drafts, scheduled)
 */
router.get(
  "/newsletters/campaigns",
  requireAuth(["admin", "superuser"]),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT * FROM newsletter_campaigns ORDER BY created_at DESC`,
      );
      res.json({ success: true, data: result.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * POST /api/marketing/newsletters/campaigns
 * Admin: Create a new campaign (draft or scheduled)
 */
router.post(
  "/newsletters/campaigns",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        subject,
        content,
        status = "draft",
        scheduled_at,
      } = req.body;

      if (!title || !content) {
        return res
          .status(400)
          .json({ success: false, error: "Title and content are required" });
      }

      const result = await pool.query(
        `INSERT INTO newsletter_campaigns (title, subject, content, status, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          title,
          subject || title,
          content,
          status,
          scheduled_at || null,
          req.user!.userId,
        ],
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * PUT /api/marketing/newsletters/campaigns/:id
 * Admin: Update a campaign (draft/scheduled only)
 */
router.put(
  "/newsletters/campaigns/:id",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { title, subject, content, status, scheduled_at } = req.body;

      // Can't edit sent campaigns
      const existing = await pool.query(
        `SELECT status FROM newsletter_campaigns WHERE id = $1`,
        [campaignId],
      );
      if (existing.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Campaign not found" });
      }
      if (existing.rows[0].status === "sent") {
        return res
          .status(400)
          .json({ success: false, error: "Cannot edit a sent campaign" });
      }

      const result = await pool.query(
        `UPDATE newsletter_campaigns
       SET title = COALESCE($1, title),
           subject = COALESCE($2, subject),
           content = COALESCE($3, content),
           status = COALESCE($4, status),
           scheduled_at = COALESCE($5, scheduled_at),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
        [title, subject, content, status, scheduled_at, campaignId],
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

/**
 * POST /api/marketing/newsletters/campaigns/:id/send
 * Admin: Send a campaign immediately
 */
router.post(
  "/newsletters/campaigns/:id/send",
  requireAuth(["admin", "superuser"]),
  async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(req.params.id);

      const campaign = await pool.query(
        `SELECT * FROM newsletter_campaigns WHERE id = $1`,
        [campaignId],
      );
      if (campaign.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Campaign not found" });
      }
      if (campaign.rows[0].status === "sent") {
        return res
          .status(400)
          .json({ success: false, error: "Campaign already sent" });
      }

      const result = await queueNewsletterCampaign(
        campaignId,
        "immediate",
        () => pool.connect(),
      );
      if (!result) {
        return res.status(409).json({
          success: false,
          error: "Campaign was already sent or is being processed",
        });
      }

      res.json({
        success: true,
        message: `Campaign sent to ${result.recipientCount} subscribers`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊  MARKETING ANALYTICS (Admin)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/marketing/analytics
 * Admin: Dashboard stats for the marketing platform
 */
router.get(
  "/analytics",
  requireAuth(["admin", "superuser"]),
  async (_req: Request, res: Response) => {
    try {
      const [
        totalListings,
        activeListings,
        totalOrders,
        revenue,
        totalSubscribers,
        printJobs,
        campaigns,
      ] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM ad_journal_listings`),
        pool.query(
          `SELECT COUNT(*) FROM ad_journal_listings WHERE status = 'active'`,
        ),
        pool.query(`SELECT COUNT(*) FROM orders`),
        pool.query(
          `SELECT COALESCE(SUM(total_cents), 0) as total FROM orders WHERE status IN ('paid', 'completed')`,
        ),
        pool.query(
          `SELECT COUNT(*) FROM newsletter_subscribers WHERE is_active = true`,
        ),
        pool.query(`SELECT COUNT(*) FROM print_jobs`),
        pool.query(
          `SELECT COUNT(*) FROM newsletter_campaigns WHERE status = 'sent'`,
        ),
      ]);

      res.json({
        success: true,
        data: {
          journal: {
            total_listings: parseInt(totalListings.rows[0].count),
            active_listings: parseInt(activeListings.rows[0].count),
          },
          orders: {
            total: parseInt(totalOrders.rows[0].count),
            revenue_cents: parseInt(revenue.rows[0].total),
          },
          newsletters: {
            total_subscribers: parseInt(totalSubscribers.rows[0].count),
            campaigns_sent: parseInt(campaigns.rows[0].count),
          },
          print: {
            total_jobs: parseInt(printJobs.rows[0].count),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧  ADMIN PRINTSHOP QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/marketing/printshop/queue
 * Admin: Get production queue grouped by status
 */
router.get(
  "/printshop/queue",
  requireAuth(["admin", "superuser"]),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT pj.*, pp.name as product_name, u.name as user_name, u.email as user_email
       FROM print_jobs pj
       LEFT JOIN print_products pp ON pj.product_id = pp.id
       LEFT JOIN users u ON pj.user_id = u.id
       WHERE pj.status NOT IN ('completed', 'cancelled')
       ORDER BY
         CASE pj.status
           WHEN 'pending' THEN 1
           WHEN 'approved' THEN 2
           WHEN 'in_production' THEN 3
           WHEN 'printing' THEN 4
           WHEN 'quality_check' THEN 5
           WHEN 'shipped' THEN 6
         END,
         pj.created_at ASC`,
      );

      // Group by status for dashboard
      const grouped: Record<string, any[]> = {};
      for (const job of result.rows) {
        if (!grouped[job.status]) grouped[job.status] = [];
        grouped[job.status].push(job);
      }

      res.json({
        success: true,
        data: {
          queue: result.rows,
          by_status: grouped,
          total_active: result.rows.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🧹  CART CLEANUP (30-day auto-purge)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/marketing/cart/purge-expired
 * Admin/System: Remove cart items older than 30 days
 */
router.delete(
  "/cart/purge-expired",
  requireAuth(["admin", "superuser"]),
  async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `DELETE FROM cart_items WHERE created_at < NOW() - INTERVAL '30 days' RETURNING id`,
      );
      res.json({
        success: true,
        message: `Purged ${result.rows.length} expired cart items`,
        purged: result.rows.length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
