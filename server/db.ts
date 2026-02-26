import pg from "pg";
const { Pool } = pg;
import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";

import * as schema from "@shared/schema";

dotenv.config();

// Use DATABASE_URL in production (Neon, Render Postgres, etc.)
// Fall back to individual PG* env vars for local dev
const databaseUrl = process.env.DATABASE_URL;
const isRemoteDb =
  databaseUrl &&
  !databaseUrl.includes("localhost") &&
  !databaseUrl.includes("127.0.0.1");

const poolConfig = isRemoteDb
  ? {
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.PGUSER || "versoair",
      password: process.env.PGPASSWORD || "versoair2025",
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432"),
      database: process.env.PGDATABASE || "versoair_business_intelligence",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

console.log(
  "🔌 [DB] Using",
  isRemoteDb ? "DATABASE_URL (remote)" : "local PG* env vars",
);

export const pool = new Pool(poolConfig);

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Test the connection on startup
pool.on("connect", () => {
  console.log(
    "✅ Connected to PostgreSQL database: versoair_business_intelligence",
  );
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL pool error:", err);
});

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT NOW() as time, current_database() as db",
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
