// Add this to server/routes.ts - Admin cleanup endpoint
import { Router } from "express";
import { db } from "@/db";
import { businesses, businessCategories } from "@db/schema";
import { type Business } from "@shared/schema"; // Import actual schema type
import { eq, inArray, and, count, sql } from "drizzle-orm";

const router = Router();

router.post("/api/admin/cleanup-test-data", async (req, res) => {
  try {
    console.log("🧹 [CLEANUP] Starting test data removal...");

    // Delete test finance businesses
    const result1 = await db
      .delete(businesses)
      .where(
        and(
          eq(businesses.categoryId, 5),
          inArray(businesses.slug, [
            "global-banking-solutions",
            "forex-exchange-pro",
            "investment-capital-group",
            "microfinance-international",
            "digital-wallet-services",
            "stock-brokerage-plus",
            "insurance-protect-ltd",
            "asset-management-pro",
            "fintech-innovations-inc",
            "crypto-exchange-hub",
          ]),
        ),
      );

    console.log("✓ Deleted test finance businesses");

    // Delete other test records
    const result2 = await db
      .delete(businesses)
      .where(inArray(businesses.id, [1, 2]));
    console.log("✓ Deleted test businesses (ID 1-2)");

    // Get current counts
    const bizCount = await db.select({ count: count() }).from(businesses);
    const catCount = await db
      .select({ count: count() })
      .from(businessCategories);

    res.json({
      success: true,
      message: "Test data cleanup complete",
      deleted: {
        financeBusinesses: result1.rowCount || 0,
        testBusinesses: result2.rowCount || 0,
      },
      current: {
        totalBusinesses: bizCount[0]?.count || 0,
        totalCategories: catCount[0]?.count || 0,
      },
    });
  } catch (error: any) {
    console.error("❌ Cleanup error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/api/admin/check-pool-tables", async (req, res) => {
  try {
    const poolTables = [
      "restaurants_businesses",
      "hotellerie_businesses",
      "technology_businesses",
      "healthcare_businesses",
      "commerce_businesses",
      "retail_businesses",
      "automobile_businesses",
      "advertising_businesses",
      "divertissement_businesses",
    ];

    const tableStatus: Record<string, any> = {};

    for (const table of poolTables) {
      try {
        const result = await db.execute(
          sql`SELECT COUNT(*) as count FROM ${sql.identifier(table)}`,
        );
        tableStatus[table] = {
          exists: true,
          recordCount: result.rows[0]?.count || 0,
        };
      } catch {
        tableStatus[table] = {
          exists: false,
          recordCount: 0,
        };
      }
    }

    res.json({
      success: true,
      poolTables: tableStatus,
      message: "Pool table status check complete",
    });
  } catch (error: any) {
    console.error("❌ Pool table check error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
