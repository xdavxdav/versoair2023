export function isConfiguredOwner(
  user: { email?: string | null; role?: string | null } | null | undefined,
  ownerEmail: string | undefined,
): boolean {
  const configured = ownerEmail?.trim().toLowerCase();
  return Boolean(
    configured &&
      user?.role === "superuser" &&
      user.email?.trim().toLowerCase() === configured,
  );
}
