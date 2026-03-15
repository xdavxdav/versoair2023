/**
 * Marketing Platform API Routes
 * Handles: Ad Journal, Marketing Packs, Print Services, Cart, Orders, Newsletters
 * Mounted at /api/marketing
 */
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import { generateJournalPDF } from "../services/journal-pdf-generator";
import {
  basicValidation,
  advancedValidation,
} from "../services/print-validator";

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// Stripe instance (shared with payments module)
// ──────────────────────────────────────────────────────────────────────────────
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

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

const printStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRINT_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `print-${uniqueSuffix}${ext}`);
  },
});

const printUpload = multer({
  storage: printStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB for print files
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/tiff",
      "image/svg+xml",
      "application/postscript", // .ai / .eps
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported print file format: ${file.mimetype}`));
    }
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📰  AD JOURNAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/marketing/journal/listings
 * Public: Browse active journal listings (with optional filters)
 */
router.get("/journal/listings", async (req: Request, res: Response) => {
  try {
    const { category, status, page = "1", limit = "20" } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `SELECT jl.*, u.name as owner_name, u.email as owner_email
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
    const filterStatus = status || "active";
    query += ` AND jl.status = $${idx++}`;
    params.push(filterStatus);

    query += ` ORDER BY jl.is_premium DESC, jl.created_at DESC`;
    query += ` LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM ad_journal_listings WHERE status = $1`;
    const countParams: any[] = [filterStatus];
    if (category) {
      countQuery += ` AND category = $2`;
      countParams.push(category);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(
          parseInt(countResult.rows[0].count) / parseInt(limit as string),
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
 * Auth: Create a new free ad listing
 */
router.post(
  "/journal/listings",
  requireAuth(),
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

      if (!title || !description || !category) {
        return res.status(400).json({
          success: false,
          error: "Title, description, and category are required",
        });
      }

      const result = await pool.query(
        `INSERT INTO ad_journal_listings
       (user_id, title, description, category, contact_phone, contact_email, address, city, website_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
        [
          userId,
          title,
          description,
          category,
          contact_phone,
          contact_email,
          address,
          city,
          website_url,
        ],
      );

      res.status(201).json({ success: true, data: result.rows[0] });
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

    if (latest.rows.length > 0 && latest.rows[0].pdf_url) {
      const filePath = latest.rows[0].pdf_url;
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="verso-journal-${type}.pdf"`,
        );
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // Generate on-demand if none exists
    const { filePath: pdfPath } = await generateJournalPDF(type);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="verso-journal-${type}.pdf"`,
    );
    fs.createReadStream(pdfPath).pipe(res);
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
      `SELECT id, type, listing_count, generated_at, pdf_url FROM journal_editions ORDER BY generated_at DESC LIMIT 20`,
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
                'id', pi.id, 'name', pi.name, 'description', pi.description, 'included', pi.included
              ) ORDER BY pi.sort_order) AS items
       FROM marketing_packs mp
       LEFT JOIN pack_items pi ON pi.pack_id = mp.id
       WHERE mp.is_active = true
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
                'id', pi.id, 'name', pi.name, 'description', pi.description, 'included', pi.included
              ) ORDER BY pi.sort_order) AS items
       FROM marketing_packs mp
       LEFT JOIN pack_items pi ON pi.pack_id = mp.id
       WHERE mp.id = $1
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
      `SELECT * FROM print_products WHERE is_active = true ORDER BY price_cents ASC`,
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
        // Delete the rejected file
        fs.unlinkSync(req.file.path);
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
          req.file.path,
          req.file.mimetype,
        );
      }

      // Create a print job record
      const result = await pool.query(
        `INSERT INTO print_jobs
       (user_id, product_id, file_url, file_name, file_size_bytes, status, specs)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
        [
          req.user!.userId,
          product_id ? parseInt(product_id) : null,
          req.file.path,
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
    const result = await pool.query(
      `SELECT ci.*,
              CASE
                WHEN ci.item_type = 'pack' THEN (SELECT name FROM marketing_packs WHERE id = ci.item_id)
                WHEN ci.item_type = 'print_product' THEN (SELECT name FROM print_products WHERE id = ci.item_id)
                ELSE NULL
              END as item_name
       FROM cart_items ci
       WHERE ci.user_id = $1
       ORDER BY ci.created_at ASC`,
      [userId],
    );

    const total = result.rows.reduce(
      (sum: number, item: any) => sum + item.price_cents * item.quantity,
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
    const { item_type, item_id, quantity = 1, metadata } = req.body;

    if (!item_type || !item_id) {
      return res
        .status(400)
        .json({ success: false, error: "item_type and item_id are required" });
    }

    // Look up the current price
    let priceCents = 0;
    if (item_type === "pack") {
      const pack = await pool.query(
        `SELECT price_cents FROM marketing_packs WHERE id = $1`,
        [item_id],
      );
      if (pack.rows.length === 0)
        return res
          .status(404)
          .json({ success: false, error: "Pack not found" });
      priceCents = pack.rows[0].price_cents;
    } else if (item_type === "print_product") {
      const prod = await pool.query(
        `SELECT price_cents FROM print_products WHERE id = $1`,
        [item_id],
      );
      if (prod.rows.length === 0)
        return res
          .status(404)
          .json({ success: false, error: "Product not found" });
      priceCents = prod.rows[0].price_cents;
    } else {
      return res.status(400).json({
        success: false,
        error: "item_type must be 'pack' or 'print_product'",
      });
    }

    // Check if item already in cart — increment quantity
    const existing = await pool.query(
      `SELECT id, quantity FROM cart_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3`,
      [userId, item_type, item_id],
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE cart_items SET quantity = quantity + $1, price_cents = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [quantity, priceCents, existing.rows[0].id],
      );
    } else {
      result = await pool.query(
        `INSERT INTO cart_items (user_id, item_type, item_id, quantity, price_cents, metadata)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          userId,
          item_type,
          item_id,
          quantity,
          priceCents,
          metadata ? JSON.stringify(metadata) : null,
        ],
      );
    }

    res.status(201).json({ success: true, data: result.rows[0] });
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
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res
        .status(400)
        .json({ success: false, error: "quantity must be >= 1" });
    }

    const result = await pool.query(
      `UPDATE cart_items SET quantity = $1, updated_at = NOW()
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
        const { item_type, item_id, quantity = 1 } = item;
        if (!item_type || !item_id) continue;

        // Get current server price (price reconciliation)
        let priceCents = 0;
        if (item_type === "pack") {
          const p = await pool.query(
            `SELECT price_cents FROM marketing_packs WHERE id = $1 AND is_active = true`,
            [item_id],
          );
          if (p.rows.length === 0) {
            reconciled.push({
              item_type,
              item_id,
              status: "skipped",
              reason: "product not found or inactive",
            });
            continue;
          }
          priceCents = p.rows[0].price_cents;
        } else if (item_type === "print_product") {
          const p = await pool.query(
            `SELECT price_cents FROM print_products WHERE id = $1 AND is_active = true`,
            [item_id],
          );
          if (p.rows.length === 0) {
            reconciled.push({
              item_type,
              item_id,
              status: "skipped",
              reason: "product not found or inactive",
            });
            continue;
          }
          priceCents = p.rows[0].price_cents;
        } else {
          continue;
        }

        // Check if already in server cart
        const existing = await pool.query(
          `SELECT id, quantity FROM cart_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3`,
          [userId, item_type, item_id],
        );

        if (existing.rows.length > 0) {
          // Take the higher quantity (don't lose items)
          const newQty = Math.max(existing.rows[0].quantity, quantity);
          await pool.query(
            `UPDATE cart_items SET quantity = $1, price_cents = $2, updated_at = NOW() WHERE id = $3`,
            [newQty, priceCents, existing.rows[0].id],
          );
        } else {
          await pool.query(
            `INSERT INTO cart_items (user_id, item_type, item_id, quantity, price_cents)
           VALUES ($1, $2, $3, $4, $5)`,
            [userId, item_type, item_id, quantity, priceCents],
          );
        }

        // Track price changes for client notification
        if (item.client_price_cents && item.client_price_cents !== priceCents) {
          reconciled.push({
            item_type,
            item_id,
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
 * Auth: Create a Stripe checkout session for cart contents
 */
router.post(
  "/cart/checkout",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      if (!stripe) {
        return res
          .status(503)
          .json({ success: false, error: "Stripe not configured" });
      }

      const userId = req.user!.userId;

      // Get cart items with current prices
      const cartResult = await pool.query(
        `SELECT ci.*,
              CASE
                WHEN ci.item_type = 'pack' THEN (SELECT name FROM marketing_packs WHERE id = ci.item_id)
                WHEN ci.item_type = 'print_product' THEN (SELECT name FROM print_products WHERE id = ci.item_id)
              END as item_name
       FROM cart_items ci
       WHERE ci.user_id = $1`,
        [userId],
      );

      if (cartResult.rows.length === 0) {
        return res.status(400).json({ success: false, error: "Cart is empty" });
      }

      // Create order record
      const totalCents = cartResult.rows.reduce(
        (sum: number, i: any) => sum + i.price_cents * i.quantity,
        0,
      );
      const orderResult = await pool.query(
        `INSERT INTO orders (user_id, total_cents, status) VALUES ($1, $2, 'pending') RETURNING *`,
        [userId, totalCents],
      );
      const order = orderResult.rows[0];

      // Create order items
      for (const item of cartResult.rows) {
        await pool.query(
          `INSERT INTO order_items (order_id, item_type, item_id, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4, $5)`,
          [
            order.id,
            item.item_type,
            item.item_id,
            item.quantity,
            item.price_cents,
          ],
        );
      }

      // Build Stripe line_items
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
        cartResult.rows.map((item: any) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.item_name || `${item.item_type} #${item.item_id}`,
              description: `Verso Air Marketing — ${item.item_type}`,
            },
            unit_amount: item.price_cents,
          },
          quantity: item.quantity,
        }));

      const origin = req.headers.origin || "http://localhost:5003";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: lineItems,
        metadata: {
          userId: String(userId),
          orderId: String(order.id),
          type: "marketing_order",
        },
        success_url: `${origin}/marketing/order-tracking?status=success&orderId=${order.id}`,
        cancel_url: `${origin}/marketing/cart?status=cancelled`,
      });

      // Store stripe session ID on the order
      await pool.query(
        `UPDATE orders SET stripe_session_id = $1 WHERE id = $2`,
        [session.id, order.id],
      );

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          url: session.url,
          orderId: order.id,
        },
      });
    } catch (error: any) {
      console.error("[MARKETING] Checkout error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
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
router.post("/newsletters/subscribe", async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "Email is required" });
    }

    const result = await pool.query(
      `INSERT INTO newsletter_subscribers (email, name, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (email) DO UPDATE SET is_active = true, name = COALESCE($2, newsletter_subscribers.name)
       RETURNING *`,
      [email, name || null],
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketing/newsletters/unsubscribe
 * Public: Unsubscribe from newsletter
 */
router.post("/newsletters/unsubscribe", async (req: Request, res: Response) => {
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
});

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

      const cam = campaign.rows[0];

      // Mark as sending
      await pool.query(
        `UPDATE newsletter_campaigns SET status = 'sending' WHERE id = $1`,
        [campaignId],
      );

      // Queue emails to all active subscribers
      const subscribers = await pool.query(
        `SELECT email, name FROM newsletter_subscribers WHERE is_active = true`,
      );

      let queued = 0;
      for (const sub of subscribers.rows) {
        await pool.query(
          `INSERT INTO email_queue (recipient_email, subject, html_body, email_type, status)
         VALUES ($1, $2, $3, 'newsletter', 'pending')`,
          [sub.email, cam.subject || cam.title, cam.content],
        );
        queued++;
      }

      // Mark as sent
      await pool.query(
        `UPDATE newsletter_campaigns SET status = 'sent', sent_at = NOW(), recipient_count = $1 WHERE id = $2`,
        [queued, campaignId],
      );

      res.json({
        success: true,
        message: `Campaign sent to ${queued} subscribers`,
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
