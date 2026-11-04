/**
 * Recipient for admin-facing notices. ADMIN_EMAIL is the shared Admin inbox;
 * SMTP_FROM / SMTP_USER remain fallbacks so a notice is never dropped when it
 * is not configured.
 */
export function resolveAdminNotificationEmail(
  env: Record<string, string | undefined> = process.env,
): string {
  for (const key of ["ADMIN_EMAIL", "SMTP_FROM", "SMTP_USER"]) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  return "";
}
