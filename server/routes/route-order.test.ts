import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// Express runs the first matching route, so `/things/:id` declared above `/things/search`
// swallows "search" as an id and the specific route never runs.

interface DeclaredRoute {
  verb: string;
  path: string;
  line: number;
}

interface ShadowedRoute {
  verb: string;
  path: string;
  line: number;
  shadowedBy: string;
  shadowedByLine: number;
}

const DECLARATION =
  /\b(?:router|app)\.(get|post|put|patch|delete)\(\s*(\[[^\]]*\]|"[^"]+"|'[^']+')/g;

function listRoutes(source: string): DeclaredRoute[] {
  const routes: DeclaredRoute[] = [];
  for (const match of Array.from(source.matchAll(DECLARATION))) {
    const line = source.slice(0, match.index).split("\n").length;
    const literals = match[2].match(/["']([^"']+)["']/g) ?? [];
    for (const literal of literals) {
      const routePath = literal.slice(1, -1);
      if (routePath.startsWith("/")) {
        routes.push({ verb: match[1], path: routePath, line });
      }
    }
  }
  return routes;
}

function matcherFor(routePath: string): RegExp | null {
  // Constrained params such as :id(\\d+) only match some values, so they are left alone.
  if (routePath.includes("(") || routePath.includes("*")) return null;
  const pattern = routePath
    .replace(/[.+?^${}|[\]\\]/g, "\\$&")
    .replace(/:[A-Za-z_]+/g, "[^/]+");
  return new RegExp(`^${pattern}/?$`);
}

export function findShadowedRoutes(source: string): ShadowedRoute[] {
  const routes = listRoutes(source);
  const shadowed: ShadowedRoute[] = [];
  routes.forEach((earlier, index) => {
    if (!earlier.path.includes(":")) return;
    const matcher = matcherFor(earlier.path);
    if (!matcher) return;
    for (const later of routes.slice(index + 1)) {
      if (later.verb !== earlier.verb || later.path.includes(":")) continue;
      if (matcher.test(later.path)) {
        shadowed.push({
          verb: later.verb,
          path: later.path,
          line: later.line,
          shadowedBy: earlier.path,
          shadowedByLine: earlier.line,
        });
      }
    }
  });
  return shadowed;
}

// Unreachable today and not called by the app. Declare them above the parameter route to switch them on.
const KNOWN_UNREACHABLE = new Set([
  "server/routes/marketing.ts DELETE /cart/purge-expired",
  "server/routes/oauth.ts GET /oauth/status",
]);

const serverDir = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = path.resolve(serverDir, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : sourceFiles(full);
    }
    return /\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)
      ? [full]
      : [];
  });
}

test("a parameter route declared first hides a specific route declared after it", () => {
  const source = [
    'router.get("/api/things/:id", handler);',
    'router.get(',
    '  "/api/things/pending",',
    "  handler,",
    ");",
  ].join("\n");
  assert.deepEqual(findShadowedRoutes(source), [
    {
      verb: "get",
      path: "/api/things/pending",
      line: 2,
      shadowedBy: "/api/things/:id",
      shadowedByLine: 1,
    },
  ]);
});

test("the specific route is fine when it is declared first", () => {
  const source = [
    'router.get("/api/things/pending", handler);',
    'router.get("/api/things/:id", handler);',
  ].join("\n");
  assert.deepEqual(findShadowedRoutes(source), []);
});

test("different verbs and deeper paths do not count as shadowed", () => {
  const source = [
    'router.get("/api/things/:id", handler);',
    'router.post("/api/things/pending", handler);',
    'router.get("/api/things/stats/summary", handler);',
    'router.get("/api/other/pending", handler);',
  ].join("\n");
  assert.deepEqual(findShadowedRoutes(source), []);
});

test("array paths and single quotes are read", () => {
  const source = [
    "router.get('/a/:id', handler);",
    "router.get(['/a/list', '/b/list'], handler);",
  ].join("\n");
  assert.deepEqual(
    findShadowedRoutes(source).map((route) => route.path),
    ["/a/list"],
  );
});

test("no server route is hidden by an earlier parameter route", () => {
  const unexpected: string[] = [];
  for (const file of sourceFiles(serverDir)) {
    const relative = path.relative(repoRoot, file).split(path.sep).join("/");
    for (const route of findShadowedRoutes(readFileSync(file, "utf8"))) {
      const key = `${relative} ${route.verb.toUpperCase()} ${route.path}`;
      if (KNOWN_UNREACHABLE.has(key)) continue;
      unexpected.push(
        `${key} (line ${route.line}) is hidden by ${route.shadowedBy} (line ${route.shadowedByLine}); declare it first`,
      );
    }
  }
  assert.deepEqual(unexpected, []);
});
