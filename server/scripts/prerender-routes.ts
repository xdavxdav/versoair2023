import fs from "node:fs/promises";
import path from "node:path";
import { PUBLIC_STATIC_ROUTES } from "../utils/seo-routes";

// Only static routes are prerendered: react-snap has no API/database behind it, so
// dynamic pages such as /business/:id would snapshot as error pages without JSON-LD.
// Business pages are covered by the sitemap and rendered client-side by <SeoHead>.
async function buildRouteList() {
  const routes = PUBLIC_STATIC_ROUTES.map((route) => route.path);

  const publicDir = path.join(process.cwd(), "client", "public");
  await fs.mkdir(publicDir, { recursive: true });

  const jsonPath = path.join(publicDir, "prerender-routes.json");
  const txtPath = path.join(publicDir, "prerender-routes.txt");

  await fs.writeFile(jsonPath, JSON.stringify(routes, null, 2) + "\n", "utf8");
  await fs.writeFile(txtPath, routes.join("\n") + "\n", "utf8");

  console.log(
    `[prerender-routes] Wrote ${routes.length} routes to ${path.relative(process.cwd(), jsonPath)} and ${path.relative(process.cwd(), txtPath)}`,
  );
}

buildRouteList().catch((error) => {
  console.error("[prerender-routes] Failed:", error);
  process.exitCode = 1;
});
