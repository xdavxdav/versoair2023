#!/usr/bin/env node
// db/run_sql.js
// Usage: node db/run_sql.js [path/to/file.sql]
// Note: requires `pg` and `dotenv` if you want .env support: `npm install pg dotenv`

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  try {
    require("dotenv").config({ path: envPath });
  } catch (e) {
    // dotenv not installed; continue and rely on environment variables
  }
}

const file = process.argv[2] || path.join(__dirname, "update_schema.sql");
if (!fs.existsSync(file)) {
  console.error("SQL file not found:", file);
  process.exit(1);
}
const sql = fs.readFileSync(file, "utf8");

const { Client } = require("pg");
const user = process.env.PGUSER || "versoair";
const pass = process.env.PGPASSWORD;
const host = process.env.PGHOST || "localhost";
const port = process.env.PGPORT || "5432";
const db =
  process.env.PGDATABASE ||
  process.env.PGDATABASE ||
  "versoair_business_intelligence";

if (!pass) {
  console.error("PGPASSWORD not set in environment or .env");
  process.exit(1);
}

const conn = `postgresql://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
const client = new Client({ connectionString: conn });

(async () => {
  try {
    await client.connect();
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("SQL executed successfully:", file);
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (e) {}
    console.error("Error executing SQL:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
