import { z } from "zod";

export const GEOADMIN_HISTORY_ACTIONS = [
  "GEOADMIN_INVITATION_CREATED",
  "GEOADMIN_INVITATION_DELIVERY_FAILED",
  "GEOADMIN_INVITATION_ACCEPTED",
  "GEOADMIN_INVITATION_EXPIRED",
  "GEOADMIN_INVITATION_REVOKED",
  "GEOADMIN_ACCESS_REVOKED",
  "GEOADMIN_OWNER_CREDENTIAL_DRAFT_GENERATED",
] as const;

export const geoAdminHistoryQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
}).strict();

export interface GeoAdminHistoryEntry {
  id: string;
  action: string;
  createdAt: string | null;
  actorEmail: string | null;
  accountEmail: string | null;
  role: string | null;
  gateUsername: string | null;
  codeIssued: boolean;
  credentialKind: "access-code" | "authenticator" | null;
}

export interface GeoAdminHistoryResponse {
  events: GeoAdminHistoryEntry[];
  hasMore: boolean;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

// Never return raw audit `changes`: other event writers may add private fields.
export function toGeoAdminHistoryEntry(row: {
  id: string;
  action: string;
  createdAt: Date | null;
  actorEmail: string | null;
  changes: unknown;
}): GeoAdminHistoryEntry {
  const data = record(row.changes);
  const before = record(data.before);
  const text = (value: unknown) => typeof value === "string" ? value : null;
  return {
    id: row.id,
    action: row.action,
    createdAt: row.createdAt?.toISOString() ?? null,
    actorEmail: row.actorEmail,
    accountEmail: text(data.email),
    role: text(data.role) ?? text(before.role),
    gateUsername: text(data.gateUsername) ?? text(before.gateUsername),
    codeIssued: data.accessCodeIssued === true,
    credentialKind: data.kind === "access-code" || data.kind === "authenticator" ? data.kind : null,
  };
}
