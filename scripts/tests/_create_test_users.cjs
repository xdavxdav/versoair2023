const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

if (!["development", "test"].includes(process.env.NODE_ENV)) {
  throw new Error(
    "GeoAdmin test accounts can only be seeded when NODE_ENV is development or test",
  );
}
if (!process.env.GEOADMIN_TEST_DATABASE_URL) {
  throw new Error(
    "GEOADMIN_TEST_DATABASE_URL must point to an isolated test database; refusing to use DATABASE_URL",
  );
}

const testDatabaseUrl = process.env.GEOADMIN_TEST_DATABASE_URL;
try {
  const parsedUrl = new URL(testDatabaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("invalid database protocol");
  }
} catch {
  throw new Error("GEOADMIN_TEST_DATABASE_URL must be a valid PostgreSQL URL");
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
];

function addOptionalTestUser({
  usernameVariable,
  emailVariable,
  passwordVariable,
  role,
  gateUsername,
}) {
  const values = [
    process.env[usernameVariable],
    process.env[emailVariable],
    process.env[passwordVariable],
  ];
  if (!values.some(Boolean)) return;
  if (!values.every(Boolean)) {
    throw new Error(
      `Set all ${usernameVariable}/${emailVariable}/${passwordVariable} values or leave them all unset`,
    );
  }
  testUsers.push({
    username: values[0],
    email: values[1],
    password: values[2],
    role,
    tier: "enterprise",
    gateUsername,
  });
}

addOptionalTestUser({
  usernameVariable: "GEOADMIN_SUBSUPADMIN_USERNAME",
  emailVariable: "GEOADMIN_SUBSUPADMIN_EMAIL",
  passwordVariable: "GEOADMIN_SUBSUPADMIN_PASSWORD",
  role: "admin",
  gateUsername: "subsupadmin_test",
});
addOptionalTestUser({
  usernameVariable: "GEOADMIN_CEO_USERNAME",
  emailVariable: "GEOADMIN_CEO_EMAIL",
  passwordVariable: "GEOADMIN_CEO_PASSWORD",
  role: "admin",
  gateUsername: "admin_025",
});
addOptionalTestUser({
  usernameVariable: "GEOADMIN_CEO2_USERNAME",
  emailVariable: "GEOADMIN_CEO2_EMAIL",
  passwordVariable: "GEOADMIN_CEO2_PASSWORD",
  role: "admin",
  gateUsername: "admin_026",
});
addOptionalTestUser({
  usernameVariable: "GEOADMIN_MODERATOR_USERNAME",
  emailVariable: "GEOADMIN_MODERATOR_EMAIL",
  passwordVariable: "GEOADMIN_MODERATOR_PASSWORD",
  role: "moderator",
  gateUsername: "manager_001",
});

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

const pool = new Pool({ connectionString: testDatabaseUrl });

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
         ON CONFLICT (email) DO NOTHING
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
      if (result.rows[0]) {
        const user = result.rows[0];
        console.log(
          `Seeded ${user.role.padEnd(10)} ${user.username} (${user.email}); GeoAdmin username: ${account.gateUsername}`,
        );
        continue;
      }

      const existing = await client.query(
        `SELECT username, email, role, gate_username
         FROM users WHERE email = $1`,
        [account.email.toLowerCase()],
      );
      const user = existing.rows[0];
      if (
        !user ||
        user.username !== account.username ||
        user.role !== account.role ||
        user.gate_username !== account.gateUsername
      ) {
        throw new Error(
          `Existing account ${account.email} conflicts with the expected test identity; no changes were made`,
        );
      }
      console.log(
        `Already seeded ${user.role.padEnd(10)} ${user.username} (${user.email}); left unchanged`,
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
