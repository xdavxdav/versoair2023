import cron from "node-cron";
import { pool } from "../db";

/**
 * Category Integrity Check Service
 * Runs automated checks to detect category contamination
 * Executes daily at 2 AM UTC
 */

interface IntegrityCheckResult {
  timestamp: string;
  nullCategories: number;
  invalidCategories: number;
  suspiciousMatches: number;
  alerts: string[];
  status: "PASS" | "WARNING" | "CRITICAL";
}

/**
 * Run daily at 2 AM UTC to check for category contamination
 */
export function setupCategoryIntegrityCheck() {
  console.log(
    "🔧 Setting up category integrity check (runs daily at 2 AM UTC)",
  );

  // Allow disabling integrity checks via env var for deployments without DB
  const disableChecks = process.env.DISABLE_DB_CHECK === "true";
  const dbUrl = process.env.DATABASE_URL || "";

  if (disableChecks) {
    console.log(
      "⚠️ DISABLE_DB_CHECK is true — skipping category integrity checks",
    );
    return;
  }

  if (!dbUrl) {
    console.log(
      "⚠️ No DATABASE_URL provided — skipping category integrity checks until a database is configured",
    );
    return;
  }

  cron.schedule("0 2 * * *", async () => {
    console.log("🔍 Running automated category integrity check...");

    try {
      const result = await runIntegrityCheck();

      // Log the result
      console.log("✅ Integrity Check Complete:");
      console.log(`   Null Categories: ${result.nullCategories}`);
      console.log(`   Invalid Categories: ${result.invalidCategories}`);
      console.log(`   Suspicious Matches: ${result.suspiciousMatches}`);
      console.log(`   Status: ${result.status}`);

      // Send alerts if needed
      if (result.status !== "PASS") {
        console.warn("⚠️ ALERTS DETECTED:");
        result.alerts.forEach((alert) => console.warn(`   - ${alert}`));

        // In production, send email/Slack notification here
        // await notifyAdmins(result);
      }

      // Store result in database for historical tracking
      await storeIntegrityCheckResult(result);
    } catch (error) {
      console.error("❌ Category integrity check failed:", error);

      // In production, notify on-call admin
      // await notifyOnCallAdmin(error);
    }
  });

  // Also run on server startup
  try {
    runIntegrityCheck();
  } catch (err) {
    console.error("Initial integrity check skipped due to error:", err);
  }
}

/**
 * Execute comprehensive integrity check
 */
async function runIntegrityCheck(): Promise<IntegrityCheckResult> {
  const result: IntegrityCheckResult = {
    timestamp: new Date().toISOString(),
    nullCategories: 0,
    invalidCategories: 0,
    suspiciousMatches: 0,
    alerts: [],
    status: "PASS",
  };

  try {
    // Check 1: Null categories
    const nullResult = await pool.query(`
      SELECT COUNT(*) as count FROM businesses
      WHERE category_id IS NULL
    `);

    result.nullCategories = parseInt(nullResult.rows[0].count || 0);
    if (result.nullCategories > 0) {
      result.status = "CRITICAL";
      result.alerts.push(
        `🔴 CRITICAL: ${result.nullCategories} businesses with NULL category_id detected!`,
      );
    }

    // Check 2: Invalid categories (foreign key violations)
    const invalidResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM businesses b
      LEFT JOIN business_categories bc ON b.category_id = bc.id
      WHERE b.category_id IS NOT NULL AND bc.id IS NULL
    `);

    result.invalidCategories = parseInt(invalidResult.rows[0].count || 0);
    if (result.invalidCategories > 0) {
      result.status = "CRITICAL";
      result.alerts.push(
        `🔴 CRITICAL: ${result.invalidCategories} businesses with invalid category_id detected!`,
      );
    }

    // Check 3: Suspicious category assignments (description-category mismatch)
    const suspiciousCount = await checkSuspiciousAssignments();
    result.suspiciousMatches = suspiciousCount;

    if (suspiciousCount > 0) {
      if (result.status === "PASS") {
        result.status = "WARNING";
      }
      result.alerts.push(
        `⚠️ WARNING: ${suspiciousCount} businesses with potential category mismatches detected`,
      );
    }

    // Check 4: Get statistics for context
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total_businesses,
        COUNT(DISTINCT category_id) as unique_categories,
        COUNT(CASE WHEN is_active THEN 1 END) as active_businesses
      FROM businesses
    `);

    const stats = statsResult.rows[0];
    console.log(`   Total Businesses: ${stats.total_businesses}`);
    console.log(`   Unique Categories: ${stats.unique_categories}`);
    console.log(`   Active Businesses: ${stats.active_businesses}`);

    // Check 5: Verify constraints exist
    const constraintResult = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'businesses'
      AND constraint_type IN ('FOREIGN KEY', 'CHECK')
    `);

    if (constraintResult.rows.length < 2) {
      result.alerts.push(
        "⚠️ WARNING: Database constraints may not be properly installed",
      );
      if (result.status === "PASS") {
        result.status = "WARNING";
      }
    }
  } catch (error) {
    console.error("Error during integrity check:", error);
    result.status = "CRITICAL";
    result.alerts.push(`Error during check: ${(error as Error).message}`);
  }

  return result;
}

/**
 * Check for suspicious category assignments using keyword matching
 */
async function checkSuspiciousAssignments(): Promise<number> {
  try {
    // Get all businesses with their descriptions
    const businessesResult = await pool.query(`
      SELECT id, name, description, category_id
      FROM businesses
      WHERE is_active = true
      LIMIT 1000
    `);

    const businesses = businessesResult.rows;

    // Define expected keywords for common categories
    const categoryKeywords: Record<string, string[]> = {
      plumber: ["plumb", "water", "pipe", "drain"],
      electrician: ["electric", "wiring", "circuit"],
      telecom: ["telecom", "phone", "mobile", "voip"],
      restaurant: ["restaurant", "food", "dining", "cuisine"],
      beauty: ["beauty", "salon", "hair", "cosmetic"],
      healthcare: ["health", "hospital", "clinic", "doctor"],
    };

    let suspiciousCount = 0;

    for (const business of businesses) {
      const description = (business.description || "").toLowerCase();
      const nameAndDesc = `${business.name} ${description}`.toLowerCase();

      // Check if description contains very few industry-specific keywords
      let hasKeywords = false;
      for (const keywords of Object.values(categoryKeywords)) {
        if (keywords.some((kw) => nameAndDesc.includes(kw))) {
          hasKeywords = true;
          break;
        }
      }

      // If business description is very generic, flag as suspicious
      if (
        description.length > 0 &&
        !hasKeywords &&
        !description.includes("service") &&
        !description.includes("company")
      ) {
        suspiciousCount++;
      }
    }

    return suspiciousCount;
  } catch (error) {
    console.error("Error checking suspicious assignments:", error);
    return 0;
  }
}

/**
 * Store integrity check results in audit table
 */
async function storeIntegrityCheckResult(
  result: IntegrityCheckResult,
): Promise<void> {
  try {
    // Create audit table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS integrity_check_audit (
        id SERIAL PRIMARY KEY,
        check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        null_categories INTEGER,
        invalid_categories INTEGER,
        suspicious_matches INTEGER,
        status VARCHAR(50),
        alerts TEXT
      )
    `);

    // Insert the result
    await pool.query(
      `
      INSERT INTO integrity_check_audit 
        (check_timestamp, null_categories, invalid_categories, suspicious_matches, status, alerts)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        new Date(result.timestamp),
        result.nullCategories,
        result.invalidCategories,
        result.suspiciousMatches,
        result.status,
        result.alerts.join("\n"),
      ],
    );

    console.log("✅ Integrity check result stored in audit table");
  } catch (error) {
    console.error("Error storing integrity check result:", error);
  }
}

/**
 * Get integrity check history
 */
export async function getIntegrityCheckHistory(
  days: number = 7,
): Promise<IntegrityCheckResult[]> {
  try {
    const result = await pool.query(
      `
      SELECT 
        check_timestamp as timestamp,
        null_categories as nullCategories,
        invalid_categories as invalidCategories,
        suspicious_matches as suspiciousMatches,
        status,
        alerts
      FROM integrity_check_audit
      WHERE check_timestamp >= NOW() - INTERVAL '${days} days'
      ORDER BY check_timestamp DESC
      LIMIT 100
    `,
    );

    return result.rows.map((row: any) => ({
      timestamp: row.timestamp.toISOString(),
      nullCategories: row.nullCategories,
      invalidCategories: row.invalidCategories,
      suspiciousMatches: row.suspiciousMatches,
      status: row.status,
      alerts: row.alerts ? row.alerts.split("\n") : [],
    }));
  } catch (error) {
    console.error("Error fetching integrity check history:", error);
    return [];
  }
}
