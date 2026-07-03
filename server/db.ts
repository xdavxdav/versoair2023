import pg from "pg";
const { Pool } = pg;
import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";

import * as schema from "@shared/schema";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "❌ [FATAL] DATABASE_URL environment variable is not set. Refusing to start.",
  );
  process.exit(1);
}

const isRemoteDb =
  !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");

const poolConfig = isRemoteDb
  ? {
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      // rejectUnauthorized: true is the default and must stay enabled for remote DBs
      ssl: true,
    }
  : {
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

export const pool = new Pool(poolConfig);

export const db = drizzle(pool, { schema });

pool.on("error", (err) => {
  console.error("[DB] Pool error:", err);
});

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT NOW() as time, current_database() as db",
    );
    client.release();
    return {
      success: true,
      database: result.rows[0].db,
      time: result.rows[0].time,
    };
  } catch (error: any) {
    console.error("[DB] Connection test failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};
