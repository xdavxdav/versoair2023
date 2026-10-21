export const SIGN_IN_PROVIDERS = ["google", "microsoft", "linkedin"] as const;

export type SignInProvider = (typeof SIGN_IN_PROVIDERS)[number];

export function getEnabledSignInProviders(
  allowlistValue: string | undefined,
  hasCredentials: (provider: SignInProvider) => boolean,
): SignInProvider[] {
  const allowlist = new Set(
    (allowlistValue || "")
      .split(",")
      .map((provider) => provider.trim().toLowerCase())
      .filter(Boolean),
  );
  const hasExplicitAllowlist = allowlist.size > 0;

  return SIGN_IN_PROVIDERS.filter(
    (provider) =>
      (!hasExplicitAllowlist || allowlist.has(provider)) &&
      hasCredentials(provider),
  );
}
