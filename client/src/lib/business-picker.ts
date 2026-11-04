// Helpers for the admin "pick a business" control. Campaigns belong to a business,
// so the forms must send a real business id instead of a hard-coded one.

export interface BusinessOption {
  id: number;
  name: string;
  cityName: string | null;
  countryCode: string | null;
}

export const BUSINESS_PICKER_LIMIT = 20;

export function businessSearchPath(
  query: string,
  limit: number = BUSINESS_PICKER_LIMIT,
): string {
  const params = new URLSearchParams({ limit: String(limit) });
  const search = query.trim();
  if (search) params.set("search", search);
  return `/api/v1/admin/businesses?${params.toString()}`;
}

export function businessDetailPath(id: number): string {
  return `/api/v1/admin/businesses/${id}`;
}

export function toBusinessOption(raw: unknown): BusinessOption | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.id);
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!Number.isInteger(id) || id <= 0 || !name) return null;
  return {
    id,
    name,
    cityName:
      typeof row.cityName === "string" && row.cityName ? row.cityName : null,
    countryCode:
      typeof row.countryCode === "string" && row.countryCode
        ? row.countryCode
        : null,
  };
}

// The list endpoint returns `data: [...]`; the detail endpoint returns one object (or a one-item list).
export function parseBusinessOptions(payload: unknown): BusinessOption[] {
  const data = (payload as { data?: unknown } | null | undefined)?.data;
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows
    .map(toBusinessOption)
    .filter((option): option is BusinessOption => option !== null);
}

export function describeBusinessOption(option: BusinessOption): string {
  const place = [option.cityName, option.countryCode]
    .filter(Boolean)
    .join(", ");
  return place ? `${option.name} (${place})` : option.name;
}
