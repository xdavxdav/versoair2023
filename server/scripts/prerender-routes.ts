import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const BASE_ROUTES = [
  "/",
  "/businesses-directory",
  "/commerce",
  "/hotellerie",
  "/batiment",
  "/automobile",
  "/finances",
  "/divertissement",
];

async function buildRouteList() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to build prerender route list from active businesses.",
    );
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query<{ id: number | string }>(
      `SELECT id
       FROM businesses
       WHERE is_active = true
       ORDER BY updated_at DESC
       LIMIT 50000`,
    );

    const dynamicBusinessRoutes = result.rows.map((row) => `/business/${row.id}`);
    const allRoutes = Array.from(
      new Set([...BASE_ROUTES, ...dynamicBusinessRoutes]),
    );

    const publicDir = path.join(process.cwd(), "client", "public");
    await fs.mkdir(publicDir, { recursive: true });

    const jsonPath = path.join(publicDir, "prerender-routes.json");
    const txtPath = path.join(publicDir, "prerender-routes.txt");

    await fs.writeFile(jsonPath, JSON.stringify(allRoutes, null, 2) + "\n", "utf8");
    await fs.writeFile(txtPath, allRoutes.join("\n") + "\n", "utf8");

    console.log(
      `[prerender-routes] Wrote ${allRoutes.length} routes to ${path.relative(process.cwd(), jsonPath)} and ${path.relative(process.cwd(), txtPath)}`,
    );
  } finally {
    await pool.end();
  }
}

buildRouteList().catch((error) => {
  console.error("[prerender-routes] Failed:", error);
  process.exitCode = 1;
});
