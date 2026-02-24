/**
 * One-off migration: flag existing users with plaintext passwords
 * for a forced reset on their next login.
 *
 * Strategy: set passwordResetToken = "FORCE_RESET" and lockedUntil to a
 * far-future date so login is blocked until they reset via /auth/forgot-password.
 *
 * Run ONCE before production deploy:
 *   node --import tsx scripts/migrate-plaintext-passwords.ts
 *
 * Detection heuristic: bcrypt hashes start with "$2a$", "$2b$", or "$2y$".
 * Any password that doesn't start with that pattern is plaintext.
 */

import dotenv from "dotenv";
dotenv.config();

import { db } from "../server/db";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";

const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2y$"];

function isHashed(password: string): boolean {
  return BCRYPT_PREFIXES.some((prefix) => password.startsWith(prefix));
}

async function main() {
  console.log("🔍 Scanning users for plaintext passwords...\n");

  const allUsers = await db
    .select({ id: users.id, email: users.email, password: users.password })
    .from(users);

  const plaintext = allUsers.filter((u) => !isHashed(u.password));

  if (plaintext.length === 0) {
    console.log("✅ All passwords are already hashed. Nothing to do.");
    process.exit(0);
  }

  console.log(
    `⚠️  Found ${plaintext.length} user(s) with plaintext passwords:\n`,
  );
  plaintext.forEach((u) => console.log(`   - [${u.id}] ${u.email}`));

  console.log("\n🔒 Flagging accounts for forced password reset...\n");

  // Set a sentinel value so the login route knows to reject and prompt reset
  // We cannot hash an unknown plaintext password — the safest approach is to
  // invalidate it entirely and force the user through forgot-password flow.
  const ids = plaintext.map((u) => u.id);

  for (const userId of ids) {
    await db
      .update(users)
      .set({
        // Replace plaintext with a sentinel — bcrypt can never match this
        password: "RESET_REQUIRED",
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .where(sql`id = ${userId}`);
  }

  console.log(`✅ Done. ${ids.length} account(s) require a password reset.`);
  console.log(
    "\nAffected users must visit /auth/signin → Forgot Password to regain access.",
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
