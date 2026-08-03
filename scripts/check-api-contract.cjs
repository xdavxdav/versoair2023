#!/usr/bin/env node
/**
 * API contract checker.
 *
 * Every bug found during the 2026-08-03 audit shared one root cause: a client
 * `fetch()` string that did not correspond to any Express route, failing
 * silently at runtime instead of loudly at build time.
 *
 * This script statically resolves:
 *   1. every route the server actually mounts (prefix from routes.ts +
 *      path declared inside the router file), and
 *   2. every `/api` or `/auth` path the client fetches,
 * then reports client paths with no matching server route.
 *
 * Usage:  node scripts/check-api-contract.cjs
 * Exit code 1 if unmatched paths are found, so it can gate CI.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SERVER_ROUTES = path.join(ROOT, "server", "routes");
const ROUTES_INDEX = path.join(ROOT, "server", "routes.ts");
const CLIENT_SRC = path.join(ROOT, "client", "src");

const METHODS = "get|post|put|patch|delete|all";

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

/**
 * Resolve an import specifier to a file on disk.
 * Handles the "@/" alias (-> client/src) and relative paths, trying the usual
 * extension/index permutations.
 */
function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = path.join(CLIENT_SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // bare package import
  const candidates = [
    base,
    base + ".ts",
    base + ".tsx",
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
}

/**
 * Files reachable from the app entry points. Anything outside this set is dead
 * code, and a broken path there cannot affect users — reporting it is noise.
 */
function reachableFiles() {
  const entries = [
    path.join(CLIENT_SRC, "main.tsx"),
    path.join(CLIENT_SRC, "main-music.tsx"),
  ].filter((f) => fs.existsSync(f));

  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    let src;
    try {
      src = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    // static imports, re-exports, and lazy(() => import("..."))
    for (const m of src.matchAll(
      /(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g,
    )) {
      const resolved = resolveImport(m[1], file);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

/** Collapse dynamic pieces so client and server paths can be compared. */
function normalize(p) {
  return (
    p
      .replace(/\?.*$/, "") // drop query string
      // A template hole that is NOT preceded by "/" is a suffix such as
      // `/api/x${params}` (a query string built elsewhere) rather than a path
      // segment — truncate there.
      .replace(/([^/])\$\{[^}]*\}.*$/, "$1")
      .replace(/\$\{[^}]*\}/g, ":p") // client template holes
      .replace(/:[A-Za-z0-9_]+/g, ":p") // server params
      .replace(/\/+$/, "") || "/"
  );
}

/** Remove comments so paths mentioned in prose aren't treated as calls. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

// ── 1. Router resolution ─────────────────────────────────────────────────────
const indexSrc = fs.readFileSync(ROUTES_INDEX, "utf8");
const serverPaths = new Set();

/** Resolve a router import to a file, supporting directory/index modules. */
function resolveRouter(spec, fromDir) {
  const base = path.resolve(fromDir, spec);
  for (const c of [base + ".ts", path.join(base, "index.ts"), base]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function joinPrefix(base, sub) {
  if (base === "/") return sub;
  return `${base}${sub === "/" ? "" : sub}`;
}

/**
 * Walk a router file, recording its routes and recursing into any sub-routers
 * it mounts. Routers are frequently directories with an index.ts that only
 * does `router.use("/x", subRouter)` (see server/routes/api-v1), so this must
 * be recursive or entire route trees go undiscovered.
 */
function collectRoutes(file, prefix, visited = new Set()) {
  const key = file + "|" + prefix;
  if (visited.has(key) || !fs.existsSync(file)) return;
  visited.add(key);

  const src = fs.readFileSync(file, "utf8");

  // NOTE: this codebase overwhelmingly writes multi-line declarations, e.g.
  //   router.post(\n     "/login",\n     handler)
  // so the path must be allowed to appear after arbitrary whitespace/newlines.
  for (const m of src.matchAll(
    new RegExp(`router\\.(?:${METHODS})\\(\\s*["']([^"']+)["']`, "gs"),
  )) {
    serverPaths.add(normalize(joinPrefix(prefix, m[1])));
  }

  // Sub-routers: router.use("/x", subRouter)
  for (const nested of src.matchAll(
    /router\.use\(\s*["']([^"']+)["']\s*,\s*(\w+)/g,
  )) {
    const [, subPrefix, subVar] = nested;
    const imp = src.match(
      new RegExp(`import\\s+${subVar}\\s+from\\s+["']([^"']+)["']`),
    );
    if (!imp) continue;
    const subFile = resolveRouter(imp[1], path.dirname(file));
    if (subFile) collectRoutes(subFile, joinPrefix(prefix, subPrefix), visited);
  }
}

// Map router variable -> file from the imports in server/routes.ts
const varToFile = {};
for (const m of indexSrc.matchAll(
  /import\s+(\w+)\s+from\s+["'](\.\/routes\/[\w/-]+)["']/g,
)) {
  const resolved = resolveRouter(m[2], path.dirname(ROUTES_INDEX));
  if (resolved) varToFile[m[1]] = resolved;
}

// ── 2. Routes declared directly on `app` inside routes.ts ────────────────────
for (const m of indexSrc.matchAll(
  new RegExp(`app\\.(?:${METHODS})\\(\\s*["']([^"']+)["']`, "gs"),
)) {
  serverPaths.add(normalize(m[1]));
}

// ── 3. Expand every mounted router tree ──────────────────────────────────────
for (const m of indexSrc.matchAll(
  /app\.use\(\s*["']([^"']+)["']\s*,\s*(\w+)/g,
)) {
  const [, prefix, varName] = m;
  if (varToFile[varName]) collectRoutes(varToFile[varName], prefix);
}

// ── 4. Collect client-side API paths ─────────────────────────────────────────
const live = reachableFiles();
const clientCalls = []; // { file, line, raw, norm, live }
for (const file of walk(CLIENT_SRC)) {
  const lines = stripComments(fs.readFileSync(file, "utf8")).split("\n");
  lines.forEach((line, i) => {
    // fetch("/api/..."), fetch(`/api/...`), apiRequest("/api/...")
    for (const m of line.matchAll(/["'`](\/(?:api|auth)\/[^"'`\s]*)["'`]/g)) {
      const raw = m[1];
      // Skip paths built from a variable prefix — cannot resolve statically.
      if (raw.includes("${") && raw.indexOf("${") === 0) continue;
      // Skip API *documentation* UIs that render endpoint paths as data
      // (e.g. <ApiEndpoint path="/api/..." desc="..."/> in CommandCenter, and
      // the endpoint table in pages/api.tsx). These are strings on screen, not
      // requests — a stale entry there is a docs problem, not broken code.
      if (/\bpath=|\bendpoint:|\bfullUrl:|\bdesc=/.test(line)) continue;
      // "/auth/..." is ALSO the client-side page route namespace (wouter
      // <Route path="/auth/signin">, <Link href="/auth/signin">), so only
      // treat it as an API call when the line actually issues a request.
      // NOTE: href/navigation is deliberately NOT request-like.
      if (
        raw.startsWith("/auth/") &&
        !/fetch\s*\(|apiRequest|axios|url\s*:/.test(line)
      ) {
        continue;
      }
      clientCalls.push({
        file: path.relative(ROOT, file),
        line: i + 1,
        raw,
        norm: normalize(raw),
        live: live.has(file),
      });
    }
  });
}

// ── 6. Match ─────────────────────────────────────────────────────────────────
const serverList = [...serverPaths];
const serverSegments = serverList.map((s) => s.split("/"));

/**
 * Segment-wise match. A param (":p") on EITHER side matches any single segment:
 * server params because /marketing/journal/pdf/weekly must resolve to
 * /marketing/journal/pdf/:type, and client params because a call built as
 * `/contracts/${id}/${action}` resolves at runtime to a literal route segment
 * such as /contracts/:id/accept.
 */
function pathMatches(clientSegs, serverSegs) {
  if (clientSegs.length !== serverSegs.length) return false;
  for (let i = 0; i < clientSegs.length; i++) {
    const s = serverSegs[i];
    const c = clientSegs[i];
    if (s === ":p" || s === "*" || c === ":p") continue;
    if (s !== c) return false;
  }
  return true;
}

function hasMatch(norm) {
  if (serverPaths.has(norm)) return true;
  const segs = norm.split("/");
  if (serverSegments.some((s) => pathMatches(segs, s))) return true;
  // A bare prefix that other routes extend (e.g. "/api/streaming") is almost
  // always a base-URL constant the code appends to, not an endpoint itself.
  return serverList.some((s) => s.startsWith(norm + "/"));
}

const unmatched = [];
const seen = new Set();
for (const c of clientCalls) {
  const key = c.norm + c.file + c.line;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!hasMatch(c.norm)) unmatched.push(c);
}

// ── 7. Report ────────────────────────────────────────────────────────────────
const liveBad = unmatched.filter((u) => u.live);
const deadBad = unmatched.filter((u) => !u.live);

console.log(
  `Server routes: ${serverPaths.size}  |  client API calls: ${clientCalls.length}  |  reachable client files: ${live.size}`,
);

function report(list, heading) {
  const byPath = new Map();
  for (const u of list) {
    if (!byPath.has(u.raw)) byPath.set(u.raw, []);
    byPath.get(u.raw).push(`${u.file}:${u.line}`);
  }
  console.log(`\n${heading} (${byPath.size} distinct path(s))\n`);
  for (const [p, locs] of [...byPath].sort()) {
    console.log(`  ${p}`);
    locs.slice(0, 3).forEach((l) => console.log(`      ${l}`));
    if (locs.length > 3) console.log(`      ...and ${locs.length - 3} more`);
  }
}

if (liveBad.length === 0) {
  console.log("\n✓ Every REACHABLE client API path resolves to a server route.");
} else {
  report(liveBad, "✗ BROKEN IN LIVE CODE — reachable from an app entry point:");
}

if (deadBad.length > 0) {
  report(
    deadBad,
    "· Unreachable (dead) code — not user-facing, informational only:",
  );
}

// Only live breakage should ever fail the build.
process.exit(liveBad.length > 0 ? 1 : 0);
