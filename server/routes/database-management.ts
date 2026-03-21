import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import {
  businessCategories,
  countries,
  regions,
  cities,
  artists,
  contractors,
  paymentCardTypes,
  businesses,
  users,
  auditLogs,
} from "../../shared/schema";
import { eq, like, count, desc, sql } from "drizzle-orm";
import { sendGeoAdminCrudNotificationEmail } from "../services/email-service";
import { requireAuth } from "../middleware/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const ADMIN_NOTIFICATION_EMAIL =
  process.env.SMTP_USER || process.env.ADMIN_EMAIL || "luqjoey@gmail.com";
const router = Router();

// ═══════════════════════════════════════════════
// 🔒 All routes require at least admin role
// ═══════════════════════════════════════════════
router.use(requireAuth(["admin", "superuser"]));

// Helper: log every mutation to audit_logs
async function auditLog(req: Request, action: string, entityType: string, entityId: string | number, changes?: any) {
  try {
    await db.insert(auditLogs).values({
      userId: req.user?.userId ? parseInt(req.user.userId) : undefined,
      action,
      entityType,
      entityId: String(entityId),
      changes: changes || {},
    });
  } catch (e) {
    console.warn("[AUDIT] Could not log:", e);
  }
}

// ═══════════════════════════════════════════════
// Zod schemas for input validation
// ═══════════════════════════════════════════════
const categorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});
const countrySchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(2).max(10),
});
const regionSchema = z.object({
  name: z.string().min(1).max(200),
  countryId: z.number().int().positive(),
});
const citySchema = z.object({
  name: z.string().min(1).max(200),
  regionId: z.number().int().positive(),
});
const contractorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  company: z.string().max(200).optional(),
  specialty: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
}).passthrough();

// =======================
// CATEGORIES
// =======================

router.get("/categories", async (req, res) => {
  try {
    const result = await db.select().from(businessCategories);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const { name, slug, description } = parsed.data;
    const result = await db
      .insert(businessCategories)
      .values({ name, slug, description })
      .returning();
    await auditLog(req, "CREATE", "categories", result[0].id, { name });
    res.status(201).json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = categorySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const result = await db
      .update(businessCategories)
      .set(parsed.data)
      .where(eq(businessCategories.id, parseInt(id)))
      .returning();
    await auditLog(req, "UPDATE", "categories", id, parsed.data);
    res.json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db
      .delete(businessCategories)
      .where(eq(businessCategories.id, parseInt(id)));
    await auditLog(req, "DELETE", "categories", id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// =======================
// COUNTRIES
// =======================

router.get("/countries", async (req, res) => {
  try {
    const result = await db.select().from(countries);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/countries", async (req, res) => {
  try {
    const parsed = countrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const { name, code } = parsed.data;
    const result = await db
      .insert(countries)
      .values({ name, code })
      .returning();
    await auditLog(req, "CREATE", "countries", result[0].id, { name, code });
    res.status(201).json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/countries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = countrySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const result = await db
      .update(countries)
      .set(parsed.data)
      .where(eq(countries.id, parseInt(id)))
      .returning();
    await auditLog(req, "UPDATE", "countries", id, parsed.data);
    res.json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/countries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(countries).where(eq(countries.id, parseInt(id)));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// =======================
// REGIONS
// =======================

router.get("/regions", async (req, res) => {
  try {
    const { countryId } = req.query;
    if (countryId) {
      const cid = parseInt(countryId as string);
      const result = await db.execute(
        sql`SELECT id, name, country_id AS "countryId" FROM regions WHERE country_id = ${cid} ORDER BY name`,
      );
      res.json(result.rows);
    } else {
      const result = await db.execute(
        sql`SELECT id, name, country_id AS "countryId" FROM regions ORDER BY name`,
      );
      res.json(result.rows);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/regions", async (req, res) => {
  try {
    const parsed = regionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const { name, countryId } = parsed.data;
    const result = await db
      .insert(regions)
      .values({ name, countryId })
      .returning();
    await auditLog(req, "CREATE", "regions", result[0].id, { name, countryId });
    res.status(201).json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/regions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = regionSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const result = await db
      .update(regions)
      .set(parsed.data)
      .where(eq(regions.id, parseInt(id)))
      .returning();
    await auditLog(req, "UPDATE", "regions", id, parsed.data);
    res.json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/regions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(regions).where(eq(regions.id, parseInt(id)));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// =======================
// CITIES
// =======================

router.get("/cities", async (req, res) => {
  try {
    const { countryId, regionId } = req.query;
    if (regionId) {
      // Filter by region — cascading Region → City
      const rid = parseInt(regionId as string);
      const result = await db.execute(
        sql`SELECT c.id, c.name, c.region_id AS "regionId", r.name AS "regionName", r.country_id AS "countryId"
            FROM cities c
            JOIN regions r ON c.region_id = r.id
            WHERE c.region_id = ${rid}
            ORDER BY c.name`,
      );
      res.json(result.rows);
    } else if (countryId) {
      // Filter by country — JOIN through regions since cities has no country_id column
      const cid = parseInt(countryId as string);
      const result = await db.execute(
        sql`SELECT c.id, c.name, c.region_id AS "regionId", r.name AS "regionName", r.country_id AS "countryId"
            FROM cities c
            JOIN regions r ON c.region_id = r.id
            WHERE r.country_id = ${cid}
            ORDER BY c.name`,
      );
      res.json(result.rows);
    } else {
      const result = await db.execute(
        sql`SELECT c.id, c.name, c.region_id AS "regionId", r.name AS "regionName", r.country_id AS "countryId"
            FROM cities c
            LEFT JOIN regions r ON c.region_id = r.id
            ORDER BY c.name`,
      );
      res.json(result.rows);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/cities", async (req, res) => {
  try {
    const parsed = citySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const { name, regionId } = parsed.data;
    const result = await db
      .insert(cities)
      .values({ name, regionId })
      .returning();
    await auditLog(req, "CREATE", "cities", result[0].id, { name, regionId });
    res.status(201).json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/cities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = citySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const result = await db
      .update(cities)
      .set(parsed.data)
      .where(eq(cities.id, parseInt(id)))
      .returning();
    await auditLog(req, "UPDATE", "cities", id, parsed.data);
    res.json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/cities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(cities).where(eq(cities.id, parseInt(id)));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// =======================
// ARTISTS
// =======================

router.get("/artists", async (req, res) => {
  try {
    const result = await db.select().from(artists);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/artists", async (req, res) => {
  try {
    const { stageName, genre, labelStatus, country, bio } = req.body;
    if (!stageName) return res.status(400).json({ error: "stageName is required" });
    const result = await db.insert(artists).values({ stageName, genre, labelStatus, country, bio } as any).returning();
    // 📬 Send SMTP notification
    sendGeoAdminCrudNotificationEmail(ADMIN_NOTIFICATION_EMAIL, {
      action: "created",
      entityType: "artist",
      entityName: result[0]?.stageName || req.body.stageName || "Unknown",
      entityId: result[0]?.id || 0,
      details: { genre: req.body.genre, labelStatus: req.body.labelStatus },
    }).catch((err) => console.error("[ARTIST] Email notification error:", err));
    res.status(201).json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/artists/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db
      .update(artists)
      .set(req.body)
      .where(eq(artists.id, parseInt(id)))
      .returning();
    // 📬 Send SMTP notification
    sendGeoAdminCrudNotificationEmail(ADMIN_NOTIFICATION_EMAIL, {
      action: "updated",
      entityType: "artist",
      entityName: result[0]?.stageName || "Unknown",
      entityId: parseInt(id),
      details: { genre: req.body.genre, labelStatus: req.body.labelStatus },
    }).catch((err) => console.error("[ARTIST] Email notification error:", err));
    res.json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/artists/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(artists)
      .where(eq(artists.id, parseInt(id)))
      .returning();
    // 📬 Send SMTP notification
    sendGeoAdminCrudNotificationEmail(ADMIN_NOTIFICATION_EMAIL, {
      action: "deleted",
      entityType: "artist",
      entityName: deleted?.stageName || `Artist #${id}`,
      entityId: parseInt(id),
    }).catch((err) => console.error("[ARTIST] Email notification error:", err));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// =======================
// CONTRACTORS
// =======================

router.get("/contractors", async (req, res) => {
  try {
    const result = await db.select().from(contractors);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/contractors", async (req, res) => {
  try {
    const parsed = contractorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const result = await db.insert(contractors).values(parsed.data as any).returning();
    await auditLog(req, "CREATE", "contractors", result[0].id, parsed.data);
    res.status(201).json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/contractors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = contractorSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const result = await db
      .update(contractors)
      .set(parsed.data as any)
      .where(eq(contractors.id, parseInt(id)))
      .returning();
    await auditLog(req, "UPDATE", "contractors", id, parsed.data);
    res.json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/contractors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(contractors).where(eq(contractors.id, parseInt(id)));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// =======================
// PAYMENT CARD TYPES
// =======================

router.get("/payment-card-types", async (req, res) => {
  try {
    const result = await db.select().from(paymentCardTypes);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/payment-card-types", async (req, res) => {
  try {
    const { name, network, type } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const result = await db
      .insert(paymentCardTypes)
      .values({ name, network, type } as any)
      .returning();
    await auditLog(req, "CREATE", "payment_card_types", result[0].id, { name });
    res.status(201).json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/payment-card-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, network, type } = req.body;
    const safeUpdate: any = {};
    if (name !== undefined) safeUpdate.name = name;
    if (network !== undefined) safeUpdate.network = network;
    if (type !== undefined) safeUpdate.type = type;
    const result = await db
      .update(paymentCardTypes)
      .set(safeUpdate)
      .where(eq(paymentCardTypes.id, parseInt(id)))
      .returning();
    await auditLog(req, "UPDATE", "payment_card_types", id, safeUpdate);
    res.json(result[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/payment-card-types/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db
      .delete(paymentCardTypes)
      .where(eq(paymentCardTypes.id, parseInt(id)));
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ========== DATABASE DASHBOARD ENDPOINTS ==========

// Helper function to format time ago
function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "unknown";
  const now = new Date();
  const past = new Date(date);
  const diff = now.getTime() - past.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return past.toLocaleDateString();
}

// Get database statistics
router.get("/database/stats", async (req, res) => {
  try {
    const totalBusinesses = await db
      .select({ count: count() })
      .from(businesses)
      .execute();

    const totalUsers = await db
      .select({ count: count() })
      .from(users)
      .execute();

    const totalCategories = await db
      .select({ count: count() })
      .from(businessCategories)
      .execute();

    // Calculate database health (simplified: 95% base + adjustments)
    let dbHealth = 95;
    if ((totalBusinesses[0]?.count || 0) < 100) dbHealth -= 10;
    if ((totalUsers[0]?.count || 0) < 50) dbHealth -= 5;

    res.json({
      totalBusinesses: totalBusinesses[0]?.count || 0,
      activeUsers: totalUsers[0]?.count || 0,
      totalCategories: totalCategories[0]?.count || 0,
      dbHealth: Math.min(100, Math.max(0, dbHealth)),
    });
  } catch (error: any) {
    console.error("Error fetching database stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch database stats",
    });
  }
});

// Get business types with counts
router.get("/database/business-types", async (req, res) => {
  try {
    const businessCounts = await db
      .select({
        name: businessCategories.name,
        count: count(businesses.id),
      })
      .from(businessCategories)
      .leftJoin(businesses, eq(businesses.categoryId, businessCategories.id))
      .groupBy(businessCategories.id, businessCategories.name)
      .orderBy(desc(count(businesses.id)))
      .limit(15)
      .execute();

    const businessTypes = businessCounts.map((bt, idx) => ({
      id: idx + 1,
      name: bt.name || "Uncategorized",
      count: bt.count || 0,
      growth: `+${Math.floor(Math.random() * 20) + 2}%`,
      status: (bt.count || 0) > 50 ? "healthy" : "warning",
      last_updated: new Date().toISOString(),
    }));

    res.json(businessTypes);
  } catch (error: any) {
    console.error("Error fetching business types:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch business types",
    });
  }
});

// Get category statistics
router.get("/database/categories", async (req, res) => {
  try {
    const categories = await db
      .select({
        name: businessCategories.name,
        count: count(businesses.id),
      })
      .from(businessCategories)
      .leftJoin(businesses, eq(businesses.categoryId, businessCategories.id))
      .groupBy(businessCategories.id, businessCategories.name)
      .orderBy(desc(count(businesses.id)))
      .execute();

    const totalBusinesses = await db
      .select({ count: count() })
      .from(businesses)
      .execute();

    const total = totalBusinesses[0]?.count || 1;

    const categoryStats = categories.map((cat) => ({
      name: cat.name || "Uncategorized",
      businesses: cat.count || 0,
      percentage: Math.round(((cat.count || 0) / total) * 100),
    }));

    res.json(categoryStats);
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch categories",
    });
  }
});

// Get activity log
router.get("/database/activity", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get recent businesses added
    const recentBusinesses = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .orderBy(desc(businesses.createdAt))
      .limit(limit)
      .execute();

    const activities = recentBusinesses.map((b, idx) => ({
      id: `activity-${idx}`,
      action: `Business "${b.name}" added`,
      type: "create",
      time: formatTimeAgo(b.createdAt),
      user: "System",
      entity_type: "business",
    }));

    res.json(activities);
  } catch (error: any) {
    console.error("Error fetching activity:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity log",
    });
  }
});

// =======================
// DATABASE TABLES METADATA
// =======================

router.get("/database/tables", async (req, res) => {
  try {
    // Query PostgreSQL information schema to get all tables
    const result = await db.execute(
      sql`
      SELECT
        t.table_name as name,
        (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name)::int as columns,
        (SELECT count(*) FROM pg_class WHERE relname = t.table_name)::int as exists,
        t.table_type as type
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
      `,
    );

    // Get row counts and sizes for each table
    const tablesWithStats = await Promise.all(
      (result.rows as any[]).map(async (table) => {
        try {
          const stats = await db.execute(
            sql`
            SELECT
              n_live_tup::int as row_count,
              pg_total_relation_size('${sql.raw(table.name)}')/1024/1024 as size_mb
            FROM pg_stat_user_tables
            WHERE relname = ${table.name}
            LIMIT 1
            `,
          );

          const stat = (stats.rows[0] as any) || {
            row_count: 0,
            size_mb: 0,
          };

          // Get column information
          const columns = await db.execute(
            sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = ${table.name}
            ORDER BY ordinal_position
            `,
          );

          return {
            name: table.name,
            displayName:
              table.name
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c: string) => c.toUpperCase()) || table.name,
            description: `Table: ${table.name}`,
            rowCount: stat.row_count || 0,
            sizeMB: stat.size_mb || 0,
            columns: (columns.rows as any[]).length,
            columnDetails: columns.rows as any[],
            is_view: table.type === "VIEW",
            icon: table.type === "VIEW" ? "📋" : "📊",
            tags: [table.type === "VIEW" ? "View" : "Table", "PostgreSQL"],
            importance:
              (stat.row_count as number) > 1000
                ? "high"
                : (stat.row_count as number) > 100
                  ? "medium"
                  : "low",
            hasFK: false,
          };
        } catch (err) {
          console.error(`Error getting stats for table ${table.name}:`, err);
          return {
            name: table.name,
            displayName:
              table.name
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c: string) => c.toUpperCase()) || table.name,
            description: `Table: ${table.name}`,
            rowCount: 0,
            sizeMB: 0,
            columns: 0,
            columnDetails: [],
            is_view: table.type === "VIEW",
            icon: table.type === "VIEW" ? "📋" : "📊",
            tags: [table.type === "VIEW" ? "View" : "Table", "PostgreSQL"],
            importance: "low",
            hasFK: false,
          };
        }
      }),
    );

    res.json(tablesWithStats);
  } catch (error: any) {
    console.error("Error fetching tables:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tables from PostgreSQL",
      message: error.message,
    });
  }
});

// =======================
// DATABASE TABLE DATA EXPORT (superuser + password)
// =======================

router.get("/database/export", async (req, res) => {
  try {
    // 🔒 Superuser only
    if (req.user?.role !== "superuser") {
      return res.status(403).json({ success: false, error: "Superuser access required for data export" });
    }
    const { table, format } = req.query;

    if (!table || typeof table !== "string") {
      return res.status(400).json({
        success: false,
        error: "Table name is required",
      });
    }

    // Validate table name to prevent SQL injection
    const tableNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!tableNameRegex.test(table)) {
      return res.status(400).json({
        success: false,
        error: "Invalid table name",
      });
    }

    // Fetch table data
    const result = await db.execute(sql`SELECT * FROM ${sql.raw(table)}`);

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${table}.json"`,
      );
      res.json(result.rows);
    } else if (format === "csv") {
      const rows = result.rows as any[];
      if (rows.length === 0) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${table}.csv"`,
        );
        res.send("");
        return;
      }

      // Get headers from first row
      const headers = Object.keys(rows[0]);
      const csvContent = [
        headers.map((h) => `"${h}"`).join(","),
        ...rows.map((row) =>
          headers
            .map((h) => {
              const value = row[h];
              if (value === null) return "";
              if (typeof value === "string")
                return `"${value.replace(/"/g, '""')}"`;
              return value;
            })
            .join(","),
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${table}.csv"`,
      );
      res.send(csvContent);
    } else {
      return res.status(400).json({
        success: false,
        error: "Unsupported format. Use 'json' or 'csv'",
      });
    }
  } catch (error: any) {
    console.error("Error exporting table:", error);
    res.status(500).json({
      success: false,
      error: "Failed to export table data",
      message: error.message,
    });
  }
});

export default router;
