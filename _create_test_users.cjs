const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const password = "JoeyD000";
const hash = bcrypt.hashSync(password, 12);

const testUsers = [
  {
    username: "superadmin_test",
    email: "superadmin@versoair.test",
    role: "superuser",
    tier: "enterprise",
    gateUsername: "joel_007",
  },
];

(async () => {
  console.log("\n🔐 Creating master account...\n");
  console.log("Password:", password);
  console.log("─".repeat(70));

  // First, check which columns exist
  const colResult = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position",
  );
  const existingCols = colResult.rows.map((r) => r.column_name);

  const hasVerified = existingCols.includes("is_verified");
  const hasTier = existingCols.includes("subscription_tier");
  const hasStatus = existingCols.includes("subscription_status");
  const hasGateUsername = existingCols.includes("gate_username");

  // Delete old test accounts
  const oldEmails = [
    "superadmin@versoair.test",
    "operator@versoair.test",
    "admin@versoair.test",
    "moderator@versoair.test",
    "owner@versoair.test",
    "freeuser@versoair.test",
  ];
  for (const email of oldEmails) {
    await pool.query("DELETE FROM users WHERE email = $1", [email]);
  }
  console.log("🗑️  Cleaned up old test accounts");

  for (const u of testUsers) {
    try {
      let cols = "username, email, password, role, created_at";
      let vals = "$1, $2, $3, $4, NOW()";
      let params = [u.username, u.email, hash, u.role];
      let idx = 5;

      if (hasVerified) {
        cols += ", is_verified";
        vals += `, $${idx++}`;
        params.push(true);
      }
      if (hasTier) {
        cols += ", subscription_tier";
        vals += `, $${idx++}`;
        params.push(u.tier);
      }
      if (hasStatus) {
        cols += ", subscription_status";
        vals += `, $${idx++}`;
        params.push("active");
      }
      if (hasGateUsername && u.gateUsername) {
        cols += ", gate_username";
        vals += `, $${idx++}`;
        params.push(u.gateUsername);
      }

      const result = await pool.query(
        `INSERT INTO users (${cols}) VALUES (${vals}) RETURNING id, username, email, role`,
        params,
      );
      const row = result.rows[0];
      console.log(
        `✅ ${row.role.toUpperCase().padEnd(16)} | ${row.email.padEnd(30)} | id: ${row.id}`,
      );
    } catch (err) {
      console.error(`❌ Failed: ${u.username} — ${err.message}`);
    }
  }

  console.log("\n─".repeat(70));
  console.log("\n📋 MASTER CREDENTIAL:");
  console.log("─".repeat(70));
  console.log(`  Email:    superadmin@versoair.test`);
  console.log(`  Password: ${password}`);
  console.log(`  Role:     superuser`);
  console.log(`  Gate:     joel_007`);
  console.log(
    "\n  Works on: /auth/login, /auth/artist/login, /auth/community/login,",
  );
  console.log(
    "            /auth/subscriber/login, /auth/admin-gate, /api/vault/authorize",
  );
  console.log("─".repeat(70));

  await pool.end();
})();
