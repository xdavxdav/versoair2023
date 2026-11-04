/**
 * Real-Postgres integration test for the GeoAdmin create flows
 * (business, category, job, campaign, artist).
 *
 * For every flow it proves, over HTTP against the real routers and database:
 *   - the server-side role check holds (UI hiding is not authorization):
 *     only an invited Admin carrying the GeoAdmin code and the configured
 *     owner can create; everyone else is rejected and nothing is persisted;
 *   - the happy path really works end to end: 201, row persisted, audit row
 *     written, readable through the list/get endpoints, and updatable/deletable.
 *
 * Run against a disposable LOCAL database only (same convention as
 * ticket-workflow.test.mjs):
 *   TICKET_INTEGRATION_DATABASE_URL=postgresql://USER@127.0.0.1:PORT/DISPOSABLE_DB \
 *     node --import tsx --test scripts/tests/crud-flows.test.mjs
 */
import assert from "node:assert/strict";
import { after, before, test, mock } from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const databaseUrl = process.env.TICKET_INTEGRATION_DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Set TICKET_INTEGRATION_DATABASE_URL to an explicitly disposable LOCAL PostgreSQL database.");
}
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "isolated-crud-flows-test-secret-not-for-production";
const runId = crypto.randomUUID().slice(0, 8);
const ownerEmail = `owner_${runId}@example.test`;
process.env.SUPERADMIN_EMAIL = ownerEmail;
delete process.env.DISABLE_DB_CHECK;
// Empty (not deleted) so dotenv cannot re-inject real mail/webhook settings.
for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "ADMIN_EMAIL", "CONTACT_EMAIL", "ZAPIER_WEBHOOK_URL"]) {
  process.env[key] = "";
}

const { pool } = await import("../../server/db.ts");
const { ensureAllTables } = await import("../../server/services/ensure-tables.ts");
const { globalAuthGate } = await import("../../server/middleware/auth.ts");
const backgroundIntervals = [];
const createInterval = globalThis.setInterval;
const intervalMock = mock.method(globalThis, "setInterval", (...args) => {
  const timer = createInterval(...args);
  backgroundIntervals.push(timer);
  return timer;
});
const { default: adminRouter } = await import("../../server/routes/api-v1/admin/index.ts");
const { default: submissionRequests } = await import("../../server/routes/submission-requests.ts");
const { default: inventoryRouter } = await import("../../server/routes/inventory.ts");
intervalMock.mock.restore();

// ensureAllTables() does not create this table (production has it from migration 0000), so mirror it here.
const INVENTORY_TABLE_DDL = `CREATE TABLE IF NOT EXISTS inventory_products (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Other',
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT '0',
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT '0',
  supplier TEXT,
  warehouse_location TEXT,
  daily_sales_rate NUMERIC(10, 2) DEFAULT '0',
  last_restocked DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'In Stock',
  sector VARCHAR(50),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
)`;

let server, origin;
const users = {};
const tokens = {};
const fixture = {};

async function call(principal, method, path, body) {
  const token = tokens[principal];
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
}

const tagFor = (label) => `crud_${label}_${runId}_${crypto.randomUUID().slice(0, 6)}`;

const FLOWS = [
  {
    key: "category",
    path: "/api/v1/admin/categories",
    table: "business_categories",
    column: "slug",
    entity: "category",
    create: (tag) => ({ name: `Category ${tag}`, slug: tag, description: "crud test" }),
    update: (tag) => ({ name: `Category ${tag} v2`, slug: tag, description: "updated" }),
    missing: (tag) => ({ name: `Category ${tag}` }),
  },
  {
    key: "business",
    path: "/api/v1/admin/businesses",
    table: "businesses",
    column: "name",
    entity: "business",
    create: (tag) => ({
      name: tag,
      categoryId: fixture.categoryId,
      countryCode: "CI",
      cityName: "Abidjan",
      email: `${tag}@example.test`,
      phone: "+2250000000",
      description: "crud test",
    }),
    update: (tag) => ({ name: tag, categoryId: fixture.categoryId, description: "updated" }),
    missing: (tag) => ({ name: tag }),
  },
  {
    key: "job",
    path: "/api/v1/admin/jobs",
    table: "jobs",
    column: "title",
    entity: "job",
    create: (tag) => ({
      title: tag,
      company: "Crud Test Co",
      location: "Abidjan",
      type: "full-time",
      sector: "general",
      description: "crud test",
    }),
    update: (tag) => ({ title: tag, company: "Crud Test Co", description: "updated" }),
    missing: () => ({ company: "Crud Test Co" }),
  },
  {
    key: "campaign",
    path: "/api/v1/admin/campaigns",
    table: "ad_campaigns",
    column: "name",
    entity: "campaign",
    create: (tag) => ({
      name: tag,
      businessId: fixture.businessId,
      budget: "25.50",
      startDate: "2026-11-05",
      endDate: "2026-12-05",
      description: "crud test",
      status: "active",
    }),
    update: (tag) => ({
      name: tag,
      businessId: fixture.businessId,
      budget: "40",
      startDate: "2026-11-05",
      status: "paused",
    }),
    missing: (tag) => ({ name: tag }),
  },
  {
    key: "artist",
    path: "/api/v1/admin/artists",
    table: "artists",
    column: "stage_name",
    entity: "artist",
    create: (tag) => ({
      stageName: tag,
      genre: "Afrobeats",
      labelStatus: "unsigned",
      spotifyUrl: "https://open.spotify.com/artist/crud-test",
    }),
    update: (tag) => ({ stageName: tag, genre: "Jazz", labelStatus: "unsigned" }),
    missing: () => ({ genre: "Afrobeats" }),
  },
];

const DENIED = {
  anonymous: 401,
  user: 403,
  listener: 403,
  artist: 403,
  businessOwner: 403,
  moderator: 403,
  otherSuperuser: 403,
  adminWithoutGeoAdminCode: 401,
};
const ALLOWED = ["admin", "owner"];

async function countRows(flow, tag) {
  const result = await pool.query(`SELECT COUNT(*)::int AS n FROM ${flow.table} WHERE ${flow.column} = $1`, [tag]);
  return result.rows[0].n;
}

async function auditCount(flow, id) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS n FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 AND action = 'CREATE'",
    [flow.entity, String(id)],
  );
  return result.rows[0].n;
}

before(async () => {
  for (const table of ["arena_votes", "arena_brackets", "arena_contests"]) {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table}(id SERIAL PRIMARY KEY)`);
  }
  await ensureAllTables();
  await pool.query(INVENTORY_TABLE_DDL);
  const roles = {
    owner: "superuser",
    otherSuperuser: "superuser",
    admin: "admin",
    moderator: "moderator",
    user: "user",
    listener: "listener",
    artist: "artist",
    businessOwner: "business_owner",
  };
  for (const [key, role] of Object.entries(roles)) {
    const email = `${key}_${runId}@example.test`;
    const result = await pool.query(
      "INSERT INTO users(username,email,password,role,is_verified) VALUES ($1,$2,'not-a-login-password',$3,true) RETURNING id",
      [`crud_test_${key}_${crypto.randomUUID().slice(0, 8)}`, email, role],
    );
    users[key] = result.rows[0].id;
    const claims = { userId: String(users[key]), email, role, geoAdminCodeAuthenticated: true };
    if (key === "owner") claims.ownerMfa = true;
    tokens[key] = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: "10m" });
    if (key === "admin") {
      tokens.adminWithoutGeoAdminCode = jwt.sign(
        { userId: String(users[key]), email, role },
        process.env.JWT_SECRET,
        { expiresIn: "10m" },
      );
    }
  }

  const category = await pool.query(
    "INSERT INTO business_categories(name, slug) VALUES ($1, $2) RETURNING id",
    [`Fixture category ${runId}`, `fixture-category-${runId}`],
  );
  fixture.categoryId = category.rows[0].id;
  const business = await pool.query(
    "INSERT INTO businesses(name, category_id, country_code) VALUES ($1, $2, 'CI') RETURNING id",
    [`Fixture business ${runId}`, fixture.categoryId],
  );
  fixture.businessId = business.rows[0].id;
  fixture.businessName = `Fixture business ${runId}`;

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(globalAuthGate);
  app.use("/api/request", submissionRequests);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/inventory", inventoryRouter);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  backgroundIntervals.forEach(clearInterval);
  if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await pool.end();
});

test("every create flow rejects non-admin callers server-side and persists nothing", async () => {
  for (const flow of FLOWS) {
    for (const [principal, expected] of Object.entries(DENIED)) {
      const tag = tagFor(`${flow.key}_${principal}`);
      const result = await call(principal, "POST", flow.path, flow.create(tag));
      assert.equal(result.status, expected, `${principal} POST ${flow.path}: ${JSON.stringify(result.body)}`);
      assert.equal(await countRows(flow, tag), 0, `${principal} must not persist a ${flow.key}`);
    }
  }
});

test("invited admin and the owner create every entity: 201, persisted, audit-logged, readable", async () => {
  for (const flow of FLOWS) {
    for (const principal of ALLOWED) {
      const tag = tagFor(`${flow.key}_${principal}`);
      const created = await call(principal, "POST", flow.path, flow.create(tag));
      assert.equal(created.status, 201, `${principal} POST ${flow.path}: ${JSON.stringify(created.body)}`);
      const id = created.body?.data?.id;
      assert.ok(id !== undefined && id !== null, `${flow.key} response carries an id`);
      assert.equal(await countRows(flow, tag), 1, `${flow.key} persisted`);
      assert.equal(await auditCount(flow, id), 1, `${flow.key} audit row written`);

      const fetched = await call(principal, "GET", `${flow.path}/${id}`);
      assert.equal(fetched.status, 200, `GET ${flow.path}/${id}: ${JSON.stringify(fetched.body)}`);

      const listed = await call(principal, "GET", `${flow.path}?limit=100&search=${encodeURIComponent(tag.slice(0, 12))}`);
      assert.equal(listed.status, 200, `GET ${flow.path}: ${JSON.stringify(listed.body)}`);
      assert.ok(Array.isArray(listed.body?.data), `${flow.key} list returns data[]`);
    }
  }
});

test("admin can update and delete what it created; other roles cannot", async () => {
  for (const flow of FLOWS) {
    const tag = tagFor(`${flow.key}_cycle`);
    const created = await call("admin", "POST", flow.path, flow.create(tag));
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.data.id;

    for (const principal of Object.keys(DENIED)) {
      const put = await call(principal, "PUT", `${flow.path}/${id}`, flow.update(tag));
      assert.equal(put.status, DENIED[principal], `${principal} PUT ${flow.path}/${id}`);
      const del = await call(principal, "DELETE", `${flow.path}/${id}`);
      assert.equal(del.status, DENIED[principal], `${principal} DELETE ${flow.path}/${id}`);
    }
    assert.equal(await countRows(flow, tag), 1, `${flow.key} survives denied update/delete attempts`);

    const updated = await call("admin", "PUT", `${flow.path}/${id}`, flow.update(tag));
    assert.equal(updated.status, 200, `admin PUT ${flow.path}/${id}: ${JSON.stringify(updated.body)}`);
    const removed = await call("admin", "DELETE", `${flow.path}/${id}`);
    assert.equal(removed.status, 200, `admin DELETE ${flow.path}/${id}: ${JSON.stringify(removed.body)}`);
    assert.equal(await countRows(flow, tag), 0, `${flow.key} deleted`);
  }
});

test("admin create validates required fields instead of failing with a server error", async () => {
  for (const flow of FLOWS) {
    const tag = tagFor(`${flow.key}_invalid`);
    const result = await call("admin", "POST", flow.path, flow.missing(tag));
    assert.equal(result.status, 400, `${flow.path}: ${JSON.stringify(result.body)}`);
    assert.equal(await countRows(flow, tag), 0);
  }
});

test("campaign creation reports an unknown business as a clear client error", async () => {
  const tag = tagFor("campaign_nobusiness");
  const result = await call("admin", "POST", "/api/v1/admin/campaigns", {
    name: tag,
    businessId: 2147483000,
    budget: "10",
    startDate: "2026-11-05",
  });
  assert.equal(result.status, 404, JSON.stringify(result.body));
  assert.match(String(result.body?.error?.message), /business/i);
  assert.equal(await countRows(FLOWS.find((flow) => flow.key === "campaign"), tag), 0);
});

test("artist records come only from admin CRUD, never from public or self-service paths", async () => {
  const artistFlow = FLOWS.find((flow) => flow.key === "artist");
  const before = (await pool.query("SELECT COUNT(*)::int AS n FROM artists")).rows[0].n;
  const tag = tagFor("artist_request");
  for (const principal of [null, "user", "listener", "artist", "moderator"]) {
    await call(principal ?? "anonymous", "POST", "/api/request/artist", { stageName: tag, genre: "Afrobeats" });
  }
  assert.equal(await countRows(artistFlow, tag), 0, "artist requests must not create artist rows");
  const after = (await pool.query("SELECT COUNT(*)::int AS n FROM artists")).rows[0].n;
  assert.equal(after, before);
});

test("category: description, parent and main flag persist; bad parents are rejected", async () => {
  const tag = tagFor("category_ui");
  const created = await call("admin", "POST", "/api/v1/admin/categories", {
    name: `Category ${tag}`,
    slug: tag,
    description: "  Shown on the directory  ",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.data.id;
  const stored = (await pool.query("SELECT description, parent_id, main_category FROM business_categories WHERE id = $1", [id])).rows[0];
  assert.equal(stored.description, "Shown on the directory");
  assert.equal(stored.parent_id, null);
  assert.equal(stored.main_category, false);

  const duplicate = await call("admin", "POST", "/api/v1/admin/categories", { name: "Dup", slug: tag });
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.body.error.code, "DUPLICATE_SLUG");

  const child = await call("admin", "POST", "/api/v1/admin/categories", {
    name: `Child ${tag}`,
    slug: `${tag}-child`,
    parentId: id,
    mainCategory: false,
  });
  assert.equal(child.status, 201, JSON.stringify(child.body));
  assert.equal(child.body.data.parentId, id);

  const missingParent = await call("admin", "POST", "/api/v1/admin/categories", {
    name: "Orphan",
    slug: `${tag}-orphan`,
    parentId: 2147483000,
  });
  assert.equal(missingParent.status, 404);
  assert.equal(missingParent.body.error.code, "PARENT_NOT_FOUND");

  const selfParent = await call("admin", "PUT", `/api/v1/admin/categories/${id}`, { name: "Self", slug: tag, parentId: id });
  assert.equal(selfParent.status, 400);
  const loop = await call("admin", "PUT", `/api/v1/admin/categories/${id}`, { name: "Loop", slug: tag, parentId: child.body.data.id });
  assert.equal(loop.status, 400);
  assert.equal(loop.body.error.code, "INVALID_PARENT");

  // The edit dialog echoes the whole row back; nothing may be wiped by that.
  const echoed = await call("admin", "PUT", `/api/v1/admin/categories/${id}`, {
    ...created.body.data,
    description: "Edited",
  });
  assert.equal(echoed.status, 200, JSON.stringify(echoed.body));
  assert.equal(echoed.body.data.description, "Edited");
  // A client that sends only name + slug must not wipe description or parent.
  const minimal = await call("admin", "PUT", `/api/v1/admin/categories/${child.body.data.id}`, { name: "Renamed", slug: `${tag}-child` });
  assert.equal(minimal.status, 200);
  assert.equal(minimal.body.data.parentId, id);

  const fetched = await call("admin", "GET", `/api/v1/admin/categories/${id}`);
  assert.equal(fetched.body.data.description, "Edited");
});

test("business: the exact dashboard payload persists and shows in the country-filtered list", async () => {
  const tag = tagFor("business_ui");
  const created = await call("admin", "POST", "/api/v1/admin/businesses", {
    name: tag,
    categoryId: fixture.categoryId,
    email: "",
    phone: "",
    address: "1 Rue Test",
    description: "",
    regionId: "",
    regionName: "",
    cityName: "Abidjan",
    countryCode: "ci",
    latitude: "5.3599",
    longitude: "-4.0083",
    website: "",
    businessType: "retail",
    tags: "music, art",
    openingHours: "",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const row = (await pool.query("SELECT country_code, city_name, location, tags, is_active FROM businesses WHERE id = $1", [created.body.data.id])).rows[0];
  assert.equal(row.country_code, "CI");
  assert.equal(row.city_name, "Abidjan");
  assert.deepEqual(row.tags, ["music", "art"]);
  assert.equal(row.is_active, true);

  const listed = await call("admin", "GET", `/api/v1/admin/businesses?countryCode=CI&search=${encodeURIComponent(tag.slice(0, 14))}`);
  assert.equal(listed.status, 200);
  assert.ok(listed.body.data.some((business) => business.id === created.body.data.id), "new business is listed");

  const noCategory = await call("admin", "POST", "/api/v1/admin/businesses", { name: tag, categoryId: 2147483000 });
  assert.equal(noCategory.status, 404);
  assert.equal(noCategory.body.error.code, "CATEGORY_NOT_FOUND");
});

test("job: the exact dashboard payload persists, including country, and lists under that country", async () => {
  const tag = tagFor("job_ui");
  const payload = {
    title: tag,
    company: "Crud Test Co",
    type: "full-time",
    location: "Abidjan",
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    description: "crud test",
    sector: "general",
    department: "",
    experienceLevel: "entry",
    educationLevel: "bachelor",
    skills: ["music", "sales"],
    requirements: [],
    benefits: [],
    isRemote: false,
    isFeatured: false,
    countryCode: "ci",
  };
  const created = await call("admin", "POST", "/api/v1/admin/jobs", payload);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const row = (await pool.query("SELECT country_code, status, skills FROM jobs WHERE id = $1", [created.body.data.id])).rows[0];
  assert.equal(row.country_code, "CI");
  assert.equal(row.status, "active");
  assert.equal(row.skills, JSON.stringify(["music", "sales"]));

  const listed = await call("admin", "GET", `/api/v1/admin/jobs?countryCode=CI&search=${encodeURIComponent(tag.slice(0, 12))}`);
  assert.equal(listed.status, 200, JSON.stringify(listed.body));
  assert.ok(listed.body.data.some((job) => job.id === created.body.data.id), "new job is listed under its country");

  const invalid = await call("admin", "POST", "/api/v1/admin/jobs", { ...payload, title: tagFor("job_badcountry"), countryCode: "CIV" });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error.message, /countryCode/);

  const edited = await call("admin", "PUT", `/api/v1/admin/jobs/${created.body.data.id}`, { title: `${tag} v2` });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  assert.equal((await pool.query("SELECT country_code FROM jobs WHERE id = $1", [created.body.data.id])).rows[0].country_code, "CI");
});

test("artist: country persists on create and update and the country filter lists it", async () => {
  const tag = tagFor("artist_ui");
  const created = await call("admin", "POST", "/api/v1/admin/artists", {
    stageName: tag,
    genre: "Afrobeats",
    labelStatus: "unsigned",
    spotifyUrl: "",
    countryCode: "ci",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.data.id;
  assert.equal((await pool.query("SELECT country_code FROM artists WHERE id = $1", [id])).rows[0].country_code, "CI");

  const listed = await call("admin", "GET", `/api/v1/admin/artists?countryCode=CI&search=${encodeURIComponent(tag.slice(0, 14))}`);
  assert.equal(listed.status, 200, JSON.stringify(listed.body));
  assert.ok(listed.body.data.some((artist) => artist.id === id), "new artist is listed under its country");

  const moved = await call("admin", "PUT", `/api/v1/admin/artists/${id}`, { stageName: tag, countryCode: "fr" });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal((await pool.query("SELECT country_code FROM artists WHERE id = $1", [id])).rows[0].country_code, "FR");
  const kept = await call("admin", "PUT", `/api/v1/admin/artists/${id}`, { stageName: tag, genre: "Jazz" });
  assert.equal(kept.status, 200);
  assert.equal((await pool.query("SELECT country_code FROM artists WHERE id = $1", [id])).rows[0].country_code, "FR");

  const invalid = await call("admin", "POST", "/api/v1/admin/artists", { stageName: tagFor("artist_badcountry"), countryCode: "FRA" });
  assert.equal(invalid.status, 400);
});

test("campaign: both dashboard payload shapes persist in the real columns", async () => {
  const pageTag = tagFor("campaign_page");
  const fromPage = await call("admin", "POST", "/api/v1/admin/campaigns", {
    name: pageTag,
    businessId: fixture.businessId,
    budget: "120.5",
    startDate: "2026-11-05",
    endDate: "2026-12-05",
    description: "Brand awareness push",
    status: "active",
  });
  assert.equal(fromPage.status, 201, JSON.stringify(fromPage.body));
  const stored = (await pool.query("SELECT description, budget, status, business_id FROM ad_campaigns WHERE id = $1", [fromPage.body.data.id])).rows[0];
  assert.equal(stored.description, "Brand awareness push");
  assert.equal(stored.budget, "120.50");
  assert.equal(stored.business_id, fixture.businessId);
  assert.equal(fromPage.body.data.objective, "Brand awareness push");
  assert.equal(fromPage.body.data.dailyBudget, "120.50");
  assert.equal(fromPage.body.data.businessName, fixture.businessName, "the response names the business it belongs to");

  const sectionTag = tagFor("campaign_section");
  const fromSection = await call("admin", "POST", "/api/v1/admin/campaigns", {
    name: sectionTag,
    businessId: fixture.businessId,
    objective: "traffic",
    dailyBudget: 15,
    startDate: null,
    endDate: null,
    status: "draft",
  });
  assert.equal(fromSection.status, 201, JSON.stringify(fromSection.body));
  assert.equal(fromSection.body.data.status, "draft");
  assert.equal(fromSection.body.data.description, "traffic");
  assert.equal(fromSection.body.data.budget, "15.00");
  assert.ok(fromSection.body.data.startDate, "start date defaults to now");
  assert.equal(fromSection.body.data.endDate, null);

  // The campaigns page toggles status by PUT-ing the row back without a description.
  const id = fromPage.body.data.id;
  const toggled = await call("admin", "PUT", `/api/v1/admin/campaigns/${id}`, {
    name: pageTag,
    businessId: fixture.businessId,
    budget: fromPage.body.data.budget,
    startDate: fromPage.body.data.startDate,
    endDate: fromPage.body.data.endDate,
    status: "paused",
  });
  assert.equal(toggled.status, 200, JSON.stringify(toggled.body));
  assert.equal(toggled.body.data.status, "paused");
  assert.equal(toggled.body.data.description, "Brand awareness push", "toggling status must not wipe the description");
  assert.equal(toggled.body.data.budget, "120.50");
  assert.equal(toggled.body.data.businessName, fixture.businessName);

  const cleared = await call("admin", "PUT", `/api/v1/admin/campaigns/${id}`, {
    name: pageTag,
    businessId: fixture.businessId,
    endDate: null,
    description: "",
  });
  assert.equal(cleared.status, 200, JSON.stringify(cleared.body));
  assert.equal(cleared.body.data.endDate, null);
  assert.equal(cleared.body.data.description, null);

  const listed = await call("admin", "GET", `/api/v1/admin/campaigns?search=${encodeURIComponent(pageTag.slice(0, 14))}`);
  assert.equal(listed.status, 200, JSON.stringify(listed.body));
  assert.ok(listed.body.data.some((campaign) => campaign.id === id));
  assert.equal(listed.body.data.find((campaign) => campaign.id === id).businessName, fixture.businessName);

  const single = await call("admin", "GET", `/api/v1/admin/campaigns/${id}`);
  assert.equal(single.status, 200, JSON.stringify(single.body));
  assert.equal(single.body.data.businessName, fixture.businessName);
});

test("campaign: malformed input is a clear 4xx, never a database error", async () => {
  const base = { name: tagFor("campaign_bad"), businessId: fixture.businessId, startDate: "2026-11-05" };
  const cases = [
    [{ ...base, budget: "-5" }, 400, /budget/],
    [{ ...base, budget: "abc" }, 400, /budget/],
    [{ ...base, budget: "99999999999" }, 400, /budget/],
    [{ ...base, startDate: "not-a-date" }, 400, /startDate/],
    [{ ...base, endDate: "2026-10-01" }, 400, /endDate/],
    [{ ...base, businessId: "abc" }, 400, /businessId/],
    [{ ...base, name: "   " }, 400, /required/],
    [{ ...base, name: 42 }, 400, /required/],
    [{ ...base, status: "x".repeat(40) }, 400, /status/],
    [{ ...base, businessId: 2147483000 }, 404, /business/i],
  ];
  for (const [body, status, message] of cases) {
    const result = await call("admin", "POST", "/api/v1/admin/campaigns", body);
    assert.equal(result.status, status, JSON.stringify([body, result.body]));
    assert.match(String(result.body?.error?.message), message);
  }
  assert.equal(await countRows(FLOWS.find((flow) => flow.key === "campaign"), base.name), 0);

  const badId = await call("admin", "GET", "/api/v1/admin/campaigns/12");
  assert.equal(badId.status, 400);
  const unknown = await call("admin", "GET", `/api/v1/admin/campaigns/${crypto.randomUUID()}`);
  assert.equal(unknown.status, 404);
  const missingPut = await call("admin", "PUT", `/api/v1/admin/campaigns/${crypto.randomUUID()}`, base);
  assert.equal(missingPut.status, 404);
  const missingDelete = await call("admin", "DELETE", `/api/v1/admin/campaigns/${crypto.randomUUID()}`);
  assert.equal(missingDelete.status, 404);
});

test("inventory: any signed-in role adds products, but only to its own stock; nobody else can read, edit or delete them", async () => {
  const sku = tagFor("sku");
  const product = { name: `Product ${sku}`, sku, category: "Other", currentStock: 2, reorderPoint: 10, unitCost: "1.50", unitPrice: "3.00" };
  const countBySku = async () =>
    (await pool.query("SELECT COUNT(*)::int AS n FROM inventory_products WHERE sku = $1", [sku])).rows[0].n;

  const anonymous = await call("anonymous", "POST", "/api/inventory/products", product);
  assert.equal(anonymous.status, 401);
  assert.equal(await countBySku(), 0, "an anonymous caller must not persist a product");

  const created = await call("businessOwner", "POST", "/api/inventory/products", product);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.product.id;
  assert.equal(created.body.product.userId, users.businessOwner, "the product belongs to the caller, not to a body field");

  const invalid = await call("businessOwner", "POST", "/api/inventory/products", { sku: tagFor("nameless") });
  assert.equal(invalid.status, 400, JSON.stringify(invalid.body));
  const duplicate = await call("businessOwner", "POST", "/api/inventory/products", product);
  assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));
  const spoofed = await call("artist", "POST", "/api/inventory/products", { ...product, userId: users.businessOwner });
  assert.equal(spoofed.status, 201, "SKUs are unique per user, so the same SKU is free for someone else");
  assert.equal(spoofed.body.product.userId, users.artist, "a userId in the body is ignored");

  for (const stranger of ["user", "moderator", "admin"]) {
    const listed = await call(stranger, "GET", "/api/inventory/products?limit=200");
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    assert.ok(!listed.body.products.some((row) => row.sku === sku), `${stranger} must not see other users' products`);
    const stats = await call(stranger, "GET", "/api/inventory/stats");
    assert.equal(stats.body.stats.total_products, 0, `${stranger} stats only count their own products`);
    const alerts = await call(stranger, "GET", "/api/inventory/alerts");
    assert.equal(alerts.body.total, 0, `${stranger} alerts only cover their own products`);
    const predictions = await call(stranger, "GET", "/api/inventory/predictions");
    assert.equal(predictions.body.predictions.length, 0, `${stranger} predictions only cover their own products`);

    assert.equal((await call(stranger, "GET", `/api/inventory/products/${id}`)).status, 404, `${stranger} GET by id`);
    assert.equal((await call(stranger, "PUT", `/api/inventory/products/${id}`, { name: "hijacked" })).status, 404, `${stranger} PUT`);
    assert.equal((await call(stranger, "DELETE", `/api/inventory/products/${id}`)).status, 404, `${stranger} DELETE`);
  }
  const untouched = (await pool.query("SELECT name, user_id FROM inventory_products WHERE id = $1", [id])).rows[0];
  assert.equal(untouched.name, product.name, "denied edits changed nothing");
  assert.equal(untouched.user_id, users.businessOwner);

  const mine = await call("businessOwner", "GET", "/api/inventory/products?limit=200");
  assert.equal(mine.status, 200);
  assert.ok(mine.body.products.some((row) => row.id === id), "the owner sees their product");
  const mineAlerts = await call("businessOwner", "GET", "/api/inventory/alerts");
  assert.ok(mineAlerts.body.alerts.some((row) => row.id === id), "stock below the reorder point shows as an alert");

  const updated = await call("businessOwner", "PUT", `/api/inventory/products/${id}`, { currentStock: 40, name: "Renamed" });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.product.current_stock, 40);
  const removed = await call("businessOwner", "DELETE", `/api/inventory/products/${id}`);
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  assert.equal(
    (await pool.query("SELECT COUNT(*)::int AS n FROM inventory_products WHERE id = $1", [id])).rows[0].n,
    0,
  );
});
