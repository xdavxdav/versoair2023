// Columns a visitor may see in a business list. Anything not listed here (owner_id,
// approval_notes, contact_info, submitted_by, approved_by, audit fields...) never
// leaves the server through a public list endpoint.
export const PUBLIC_BUSINESS_LIST_COLUMNS = [
  "id",
  "name",
  "category_id",
  "description",
  "location",
  "address",
  "phone",
  "email",
  "website",
  "rating",
  "reviews",
  "tags",
  "latitude",
  "longitude",
  "country_code",
  "city_name",
  "region_id",
  "featured",
  "is_active",
  "is_verified",
  "logo_url",
  "created_at",
  "updated_at",
] as const;

// Whether an owner exists, never who: owner_id itself stays private.
export const PUBLIC_IS_CLAIMED_SQL = "(b.owner_id IS NOT NULL) AS is_claimed";
export const PUBLIC_CLAIMABLE_SQL =
  "(b.owner_id IS NULL AND b.is_active = true) AS claimable";

export const PUBLIC_BUSINESS_LIST_SELECT_SQL = [
  ...PUBLIC_BUSINESS_LIST_COLUMNS.map((column) => `b.${column}`),
  PUBLIC_IS_CLAIMED_SQL,
  PUBLIC_CLAIMABLE_SQL,
].join(", ");

const PUBLIC_EXTRA_KEYS = [
  "region_name",
  "category_name",
  "is_claimed",
  "claimable",
];

/** Defense in depth: drop anything outside the whitelist even if a query widens. */
export function toPublicBusinessListRow(row: Record<string, unknown>) {
  const allowed = new Set<string>([
    ...PUBLIC_BUSINESS_LIST_COLUMNS,
    ...PUBLIC_EXTRA_KEYS,
  ]);
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => allowed.has(key)),
  );
}
