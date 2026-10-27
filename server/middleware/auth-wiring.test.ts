import assert from "node:assert/strict";
import { once } from "node:events";
import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test, { after } from "node:test";
import ts from "typescript";

type Use = { line: number; name: string };

/**
 * Exported `require*` functions of the auth middleware that build a
 * middleware instead of being one. Express calls a bare reference with
 * (req, res, next); that only returns a function, so the request never
 * answers.
 */
function middlewareFactoryNames(authSource: string): string[] {
  const file = ts.createSourceFile(
    "auth.ts",
    authSource,
    ts.ScriptTarget.Latest,
    true,
  );
  return file.statements.flatMap((node) => {
    if (
      !ts.isFunctionDeclaration(node) ||
      !node.name ||
      !node.name.text.startsWith("require") ||
      !ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      return [];
    }
    const first = node.parameters[0]?.name.getText(file) ?? "";
    return /^_?req$/.test(first) ? [] : [node.name.text];
  });
}

function findUncalledFactories(
  source: string,
  fileName: string,
  factories: string[],
): Use[] {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  // Only names this file imports from the auth middleware: a local function
  // that happens to share a name is a different thing.
  const names = new Set<string>();
  const collectNames = (node: ts.Node) => {
    if (
      ts.isImportSpecifier(node) &&
      factories.includes((node.propertyName ?? node.name).text)
    ) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, collectNames);
  };
  collectNames(file);

  const uses: Use[] = [];
  const visit = (node: ts.Node) => {
    const isMember =
      ts.isIdentifier(node) &&
      ts.isPropertyAccessExpression(node.parent) &&
      node.parent.name === node;
    if (
      ts.isIdentifier(node) &&
      (isMember ? factories.includes(node.text) : names.has(node.text))
    ) {
      const parent = node.parent;
      const isCallee = (target: ts.Node) =>
        ts.isCallExpression(target.parent) &&
        target.parent.expression === target;
      const isDeclaredName =
        ts.isImportSpecifier(parent) ||
        ts.isExportSpecifier(parent) ||
        ts.isImportClause(parent) ||
        ts.isNamespaceImport(parent) ||
        ((ts.isFunctionDeclaration(parent) ||
          ts.isVariableDeclaration(parent) ||
          ts.isParameter(parent) ||
          ts.isBindingElement(parent)) &&
          parent.name === node) ||
        (ts.isPropertyAssignment(parent) && parent.name === node);
      const ok = isDeclaredName
        ? true
        : ts.isPropertyAccessExpression(parent) && parent.name === node
          ? isCallee(parent)
          : isCallee(node);
      if (!ok) {
        uses.push({
          line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
          name: node.text,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return uses;
}

test("scanner flags uncalled factories, including multi-line and aliased uses", () => {
  const bad = `
    import { requireAuth, requireSuperuser as su } from "../middleware/auth";
    router.post("/a", requireAuth, handler);
    router.post(
      "/b",
      su,
      handler,
    );
    router.use(auth.requireAuth);
    const guard = requireAuth;
    router.get("/c", [requireAuth], handler);
  `;
  const good = `
    import { requireAuth } from "../middleware/auth";
    router.post("/a", requireAuth(), handler);
    router.post("/b", requireAuth(["admin"]), handler);
    router.use(auth.requireAuth());
    export { requireAuth };
  `;
  const localMiddleware = `
    function requireSuperuser(req, res, next) { next(); }
    router.get("/x", requireSuperuser, handler);
  `;
  const factories = ["requireAuth", "requireSuperuser"];
  assert.deepEqual(
    findUncalledFactories(bad, "bad.ts", factories).map((use) => use.line),
    [3, 6, 9, 10, 11],
  );
  assert.deepEqual(findUncalledFactories(good, "good.ts", factories), []);
  assert.deepEqual(
    findUncalledFactories(localMiddleware, "local.ts", factories),
    [],
  );
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" ? [] : sourceFiles(full);
    }
    return full.endsWith(".ts") &&
      !full.endsWith(".test.ts") &&
      !full.endsWith(".d.ts")
      ? [full]
      : [];
  });
}

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const factories = middlewareFactoryNames(
  readFileSync(path.join(serverDir, "middleware/auth.ts"), "utf8"),
);

test("the factory list comes from the auth middleware itself", () => {
  assert.ok(factories.includes("requireAuth"));
  assert.ok(factories.includes("requireSuperuser"));
  for (const direct of ["requireOwner", "requireAdminPanel", "requireGeoAdminCode"]) {
    assert.ok(!factories.includes(direct), `${direct} is a middleware, not a factory`);
  }
});

test("no server file passes an auth middleware factory without calling it", () => {
  const offenders = sourceFiles(serverDir).flatMap((file) =>
    findUncalledFactories(readFileSync(file, "utf8"), file, factories).map(
      (use) => `${path.relative(serverDir, file)}:${use.line} ${use.name}`,
    ),
  );
  assert.deepEqual(
    offenders,
    [],
    "Call the factory: requireAuth(), not requireAuth. A bare reference never answers the request.",
  );
});

const PROBES: Array<{ method: "GET" | "POST"; path: string; allowed: number[] }> = [
  { method: "POST", path: "/api/paypal/create-order", allowed: [401] },
  { method: "POST", path: "/api/paypal/capture-order", allowed: [401] },
  { method: "GET", path: "/api/paypal/success", allowed: [401] },
  { method: "GET", path: "/api/wallet/balance", allowed: [401] },
  { method: "GET", path: "/api/wallet/transactions", allowed: [401] },
  { method: "POST", path: "/api/wallet/deposit", allowed: [401] },
  { method: "POST", path: "/api/wallet/game-reward", allowed: [401] },
  { method: "POST", path: "/api/music/tracks/1/purchase", allowed: [401] },
  { method: "POST", path: "/api/music/purchase", allowed: [401] },
  { method: "GET", path: "/api/music/my-purchases", allowed: [401] },
  { method: "POST", path: "/api/games/challenge", allowed: [401] },
  { method: "POST", path: "/api/games/1/join", allowed: [401] },
  { method: "POST", path: "/api/games/1/answer", allowed: [401] },
  { method: "GET", path: "/api/games/my", allowed: [401] },
  { method: "POST", path: "/api/games/verify-age", allowed: [401] },
  { method: "GET", path: "/api/escrow/anything", allowed: [401, 503] },
  { method: "GET", path: "/api/migrate/anything", allowed: [401] },
];

test("routes that used a bare requireAuth answer anonymous requests instead of hanging", async () => {
  const previous = {
    url: process.env.DATABASE_URL,
    secret: process.env.JWT_SECRET,
  };
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:1/test";
  process.env.JWT_SECRET = "x".repeat(40);

  const { default: express } = await import("express");
  const { pool } = await import("../db");
  const routers = {
    paypal: (await import("../routes/paypal")).default,
    wallet: (await import("../routes/wallet")).default,
    music: (await import("../routes/music")).default,
    games: (await import("../routes/games")).default,
    escrow: (await import("../routes/escrow")).default,
    migrate: (await import("../routes/migrate")).default,
  };

  // No global auth gate on purpose: each route's own guard must answer.
  const app = express();
  app.use(express.json());
  for (const [name, router] of Object.entries(routers)) {
    app.use(`/api/${name}`, router);
  }
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    const results = await Promise.all(
      PROBES.map(async (probe) => {
        const started = Date.now();
        try {
          const response = await fetch(origin + probe.path, {
            method: probe.method,
            headers: { "Content-Type": "application/json" },
            body: probe.method === "POST" ? "{}" : undefined,
            signal: AbortSignal.timeout(3000),
          });
          await response.arrayBuffer();
          return {
            probe,
            status: response.status,
            ms: Date.now() - started,
          };
        } catch {
          return { probe, status: 0, ms: Date.now() - started };
        }
      }),
    );
    const failures = results
      .filter((r) => !r.probe.allowed.includes(r.status))
      .map(
        (r) =>
          `${r.probe.method} ${r.probe.path} -> ${r.status || "NO RESPONSE"} after ${r.ms}ms`,
      );
    assert.deepEqual(failures, []);
  } finally {
    server.closeAllConnections?.();
    server.close();
    await pool.end().catch(() => {});
    if (previous.url === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.url;
    if (previous.secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.secret;
  }
});

// Route modules may leave timers running; the checks above are already done.
after(() => {
  setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref();
});
