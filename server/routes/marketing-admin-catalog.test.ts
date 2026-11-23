import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import test, { afterEach, beforeEach } from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";

const router = (await import("./marketing")).default;

const OWNER = "owner@example.com";
const savedOwner = process.env.SUPERADMIN_EMAIL;

beforeEach(() => {
  process.env.SUPERADMIN_EMAIL = OWNER;
});

afterEach(() => {
  if (savedOwner === undefined) delete process.env.SUPERADMIN_EMAIL;
  else process.env.SUPERADMIN_EMAIL = savedOwner;
});

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(router, fn, { path: "/api/marketing" });

function ownerHeaders(): Record<string, string> {
  signIn({ id: 1, role: "superuser", email: OWNER });
  const token = jwt.sign(
    {
      userId: 1,
      email: OWNER,
      role: "superuser",
      ownerMfa: true,
      geoAdminCodeAuthenticated: true,
    },
    process.env.JWT_SECRET!,
  );
  return { Authorization: `Bearer ${token}` };
}

function nonOwnerAdminHeaders(): Record<string, string> {
  signIn({ id: 2, role: "admin", email: "staff@example.com" });
  const token = jwt.sign(
    {
      userId: 2,
      email: "staff@example.com",
      role: "admin",
      geoAdminCodeAuthenticated: true,
    },
    process.env.JWT_SECRET!,
  );
  return { Authorization: `Bearer ${token}` };
}

test("only the owner can read or mutate the marketing shop catalog", async () => {
  await serve(async (origin) => {
    assert.equal(
      (await call(origin, "GET", "/api/marketing/admin/catalog")).status,
      401,
    );
    const staffHeaders = nonOwnerAdminHeaders();
    assert.equal(
      (
        await call(origin, "GET", "/api/marketing/admin/catalog", {
          headers: staffHeaders,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(origin, "POST", "/api/marketing/admin/packs", {
          headers: staffHeaders,
          body: { name: "Starter Pack", tier: "basic", priceCents: 4900 },
        })
      ).status,
      403,
    );
  });
});

test("owner can list, create, and update marketing packs with CAD validation", async () => {
  const headers = ownerHeaders();
  const dbLog = scriptPool((sql, params) => {
    if (sql.includes("FROM marketing_packs mp")) {
      return {
        rows: [
          {
            id: 10,
            name: "Starter Pack",
            slug: "starter-pack",
            tier: "basic",
            price_cents: 14900,
            active: true,
            items: [{ id: 1, name: "Logo kit", included: true }],
          },
        ],
      };
    }
    if (sql.includes("SELECT * FROM print_products")) {
      return { rows: [] };
    }
    if (sql.includes("SELECT id FROM marketing_packs WHERE slug = $1")) {
      return params[0] === "duplicate-pack" ? { rows: [{ id: 99 }] } : { rows: [] };
    }
    if (sql.includes("INSERT INTO marketing_packs")) {
      return {
        rows: [
          {
            id: 11,
            name: params[0],
            slug: params[1],
            tier: params[2],
            description: params[3],
            price_cents: params[4],
            features: JSON.parse(String(params[5])),
            active: params[6],
            sort_order: params[7],
          },
        ],
      };
    }
    if (sql.startsWith("UPDATE marketing_packs SET")) {
      const targetId = params[params.length - 1];
      if (targetId === 404) return { rows: [] };
      return {
        rows: [
          {
            id: targetId,
            name: "Launch Pack",
            slug: "launch-pack",
            tier: "premium",
            price_cents: 29900,
            active: false,
          },
        ],
      };
    }
    return { rows: [] };
  });

  await serve(async (origin) => {
    const listRes = await call(origin, "GET", "/api/marketing/admin/catalog", {
      headers,
    });
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.packs.length, 1);
    assert.equal(listRes.body.data.packs[0].price_cents, 14900);

    // Rejects sub-dollar / non-integer prices
    const badPrice = await call(origin, "POST", "/api/marketing/admin/packs", {
      headers,
      body: { name: "Too Cheap", tier: "basic", priceCents: 50 },
    });
    assert.equal(badPrice.status, 400);

    // Rejects duplicate slugs cleanly
    const dupSlug = await call(origin, "POST", "/api/marketing/admin/packs", {
      headers,
      body: {
        name: "Duplicate Pack",
        tier: "standard",
        priceCents: 19900,
      },
    });
    assert.equal(dupSlug.status, 409);

    // Creates pack + pack_items inside a transaction
    const created = await call(origin, "POST", "/api/marketing/admin/packs", {
      headers,
      body: {
        name: "Growth Pack",
        tier: "premium",
        priceCents: 24900,
        description: "Full campaign assets",
        features: ["Social templates", "Print flyer PDF"],
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.slug, "growth-pack");
    assert.equal(created.body.data.price_cents, 24900);
    assert.equal(dbLog.matching("INSERT INTO pack_items").length, 2);

    // Updates price and active flag
    const patched = await call(
      origin,
      "PATCH",
      "/api/marketing/admin/packs/11",
      {
        headers,
        body: { priceCents: 29900, active: false },
      },
    );
    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.active, false);

    // Unknown pack returns 404
    const missing = await call(
      origin,
      "PATCH",
      "/api/marketing/admin/packs/404",
      {
        headers,
        body: { active: true },
      },
    );
    assert.equal(missing.status, 404);
  });
});

test("owner can create and update print products in CAD", async () => {
  const headers = ownerHeaders();
  scriptPool((sql, params) => {
    if (sql.includes("SELECT id FROM print_products WHERE slug = $1")) {
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO print_products")) {
      return {
        rows: [
          {
            id: 21,
            name: params[0],
            slug: params[1],
            category: params[2],
            description: params[3],
            specs: JSON.parse(String(params[4])),
            price_cents: params[5],
            turnaround_days: params[6],
            active: params[7],
          },
        ],
      };
    }
    if (sql.startsWith("UPDATE print_products SET")) {
      return {
        rows: [
          {
            id: params[params.length - 1],
            name: "500 Business Cards",
            slug: "500-business-cards",
            category: "business_cards",
            price_cents: 4500,
            turnaround_days: 5,
            active: true,
          },
        ],
      };
    }
    return { rows: [] };
  });

  await serve(async (origin) => {
    const badCat = await call(
      origin,
      "POST",
      "/api/marketing/admin/print-products",
      {
        headers,
        body: {
          name: "Mystery Item",
          category: "unknown_cat",
          priceCents: 3500,
        },
      },
    );
    assert.equal(badCat.status, 400);

    const created = await call(
      origin,
      "POST",
      "/api/marketing/admin/print-products",
      {
        headers,
        body: {
          name: "500 Business Cards",
          category: "business_cards",
          priceCents: 3900,
          turnaroundDays: 4,
          specs: { dpi_min: 300, finish: "matte", stock: "16pt" },
        },
      },
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.data.slug, "500-business-cards");
    assert.equal(created.body.data.price_cents, 3900);
    assert.equal(created.body.data.specs.finish, "matte");

    const updated = await call(
      origin,
      "PATCH",
      "/api/marketing/admin/print-products/21",
      {
        headers,
        body: { priceCents: 4500, turnaroundDays: 5 },
      },
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.price_cents, 4500);
  });
});
