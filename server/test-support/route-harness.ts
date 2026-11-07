// Shared plumbing for the hermetic route tests: no database, no network.
// Import it before any router so the environment is ready (see ./env).
import "./env";
import assert from "node:assert/strict";
import { once } from "node:events";
import type { RequestHandler, Router } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import { PgDialect } from "drizzle-orm/pg-core";
import { after, afterEach, beforeEach, mock } from "node:test";
import { activeSessions, users } from "@shared/schema";
import { db, pool } from "../db";

export { db, pool };

export interface TestAccount {
  id: number;
  role: string;
  email?: string;
}

let current: TestAccount | undefined;
let sessionUser: TestAccount | undefined;
const tableRows = new Map<unknown, unknown[]>();

function chain(rows: unknown[]) {
  const query: Record<string, unknown> = {};
  for (const method of [
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "innerJoin",
    "leftJoin",
    "groupBy",
    "having",
  ]) {
    query[method] = () => query;
  }
  query.execute = async () => rows;
  query.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(rows).then(resolve, reject);
  return query;
}

/** Rows that db.select().from(table) resolves to, for tables other than users. */
export function setTableRows(table: unknown, rows: unknown[]) {
  tableRows.set(table, rows);
}

beforeEach(() => {
  current = undefined;
  sessionUser = undefined;
  tableRows.clear();
  // requireAuth() re-reads the live account and the revoked-session list.
  mock.method(db, "select", () => ({
    from(table: unknown) {
      if (table === activeSessions) return chain([]);
      if (table === users) {
        return chain(
          current
            ? [
                {
                  id: current.id,
                  email: current.email ?? `user${current.id}@example.com`,
                  role: current.role,
                  subscriptionTier: "free",
                  subscriptionStatus: "active",
                  premiumExpiresAt: null,
                  trialTier: null,
                  trialExpiresAt: null,
                  isVerified: true,
                },
              ]
            : [],
        );
      }
      return chain(tableRows.get(table) ?? []);
    },
  }));
});

afterEach(() => mock.restoreAll());

// The pg pool keeps the event loop alive, so end the test process explicitly.
after(() => setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref());

/** Signs in as `account`: returns the Authorization header for the next request(s). */
export function signIn(account: TestAccount): Record<string, string> {
  current = account;
  const token = jwt.sign(
    {
      userId: account.id,
      email: account.email ?? `user${account.id}@example.com`,
      role: account.role,
    },
    process.env.JWT_SECRET!,
  );
  return { Authorization: `Bearer ${token}` };
}

/**
 * For routers that rely on the global auth gate instead of requireAuth():
 * mount `injectSession` before the router and call `actAs(account)` per request.
 * Like the real gate, it exposes the id as a string.
 */
export function actAs(account: TestAccount | undefined) {
  sessionUser = account;
}

export const injectSession: RequestHandler = (req, _res, next) => {
  if (sessionUser) {
    (req as any).user = {
      userId: String(sessionUser.id),
      id: String(sessionUser.id),
      email: sessionUser.email ?? `user${sessionUser.id}@example.com`,
      role: sessionUser.role,
    };
  }
  next();
};

export interface RecordedQuery {
  sql: string;
  params: unknown[];
}

export type SqlHandler = (
  sql: string,
  params: unknown[],
) => { rows: any[]; rowCount?: number } | undefined;

const dialect = new PgDialect();

/**
 * Replaces db.execute(sql`...`) with a scripted handler. The drizzle template
 * is rendered to its text and bound parameters first, exactly as pg would see it.
 */
export function scriptExecute(handler: SqlHandler) {
  const log: RecordedQuery[] = [];
  mock.method(db, "execute", (async (query: unknown) => {
    const rendered = dialect.sqlToQuery(query as never);
    const text = rendered.sql.replace(/\s+/g, " ").trim();
    log.push({ sql: text, params: rendered.params });
    const result = handler(text, rendered.params) ?? { rows: [] };
    return { rowCount: result.rows.length, ...result };
  }) as never);

  return {
    log,
    matching: (fragment: string) =>
      log.filter((entry) => entry.sql.includes(fragment)),
  };
}

/**
 * Replaces pool.query and pool.connect().query with a scripted handler.
 * Statements are normalised to single spaces. Unhandled statements (DDL such as
 * CREATE TABLE) resolve to no rows.
 */
export function scriptPool(handler: SqlHandler) {
  const log: RecordedQuery[] = [];
  let connections = 0;
  let released = 0;

  const run = async (text: string, params: unknown[] = []) => {
    const sql = text.replace(/\s+/g, " ").trim();
    log.push({ sql, params });
    const result = handler(sql, params) ?? { rows: [] };
    return { rowCount: result.rows.length, ...result };
  };

  mock.method(pool, "query", run as never);
  mock.method(pool, "connect", (async () => {
    connections++;
    return {
      query: run,
      release() {
        released++;
      },
    };
  }) as never);

  return {
    log,
    get connections() {
      return connections;
    },
    get released() {
      return released;
    },
    /** Statements whose text includes `fragment`. */
    matching: (fragment: string) =>
      log.filter((entry) => entry.sql.includes(fragment)),
  };
}

export interface ServerOptions {
  path?: string;
  /** Mounted before the router, e.g. a body parser or a stub for req.user. */
  before?: RequestHandler[];
  json?: boolean;
}

export async function withRouter(
  router: Router,
  fn: (origin: string) => Promise<void>,
  options: ServerOptions = {},
) {
  const app = express();
  for (const handler of options.before ?? []) app.use(handler);
  if (options.json !== false) app.use(express.json());
  app.use(options.path ?? "/", router);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
}

export interface CallOptions {
  headers?: Record<string, string>;
  body?: unknown;
}

export async function call(
  origin: string,
  method: string,
  path: string,
  options: CallOptions = {},
) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(3000),
  });
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  return { status: response.status, body, text };
}
