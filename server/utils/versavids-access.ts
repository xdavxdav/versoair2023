// Who may act on a VersaVids project: its client (the creator), the videaste
// who claimed it, or staff. Pure, so the rules can be unit tested.
import { parsePositiveInt } from "./positive-int";

export const VERSAVIDS_STAFF_ROLES: readonly string[] = [
  "admin",
  "superuser",
  "moderator",
];

// "open" and "claimed" are only reached through the claim flow.
export const PROJECT_STATUS_UPDATES: readonly string[] = [
  "in_progress",
  "review",
  "revision",
  "completed",
  "cancelled",
];

export const DELIVERABLE_DECISIONS: readonly string[] = [
  "approved",
  "revision_requested",
];

export interface VersaVidsUser {
  userId?: string | number;
  role?: string;
}

export interface ProjectParties {
  client_id?: unknown;
  claimed_by?: unknown;
}

export interface ProjectAccess {
  isStaff: boolean;
  isClient: boolean;
  isVideaste: boolean;
}

export function projectAccess(
  project: ProjectParties,
  user: VersaVidsUser | null | undefined,
): ProjectAccess {
  const userId = parsePositiveInt(user?.userId);
  return {
    isStaff: VERSAVIDS_STAFF_ROLES.includes(user?.role ?? ""),
    isClient: userId !== null && parsePositiveInt(project.client_id) === userId,
    isVideaste:
      userId !== null && parsePositiveInt(project.claimed_by) === userId,
  };
}
