// Tier names arrive as a plain string in some responses (subscription status) and as an
// object ({ key, label, ... }) in others (artist division-status). Read both without throwing.
export function tierName(value: unknown): string | null {
  const raw =
    typeof value === "string"
      ? value
      : value && typeof value === "object"
        ? (value as { key?: unknown }).key
        : null;
  if (typeof raw !== "string") return null;
  const name = raw.trim().toLowerCase();
  return name || null;
}
