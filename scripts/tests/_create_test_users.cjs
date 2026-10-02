const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

if (!["development", "test"].includes(process.env.NODE_ENV)) {
  throw new Error(
    "GeoAdmin test accounts can only be seeded when NODE_ENV is development or test",
  );
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const testUsers = [
  {
    username: process.env.GEOADMIN_SUPERUSER_USERNAME,
    email: process.env.GEOADMIN_SUPERUSER_EMAIL,
    password: process.env.GEOADMIN_SUPERUSER_PASSWORD,
    role: "superuser",
    tier: "enterprise",
    gateUsername: "joel_007",
  },
  {
    username: process.env.GEOADMIN_CEO_USERNAME,
    email: process.env.GEOADMIN_CEO_EMAIL,
    password: process.env.GEOADMIN_CEO_PASSWORD,
    role: "admin",
    tier: "enterprise",
    gateUsername: "admin_025",
  },
  {
    username: process.env.GEOADMIN_MODERATOR_USERNAME,
    email: process.env.GEOADMIN_MODERATOR_EMAIL,
    password: process.env.GEOADMIN_MODERATOR_PASSWORD,
    role: "moderator",
    tier: "enterprise",
    gateUsername: "manager_001",
  },
];

for (const account of testUsers) {
  if (!account.username || !account.email || !account.password) {
    throw new Error("All GeoAdmin test account values must be set in .env");
  }
  if (!/^[^@\s]+@[^@\s]+\.test$/i.test(account.email)) {
    throw new Error(`Test account email must use the .test domain: ${account.email}`);
  }
  if (account.password.length < 12 || account.password.startsWith("REPLACE_")) {
    throw new Error(
      `Set a non-placeholder password of at least 12 characters for ${account.email}`,
    );
  }
}

if (
  new Set(testUsers.map((account) => account.email.toLowerCase())).size !==
    testUsers.length ||
  new Set(testUsers.map((account) => account.username.toLowerCase())).size !==
    testUsers.length ||
  new Set(testUsers.map((account) => account.gateUsername)).size !==
    testUsers.length
) {
  throw new Error("GeoAdmin test usernames, emails, and gate usernames must be unique");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedGeoAdminTestUsers() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const account of testUsers) {
      const passwordHash = await bcrypt.hash(account.password, 12);
      const result = await client.query(
        `INSERT INTO users (
           username, email, password, role, is_verified, subscription_tier,
           subscription_status, gate_username, must_change_password, created_at
         )
         VALUES ($1, $2, $3, $4, true, $5, 'active', $6, false, NOW())
         ON CONFLICT (email) DO UPDATE SET
           username = EXCLUDED.username,
           password = EXCLUDED.password,
           role = EXCLUDED.role,
           is_verified = true,
           subscription_tier = EXCLUDED.subscription_tier,
           subscription_status = 'active',
           gate_username = EXCLUDED.gate_username,
           must_change_password = false
         RETURNING id, username, email, role`,
        [
          account.username,
          account.email.toLowerCase(),
          passwordHash,
          account.role,
          account.tier,
          account.gateUsername,
        ],
      );
      const user = result.rows[0];
      console.log(
        `Seeded ${user.role.padEnd(10)} ${user.username} (${user.email}); GeoAdmin username: ${account.gateUsername}`,
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedGeoAdminTestUsers().catch((error) => {
  console.error("Could not seed GeoAdmin test accounts:", error);
  process.exitCode = 1;
});
