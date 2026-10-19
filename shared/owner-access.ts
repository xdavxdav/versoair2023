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

export function isReservedOwnerRole(role: unknown): boolean {
  return typeof role === "string" &&
    ["superuser", "superadmin", "owner"].includes(role.trim().toLowerCase().replace(/[\s_-]+/g, ""));
}

export function ownerRoleMutationError(nextRole: unknown, currentRole?: string | null): string | null {
  if (isReservedOwnerRole(nextRole)) {
    return "SuperAdmin is the platform owner's personal status and cannot be assigned, even by the owner.";
  }
  if (nextRole !== undefined && isReservedOwnerRole(currentRole)) {
    return "The platform owner's role cannot be changed through account management.";
  }
  return null;
}
