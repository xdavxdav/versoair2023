// Who may change music content. Ownership is artists.user_id, the same link the
// artist portal uses to find "my" artist profile. Staff can always act.
import { parsePositiveInt as positiveInt } from "./positive-int";

export const MUSIC_STAFF_ROLES: readonly string[] = [
  "admin",
  "superuser",
  "moderator",
];

export interface QueryRunner {
  query(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: Array<Record<string, any>> }>;
}

export interface AccessUser {
  userId?: string | number;
  role?: string;
}

export function isMusicStaff(user: AccessUser | null | undefined): boolean {
  return MUSIC_STAFF_ROLES.includes(user?.role ?? "");
}

export async function userOwnsArtist(
  db: QueryRunner,
  user: AccessUser | null | undefined,
  artistId: unknown,
): Promise<boolean> {
  const userId = positiveInt(user?.userId);
  const artist = positiveInt(artistId);
  if (!userId || !artist) return false;
  const result = await db.query(
    "SELECT 1 FROM artists WHERE id = $1 AND user_id = $2 LIMIT 1",
    [artist, userId],
  );
  return result.rows.length > 0;
}

// Content with no artist (orphans) can only be managed by staff.
export async function canManageArtist(
  db: QueryRunner,
  user: AccessUser | null | undefined,
  artistId: unknown,
): Promise<boolean> {
  return isMusicStaff(user) || (await userOwnsArtist(db, user, artistId));
}

export type CollaborationParty = "staff" | "requester" | "target" | "none";
export type CollaborationStatus = "active" | "declined" | "completed";

export async function collaborationParty(
  db: QueryRunner,
  user: AccessUser | null | undefined,
  collaboration: { requester_id: unknown; target_id: unknown },
): Promise<CollaborationParty> {
  if (isMusicStaff(user)) return "staff";
  const userId = positiveInt(user?.userId);
  if (!userId) return "none";

  const owned = await db.query("SELECT id FROM artists WHERE user_id = $1", [
    userId,
  ]);
  const artistIds = new Set(owned.rows.map((row) => Number(row.id)));
  if (artistIds.has(Number(collaboration.target_id))) return "target";
  if (artistIds.has(Number(collaboration.requester_id))) return "requester";
  return "none";
}

// The invited artist accepts or declines; the requester may only withdraw a
// pending request; either side can close a collaboration as completed.
export function mayChangeCollaborationStatus(
  party: CollaborationParty,
  next: CollaborationStatus,
  current: string,
): boolean {
  if (party === "staff") return true;
  if (party === "none") return false;
  if (next === "completed") return true;
  if (party === "target") return true;
  return next === "declined" && current === "pending";
}
