import pg from "pg";
const { Pool } = pg;
import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";

import * as schema from "@shared/schema";

dotenv.config();

// Use versoair database credentials
export const pool = new Pool({
  user: process.env.PGUSER || "versoair",
  password: process.env.PGPASSWORD || "versoair2025",
  host: process.env.PGHOST || "localhost",
  port: parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "versoair_business_intelligence",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Add SSL option if needed for production
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Test the connection on startup
pool.on("connect", () => {
  console.log(
    "✅ Connected to PostgreSQL database: versoair_business_intelligence"
  );
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err);
});

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT NOW() as time, current_database() as db"
    );
    client.release();
    console.log("✅ Database connection test successful:", result.rows[0]);
    return {
      success: true,
      database: result.rows[0].db,
      time: result.rows[0].time,
    };
  } catch (error: any) {
    console.error("❌ Database connection test failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
