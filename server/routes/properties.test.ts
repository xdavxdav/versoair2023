import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import test, { after, afterEach, beforeEach, mock } from "node:test";

process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/test";
process.env.JWT_SECRET = "x".repeat(40);
delete process.env.SUPERADMIN_EMAIL;

const propertiesRouter = (await import("./properties")).default;
const { normalizeOwnerEmail } = await import("./properties");
const { db, pool } = await import("../db");
const { users, activeSessions } = await import("@shared/schema");
const { PgDialect } = await import("drizzle-orm/pg-core");

const OWNER_EMAIL = "Owner.Person@Example.com";

let accountRow: Record<string, unknown>;
let listingRows: unknown[];
let listingFilter: unknown;
let inserted: Record<string, unknown> | undefined;

function chain(rows: unknown[], onWhere?: (filter: unknown) => void) {
  const query: Record<string, unknown> = {
    from: () => query,
    where: (filter: unknown) => {
      onWhere?.(filter);
      return query;
    },
    orderBy: () => query,
    limit: () => query,
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return query;
}

beforeEach(() => {
  accountRow = {
    id: 7,
    email: OWNER_EMAIL,
    role: "customer",
    subscriptionTier: "free",
    subscriptionStatus: "active",
    premiumExpiresAt: null,
    trialTier: null,
    trialExpiresAt: null,
    isVerified: true,
  };
  listingRows = [];
  listingFilter = undefined;
  inserted = undefined;

  mock.method(db, "select", () => ({
    from(table: unknown) {
      if (table === activeSessions) return chain([]);
      if (table === users) return chain([accountRow]);
      return chain(listingRows, (filter) => {
        listingFilter = filter;
      });
    },
  }));
  mock.method(db, "insert", () => ({
    values(values: Record<string, unknown>) {
      inserted = values;
      return { returning: async () => [{ id: 99, ...values }] };
    },
  }));
});

afterEach(() => mock.restoreAll());

async function withServer(fn: (origin: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use("/", propertiesRouter);
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

function signedIn() {
  const token = jwt.sign(
    { userId: 7, email: OWNER_EMAIL, role: "customer" },
    process.env.JWT_SECRET!,
  );
  return { Authorization: `Bearer ${token}` };
}

const listing = {
  name: "Villa Riviera",
  type: "villa",
  city: "Abidjan",
  price: "15000000",
};

function publish(origin: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${origin}/api/properties`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  });
}

test("normalizeOwnerEmail trims and lower-cases, and rejects anything else", () => {
  assert.equal(normalizeOwnerEmail("  Owner.Person@Example.com "), "owner.person@example.com");
  for (const value of ["", "   ", undefined, null, 42, {}]) {
    assert.equal(normalizeOwnerEmail(value), null);
  }
});

test("my listings are matched on the signed-in e-mail, case-insensitively, whatever their status", async () => {
  listingRows = [
    { id: 2, name: "Pending villa", verified: false, verificationStatus: "unverified" },
    { id: 1, name: "Live flat", verified: true, verificationStatus: "verified" },
  ];
  await withServer(async (origin) => {
    const res = await fetch(`${origin}/api/properties/mine`, {
      headers: signedIn(),
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.deepEqual(
      body.data.map((row: { id: number }) => row.id),
      [2, 1],
    );
  });

  const rendered = new PgDialect().sqlToQuery(listingFilter as never);
  assert.match(rendered.sql, /lower\("properties"\."host_email"\) = \$1/);
  assert.deepEqual(rendered.params, ["owner.person@example.com"]);
});

test("my listings are not served to anonymous visitors, and are not mistaken for a property id", async () => {
  await withServer(async (origin) => {
    const res = await fetch(`${origin}/api/properties/mine`, {
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(res.status, 401);
  });
  assert.equal(listingFilter, undefined);
});

test("a malformed property id is still answered with 404", async () => {
  await withServer(async (origin) => {
    const res = await fetch(`${origin}/api/properties/abc`, {
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(res.status, 404);
  });
});

test("a published listing is stored unverified under the signed-in e-mail, never one from the body", async () => {
  await withServer(async (origin) => {
    const res = await publish(
      origin,
      { ...listing, hostEmail: "someone.else@example.com", hostPhone: "+2250102030405" },
      signedIn(),
    );
    assert.equal(res.status, 201);
    assert.equal((await res.json()).success, true);
  });
  assert.equal(inserted?.hostEmail, "owner.person@example.com");
  assert.equal(inserted?.hostPhone, "+2250102030405");
  assert.equal(inserted?.verified, false);
});

test("publishing needs a sign-in and writes nothing without one", async () => {
  await withServer(async (origin) => {
    const res = await publish(origin, listing);
    assert.equal(res.status, 401);
    assert.equal((await res.json()).error.code, "AUTH_REQUIRED");
  });
  assert.equal(inserted, undefined);
});

test("publishing reports which fields are missing and writes nothing", async () => {
  await withServer(async (origin) => {
    const res = await publish(origin, { name: "Villa Riviera" }, signedIn());
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /name, type, city, and price/);
  });
  assert.equal(inserted, undefined);
});

test("read-only GeoAdmin subscribers still cannot publish", async () => {
  accountRow.subscriptionTier = "max";
  await withServer(async (origin) => {
    const res = await publish(origin, listing, signedIn());
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, "GEOADMIN_SUBSCRIBER_READ_ONLY");
  });
  assert.equal(inserted, undefined);
});

after(async () => {
  mock.restoreAll();
  await pool.end().catch(() => {});
});
