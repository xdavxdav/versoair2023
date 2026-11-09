import assert from "node:assert/strict";
import { after, before, test } from "node:test";
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
process.env.JWT_SECRET = "isolated-fiche-integration-test-secret-not-for-production";
delete process.env.DISABLE_DB_CHECK;

const { pool } = await import("../../server/db.ts");
const { ensureAllTables } = await import("../../server/services/ensure-tables.ts");
const { default: businesses } = await import("../../server/routes/businesses.ts");
const { getDirectoryCountryCode } = await import("../../server/utils/business-visibility.ts");

const runId = crypto.randomUUID().slice(0, 8);
const users = {};
const tokens = {};
let server, origin, businessId, categoryId;

async function request(user, path, method = "GET", body) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(user ? { Authorization: `Bearer ${tokens[user]}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

const fiche = {
  sector: "restaurant",
  timezone: "America/Toronto",
  services: ["Catering", "Dine-in"],
  team: "Four cooks",
  kpis: [{ label: "Covers", value: "120" }],
  opening_hours: { monday: "09:00-17:00", sunday: "closed" },
  social_links: { instagram: "https://instagram.com/shop" },
};
const row = async () =>
  (await pool.query("SELECT attributes, opening_hours, social_links FROM businesses WHERE id=$1", [businessId])).rows[0];

before(async () => {
  for (const table of ["arena_votes", "arena_brackets", "arena_contests"]) {
    await pool.query(`CREATE TABLE IF NOT EXISTS ${table}(id SERIAL PRIMARY KEY)`);
  }
  await ensureAllTables();
  await ensureAllTables();
  for (const [key, role] of Object.entries({
    owner: "user", stranger: "user", moderator: "moderator", admin: "admin",
  })) {
    const email = `${key}_${runId}@example.test`;
    const result = await pool.query(
      "INSERT INTO users(username,email,password,role,is_verified,subscription_tier) VALUES ($1,$2,'x',$3,true,$4) RETURNING id",
      [`fiche_${key}_${runId}`, email, role, key === "owner" ? "premium" : "free"],
    );
    users[key] = result.rows[0].id;
    tokens[key] = jwt.sign(
      { userId: String(users[key]), email, role, geoAdminCodeAuthenticated: true },
      process.env.JWT_SECRET,
      { expiresIn: "10m" },
    );
  }
  categoryId = (
    await pool.query("INSERT INTO business_categories(name, slug) VALUES ($1,$2) RETURNING id", [
      `Fiche cat ${runId}`, `fiche-cat-${runId}`,
    ])
  ).rows[0].id;
  businessId = (
    await pool.query(
      `INSERT INTO businesses(name, category_id, country_code, owner_id, is_verified, is_active, attributes)
       VALUES ($1,$2,$3,$4,true,true,$5) RETURNING id`,
      [`Fiche business ${runId}`, categoryId, getDirectoryCountryCode(), users.owner, JSON.stringify({ keep: "me" })],
    )
  ).rows[0].id;
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/", businesses);
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server?.close(resolve));
  await pool.query("DELETE FROM audit_logs WHERE entity_type='business' AND entity_id=$1", [String(businessId)]).catch(() => {});
  await pool.query("DELETE FROM businesses WHERE id=$1", [businessId]);
  await pool.query("DELETE FROM business_categories WHERE id=$1", [categoryId]);
  await pool.query("DELETE FROM users WHERE id = ANY($1)", [Object.values(users)]);
  await pool.end();
});

test("anonymous callers cannot read, write or probe the fiche editor", async () => {
  for (const [path, method, body] of [
    [`/api/businesses/${businessId}/fiche`, "GET"],
    [`/api/businesses/${businessId}/fiche`, "PUT", fiche],
    [`/api/businesses/${businessId}/fiche/access`, "GET"],
  ]) {
    assert.equal((await request(null, path, method, body)).status, 401, `${method} ${path}`);
  }
});

test("a stranger is refused and nothing is written", async () => {
  const before = await row();
  const put = await request("stranger", `/api/businesses/${businessId}/fiche`, "PUT", fiche);
  assert.equal(put.status, 403);
  assert.equal((await request("stranger", `/api/businesses/${businessId}/fiche`)).status, 403);
  assert.deepEqual(await row(), before);
  const access = await request("stranger", `/api/businesses/${businessId}/fiche/access`);
  assert.equal(access.status, 200);
  assert.equal(access.body.canEdit, false);
});

test("invalid input is a 400 and leaves the row untouched", async () => {
  const before = await row();
  for (const bad of [
    { opening_hours: { monday: "9 to 5" } },
    { social_links: { facebook: "javascript:alert(1)" } },
    { services: "not a list" },
  ]) {
    const result = await request("owner", `/api/businesses/${businessId}/fiche`, "PUT", bad);
    assert.equal(result.status, 400, JSON.stringify(bad));
    assert.ok(result.body.error);
  }
  assert.deepEqual(await row(), before);
});

test("the owner saves; other attributes survive; an audit row is written", async () => {
  const put = await request("owner", `/api/businesses/${businessId}/fiche`, "PUT", fiche);
  assert.equal(put.status, 200, JSON.stringify(put.body));
  const saved = await row();
  assert.equal(saved.attributes.keep, "me");
  assert.deepEqual(saved.attributes.sectorData.services, ["Catering", "Dine-in"]);
  assert.equal(saved.opening_hours.monday, "09:00-17:00");
  assert.equal(saved.social_links.instagram, "https://instagram.com/shop");
  const audit = await pool.query(
    "SELECT 1 FROM audit_logs WHERE action='UPDATE_BUSINESS_FICHE' AND entity_id=$1",
    [String(businessId)],
  );
  assert.equal(audit.rowCount, 1);
  const back = await request("owner", `/api/businesses/${businessId}/fiche`);
  assert.equal(back.status, 200);
  assert.equal(back.body.data.team, "Four cooks");
  assert.equal((await request("owner", `/api/businesses/${businessId}/fiche/access`)).body.canEdit, true);
});

test("staff can edit and are told so", async () => {
  for (const staff of ["moderator", "admin"]) {
    assert.equal((await request(staff, `/api/businesses/${businessId}/fiche/access`)).body.canEdit, true);
    const put = await request(staff, `/api/businesses/${businessId}/fiche`, "PUT", { ...fiche, team: `By ${staff}` });
    assert.equal(put.status, 200, JSON.stringify(put.body));
  }
  assert.equal((await row()).attributes.sectorData.team, "By admin");
});

test("the public page exposes the fiche and the tier but no private fields", async () => {
  const res = await request(null, `/api/businesses/${businessId}`);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const data = res.body.data ?? res.body;
  assert.equal(data.tier, "premium");
  assert.equal(data.sector_data.services[0], "Catering");
  assert.equal(data.opening_hours.sunday, "closed");
  assert.equal(data.social_links.instagram, "https://instagram.com/shop");
  assert.equal(data.owner_id, undefined);
  assert.equal(data.attributes, undefined);
  assert.equal(data.owner_tier, undefined);
});
