import { Router, Request, Response } from "express";
import { db, pool } from "../db";
import { eq, and, ilike, sql, desc, asc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ═══════════════════════════════════════════════════════
// GET /api/inventory/products — List products (with filters)
// ═══════════════════════════════════════════════════════
router.get("/products", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.userId);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const {
      search,
      category,
      status,
      sort_by = "created_desc",
      page = "1",
      limit = "50",
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(200, Math.max(1, parseInt(String(limit))));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions: string[] = ["ip.user_id = $1"];
    const params: any[] = [userId];
    let paramIdx = 2;

    if (search) {
      conditions.push(
        `(ip.name ILIKE $${paramIdx} OR ip.sku ILIKE $${paramIdx} OR ip.supplier ILIKE $${paramIdx})`,
      );
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (category && category !== "all") {
      conditions.push(`ip.category = $${paramIdx}`);
      params.push(String(category));
      paramIdx++;
    }
    if (status && status !== "all") {
      conditions.push(`ip.status = $${paramIdx}`);
      params.push(String(status));
      paramIdx++;
    }

    // Sort
    let orderBy = "ip.created_at DESC";
    switch (sort_by) {
      case "name_asc":
        orderBy = "ip.name ASC";
        break;
      case "name_desc":
        orderBy = "ip.name DESC";
        break;
      case "stock_asc":
        orderBy = "ip.current_stock ASC";
        break;
      case "stock_desc":
        orderBy = "ip.current_stock DESC";
        break;
      case "price_asc":
        orderBy = "ip.unit_price ASC";
        break;
      case "price_desc":
        orderBy = "ip.unit_price DESC";
        break;
      case "created_asc":
        orderBy = "ip.created_at ASC";
        break;
      default:
        orderBy = "ip.created_at DESC";
    }

    const whereClause = conditions.join(" AND ");

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM inventory_products ip WHERE ${whereClause}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    // Fetch page
    const result = await pool.query(
      `SELECT ip.*, b.name AS business_name
       FROM inventory_products ip
       LEFT JOIN businesses b ON b.id = ip.business_id
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limitNum, offset],
    );

    res.json({
      products: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err: any) {
    console.error("[Inventory] List error:", err.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/inventory/products/:id — Single product
// ═══════════════════════════════════════════════════════
router.get(
  "/products/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req as any).user?.userId);
      const productId = parseInt(req.params.id);
      if (isNaN(productId))
        return res.status(400).json({ error: "Invalid product ID" });

      const result = await pool.query(
        `SELECT ip.*, b.name AS business_name
       FROM inventory_products ip
       LEFT JOIN businesses b ON b.id = ip.business_id
       WHERE ip.id = $1 AND ip.user_id = $2`,
        [productId, userId],
      );

      if (!result.rows.length)
        return res.status(404).json({ error: "Product not found" });

      res.json({ product: result.rows[0] });
    } catch (err: any) {
      console.error("[Inventory] Get error:", err.message);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  },
);

// ═══════════════════════════════════════════════════════
// POST /api/inventory/products — Create product
// ═══════════════════════════════════════════════════════
router.post("/products", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.userId);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const {
      name,
      sku,
      category,
      currentStock,
      reorderPoint,
      reorderQuantity,
      unitCost,
      unitPrice,
      supplier,
      warehouseLocation,
      dailySalesRate,
      lastRestocked,
      status,
      businessId,
      sector,
    } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ error: "Name and SKU are required" });
    }

    // Check SKU uniqueness for this user
    const existing = await pool.query(
      "SELECT id FROM inventory_products WHERE user_id = $1 AND sku = $2",
      [userId, sku],
    );
    if (existing.rows.length) {
      return res
        .status(409)
        .json({ error: "A product with this SKU already exists" });
    }

    const [product] = await db
      .insert(schema.inventoryProducts)
      .values({
        userId,
        businessId: businessId ? Number(businessId) : null,
        name,
        sku,
        category: category || "Other",
        currentStock: currentStock ?? 0,
        reorderPoint: reorderPoint ?? 10,
        reorderQuantity: reorderQuantity ?? 50,
        unitCost: String(unitCost || 0),
        unitPrice: String(unitPrice || 0),
        supplier: supplier || null,
        warehouseLocation: warehouseLocation || null,
        dailySalesRate: String(dailySalesRate || 0),
        lastRestocked: lastRestocked || null,
        status: status || "In Stock",
        sector: sector || null,
      })
      .returning();

    res.status(201).json({ product });
  } catch (err: any) {
    console.error("[Inventory] Create error:", err.message);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// ═══════════════════════════════════════════════════════
// PUT /api/inventory/products/:id — Update product
// ═══════════════════════════════════════════════════════
router.put(
  "/products/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req as any).user?.userId);
      const productId = parseInt(req.params.id);
      if (isNaN(productId))
        return res.status(400).json({ error: "Invalid product ID" });

      // Verify ownership
      const check = await pool.query(
        "SELECT id FROM inventory_products WHERE id = $1 AND user_id = $2",
        [productId, userId],
      );
      if (!check.rows.length)
        return res.status(404).json({ error: "Product not found" });

      const updates = req.body;
      const setFields: string[] = [];
      const params: any[] = [];
      let idx = 1;

      const allowedFields: Record<string, string> = {
        name: "name",
        sku: "sku",
        category: "category",
        currentStock: "current_stock",
        reorderPoint: "reorder_point",
        reorderQuantity: "reorder_quantity",
        unitCost: "unit_cost",
        unitPrice: "unit_price",
        supplier: "supplier",
        warehouseLocation: "warehouse_location",
        dailySalesRate: "daily_sales_rate",
        lastRestocked: "last_restocked",
        status: "status",
        businessId: "business_id",
        sector: "sector",
      };

      for (const [camel, snake] of Object.entries(allowedFields)) {
        if (updates[camel] !== undefined) {
          setFields.push(`${snake} = $${idx}`);
          params.push(updates[camel]);
          idx++;
        }
      }

      if (!setFields.length)
        return res.status(400).json({ error: "No fields to update" });

      setFields.push(`updated_at = NOW()`);
      params.push(productId, userId);

      const result = await pool.query(
        `UPDATE inventory_products SET ${setFields.join(", ")}
       WHERE id = $${idx} AND user_id = $${idx + 1}
       RETURNING *`,
        params,
      );

      res.json({ product: result.rows[0] });
    } catch (err: any) {
      console.error("[Inventory] Update error:", err.message);
      res.status(500).json({ error: "Failed to update product" });
    }
  },
);

// ═══════════════════════════════════════════════════════
// DELETE /api/inventory/products/:id — Delete product
// ═══════════════════════════════════════════════════════
router.delete(
  "/products/:id",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req as any).user?.userId);
      const productId = parseInt(req.params.id);
      if (isNaN(productId))
        return res.status(400).json({ error: "Invalid product ID" });

      const result = await pool.query(
        "DELETE FROM inventory_products WHERE id = $1 AND user_id = $2 RETURNING id",
        [productId, userId],
      );

      if (!result.rows.length)
        return res.status(404).json({ error: "Product not found" });

      res.json({ success: true, deleted: productId });
    } catch (err: any) {
      console.error("[Inventory] Delete error:", err.message);
      res.status(500).json({ error: "Failed to delete product" });
    }
  },
);

// ═══════════════════════════════════════════════════════
// GET /api/inventory/alerts — Low stock / reorder alerts
// ═══════════════════════════════════════════════════════
router.get("/alerts", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.userId);

    const result = await pool.query(
      `SELECT ip.*, b.name AS business_name,
              CASE WHEN ip.current_stock = 0 THEN 'Out of Stock'
                   WHEN ip.current_stock <= ip.reorder_point THEN 'Low Stock'
                   ELSE 'Warning'
              END AS alert_type,
              CASE WHEN COALESCE(ip.daily_sales_rate, 0) > 0
                   THEN ROUND(ip.current_stock::numeric / ip.daily_sales_rate::numeric, 1)
                   ELSE NULL
              END AS days_until_stockout
       FROM inventory_products ip
       LEFT JOIN businesses b ON b.id = ip.business_id
       WHERE ip.user_id = $1
         AND ip.current_stock <= ip.reorder_point
         AND ip.status != 'Discontinued'
       ORDER BY ip.current_stock ASC, ip.reorder_point DESC`,
      [userId],
    );

    res.json({
      alerts: result.rows,
      total: result.rows.length,
    });
  } catch (err: any) {
    console.error("[Inventory] Alerts error:", err.message);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/inventory/predictions — Stockout predictions
// ═══════════════════════════════════════════════════════
router.get(
  "/predictions",
  requireAuth(),
  async (req: Request, res: Response) => {
    try {
      const userId = Number((req as any).user?.userId);

      const result = await pool.query(
        `SELECT ip.id, ip.name, ip.sku, ip.category, ip.current_stock,
              ip.reorder_point, ip.daily_sales_rate, ip.unit_cost, ip.unit_price,
              ip.status,
              CASE WHEN COALESCE(ip.daily_sales_rate, 0) > 0
                   THEN ROUND(ip.current_stock::numeric / ip.daily_sales_rate::numeric, 1)
                   ELSE NULL
              END AS days_until_stockout,
              CASE WHEN COALESCE(ip.daily_sales_rate, 0) > 0
                   THEN ROUND(ip.daily_sales_rate::numeric * 30, 0)
                   ELSE 0
              END AS monthly_demand,
              ROUND((ip.unit_price::numeric - ip.unit_cost::numeric) * COALESCE(ip.daily_sales_rate::numeric, 0) * 30, 2) AS projected_monthly_profit
       FROM inventory_products ip
       WHERE ip.user_id = $1 AND ip.status != 'Discontinued'
       ORDER BY
         CASE WHEN COALESCE(ip.daily_sales_rate, 0) > 0
              THEN ip.current_stock::numeric / ip.daily_sales_rate::numeric
              ELSE 999999 END ASC`,
        [userId],
      );

      res.json({ predictions: result.rows });
    } catch (err: any) {
      console.error("[Inventory] Predictions error:", err.message);
      res.status(500).json({ error: "Failed to compute predictions" });
    }
  },
);

// ═══════════════════════════════════════════════════════
// GET /api/inventory/stats — Summary statistics for dashboard
// ═══════════════════════════════════════════════════════
router.get("/stats", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.userId);

    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_products,
         COALESCE(SUM(ip.current_stock), 0)::int AS total_stock,
         COALESCE(SUM(ip.current_stock::numeric * ip.unit_cost::numeric), 0)::numeric AS total_inventory_value,
         COALESCE(SUM(ip.current_stock::numeric * ip.unit_price::numeric), 0)::numeric AS total_retail_value,
         COUNT(CASE WHEN ip.current_stock <= ip.reorder_point AND ip.status != 'Discontinued' THEN 1 END)::int AS low_stock_count,
         COUNT(CASE WHEN ip.current_stock = 0 AND ip.status != 'Discontinued' THEN 1 END)::int AS out_of_stock_count,
         COUNT(DISTINCT ip.category)::int AS category_count,
         COUNT(DISTINCT ip.supplier)::int AS supplier_count,
         COALESCE(AVG(ip.daily_sales_rate::numeric), 0)::numeric AS avg_daily_sales_rate
       FROM inventory_products ip
       WHERE ip.user_id = $1`,
      [userId],
    );

    // Category breakdown
    const catResult = await pool.query(
      `SELECT ip.category, COUNT(*)::int AS count,
              COALESCE(SUM(ip.current_stock), 0)::int AS total_stock,
              COALESCE(SUM(ip.current_stock::numeric * ip.unit_price::numeric), 0)::numeric AS value
       FROM inventory_products ip
       WHERE ip.user_id = $1
       GROUP BY ip.category
       ORDER BY count DESC`,
      [userId],
    );

    // Status breakdown
    const statusResult = await pool.query(
      `SELECT ip.status, COUNT(*)::int AS count
       FROM inventory_products ip
       WHERE ip.user_id = $1
       GROUP BY ip.status`,
      [userId],
    );

    res.json({
      stats: result.rows[0],
      categories: catResult.rows,
      statuses: statusResult.rows,
    });
  } catch (err: any) {
    console.error("[Inventory] Stats error:", err.message);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/inventory/settings — User dashboard preferences
// ═══════════════════════════════════════════════════════
router.get("/settings", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.userId);

    const result = await pool.query(
      `SELECT setting_key, setting_value, data_type
       FROM user_settings
       WHERE user_id = $1 AND sector = 'inventory'`,
      [userId],
    );

    const settings: Record<string, any> = {};
    for (const row of result.rows) {
      try {
        settings[row.setting_key] =
          row.data_type === "json"
            ? JSON.parse(row.setting_value)
            : row.setting_value;
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    }

    res.json({ settings });
  } catch (err: any) {
    console.error("[Inventory] Settings get error:", err.message);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/inventory/settings — Save user dashboard preferences
// ═══════════════════════════════════════════════════════
router.post("/settings", requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.userId);
    const { settings } = req.body;

    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ error: "Settings object required" });
    }

    for (const [key, value] of Object.entries(settings)) {
      const dataType = typeof value === "object" ? "json" : "string";
      const settingValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      await pool.query(
        `INSERT INTO user_settings (user_id, sector, setting_key, setting_value, data_type)
         VALUES ($1, 'inventory', $2, $3, $4)
         ON CONFLICT (user_id, sector, setting_key)
         DO UPDATE SET setting_value = $3, data_type = $4`,
        [userId, key, settingValue, dataType],
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("[Inventory] Settings save error:", err.message);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

export default router;
