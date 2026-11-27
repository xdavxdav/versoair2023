import { sql } from "drizzle-orm";
import { db } from "../db";
import * as schema from "@shared/schema";

/** Records that a user was just connected. Presence must never break a connection. */
export async function markUserSeen(userId: number): Promise<void> {
  try {
    await db
      .insert(schema.userPresence)
      .values({ userId })
      .onConflictDoUpdate({
        target: schema.userPresence.userId,
        set: { lastSeen: sql`NOW()` },
      });
  } catch (error) {
    console.error("[Presence] Could not record last seen", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
  }
}

export async function lastSeenOf(userId: number): Promise<Date | null> {
  const [row] = await db
    .select({ lastSeen: schema.userPresence.lastSeen })
    .from(schema.userPresence)
    .where(sql`${schema.userPresence.userId} = ${userId}`)
    .limit(1);
  return row?.lastSeen ?? null;
}
