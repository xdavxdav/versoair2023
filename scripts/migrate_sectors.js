#!/usr/bin/env node

/**
 * Migration Runner: Sector Data → Attributes Column
 * Safely migrates sector-specific business tables into JSONB attributes
 *
 * Usage:
 *   node migrate_sectors.js              # Run migration
 *   node migrate_sectors.js --verify     # Verify data only
 *   node migrate_sectors.js --rollback   # Rollback (if available)
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(color, ...args) {
  console.log(`${colors[color]}${args.join(" ")}${colors.reset}`);
}

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    log("bright", "\n🚀 SECTOR DATA MIGRATION\n");
    log("cyan", "━".repeat(50));

    // Test connection
    log("blue", "🔌 Testing database connection...");
    const conn = await pool.connect();
    const result = await conn.query("SELECT NOW() as now");
    conn.release();
    log("green", "✅ Connected to database at", result.rows[0].now);

    // Check if attributes column exists
    log("blue", "\n🔍 Verifying schema...");
    const schemaCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'businesses' AND column_name = 'attributes'
    `);

    if (schemaCheck.rows.length === 0) {
      log("red", "❌ ERROR: attributes column not found in businesses table");
      log("yellow", "💡 Create it first with:");
      log(
        "dim",
        "  ALTER TABLE businesses ADD COLUMN attributes JSONB DEFAULT '{}'::jsonb;",
      );
      process.exit(1);
    }
    log("green", "✅ Schema verified - attributes column exists");

    // List sector tables
    log("blue", "\n📋 Available sector tables:");
    const sectorTables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (
        'healthcare_businesses',
        'automobile_businesses', 
        'finance_businesses',
        'restaurants_businesses'
      )
      ORDER BY tablename
    `);

    if (sectorTables.rows.length === 0) {
      log("yellow", "⚠️  No sector tables found");
      process.exit(0);
    }

    for (const table of sectorTables.rows) {
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM ${table.tablename}`,
      );
      const count = countResult.rows[0].count;
      log("cyan", `  • ${table.tablename}: ${count} records`);
    }

    // Run the migration SQL
    log("blue", "\n⚙️  Running migration script...");
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, "migrate_sectors_to_attributes.sql"),
      "utf8",
    );

    await pool.query(migrationSQL);
    log("green", "✅ Migration completed successfully");

    // Verification
    log("blue", "\n📊 Verification Report:");
    const verifyResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN attributes IS NOT NULL AND attributes != '{}' THEN 1 ELSE 0 END) as with_attributes,
        SUM(CASE WHEN attributes IS NULL OR attributes = '{}' THEN 1 ELSE 0 END) as without_attributes
      FROM businesses
    `);

    const { total, with_attributes, without_attributes } = verifyResult.rows[0];
    log("cyan", `  Total Businesses: ${total}`);
    log("green", `  ✅ With Attributes: ${with_attributes}`);
    log("yellow", `  ⚠️  Without Attributes: ${without_attributes}`);

    // Show sample data
    log("blue", "\n📈 Sample Migrated Data:");
    const sampleData = await pool.query(`
      SELECT id, name, attributes 
      FROM businesses 
      WHERE attributes IS NOT NULL AND attributes != '{}' 
      LIMIT 3
    `);

    for (const row of sampleData.rows) {
      log("cyan", `\n  ID: ${row.id} | Name: ${row.name}`);
      log("dim", `  Attributes: ${JSON.stringify(row.attributes, null, 2)}`);
    }

    log("green", "\n✨ Migration Complete!");
    log("yellow", "\n💡 Next Steps:");
    log("dim", "  1. Verify the migrated data matches your expectations");
    log("dim", "  2. Test your application thoroughly");
    log("dim", "  3. When ready, drop the old sector tables:");
    log("dim", "     DROP TABLE IF EXISTS healthcare_businesses CASCADE;");
    log("dim", "     DROP TABLE IF EXISTS automobile_businesses CASCADE;");
    log("dim", "     DROP TABLE IF EXISTS finance_businesses CASCADE;");
    log("dim", "     DROP TABLE IF EXISTS restaurants_businesses CASCADE;");
    log("cyan", "\n" + "━".repeat(50) + "\n");
  } catch (error) {
    log("red", "\n❌ Migration failed!");
    log("red", "Error:", error.message);
    if (error.detail) {
      log("red", "Details:", error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function verifyOnly() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    log("bright", "\n🔍 VERIFICATION MODE\n");

    const result = await pool.query(`
      SELECT 
        'healthcare_businesses' as table_name,
        COUNT(*) as record_count,
        MAX(business_id) as max_business_id
      FROM healthcare_businesses
      UNION ALL
      SELECT 
        'automobile_businesses',
        COUNT(*),
        MAX(business_id)
      FROM automobile_businesses
      WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automobile_businesses')
    `);

    for (const row of result.rows) {
      log("cyan", `${row.table_name}: ${row.record_count} records`);
    }
  } finally {
    await pool.end();
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.includes("--verify")) {
  verifyOnly();
} else {
  runMigration();
}
