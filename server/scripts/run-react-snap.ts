import fs from "node:fs/promises";
import path from "node:path";

type ReactSnapModule = {
  run?: (options: Record<string, unknown>) => Promise<void>;
  default?: {
    run?: (options: Record<string, unknown>) => Promise<void>;
  };
};

async function readRoutesFromBuild(): Promise<string[]> {
  const routesPath = path.join(
    process.cwd(),
    "dist",
    "public",
    "prerender-routes.json",
  );

  const raw = await fs.readFile(routesPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Expected an array in ${routesPath}, got ${typeof parsed} instead.`,
    );
  }

  const routes = parsed
    .filter((route) => typeof route === "string")
    .map((route) => (route.startsWith("/") ? route : `/${route}`));

  if (routes.length === 0) {
    throw new Error(`No routes found in ${routesPath}`);
  }

  return routes;
}

async function run() {
  const routes = await readRoutesFromBuild();

  const mod = (await import("react-snap")) as ReactSnapModule;
  const runSnap = mod.run ?? mod.default?.run;
  if (!runSnap) {
    throw new Error("Could not resolve react-snap run() API");
  }

  console.log(`[react-snap] Snapshotting ${routes.length} routes...`);

  await runSnap({
    source: "dist/public",
    include: routes,
    crawl: false,
    waitFor: 'meta[property="og:title"]',
    skipThirdPartyRequests: true,
    removeBlobs: true,
    puppeteerArgs: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  console.log("[react-snap] Done.");
}

run().catch((error) => {
  console.error("[react-snap] Failed:", error);
  process.exitCode = 1;
});
