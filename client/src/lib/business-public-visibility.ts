export interface BusinessPublicVisibilityFields {
  countryCode?: string | null;
  country_code?: string | null;
  isActive?: boolean | null;
  is_active?: boolean | null;
  isVerified?: boolean | null;
  is_verified?: boolean | null;
  email?: string | null;
  website?: string | null;
}

export function getBusinessPublicVisibilityLabel(
  business: BusinessPublicVisibilityFields,
): string {
  const isVerified = business.isVerified ?? business.is_verified ?? false;
  const isActive = business.isActive ?? business.is_active ?? false;
  const email = String(business.email || "").toLowerCase();
  const website = String(business.website || "").toLowerCase();
  const blockers: string[] = [];

  // Listings are public in the visitor's selected country, so a country is
  // needed for the business to appear in any country's directory.
  if (!String(business.countryCode ?? business.country_code ?? "").trim()) {
    blockers.push("country not set");
  }
  if (!isVerified) blockers.push("not verified");
  if (!isActive) blockers.push("inactive");
  if (email.endsWith("@versoair.local")) blockers.push("internal test email");
  if (website.endsWith(".example.com")) blockers.push("example website");

  return blockers.length ? `Not public — ${blockers.join("; ")}` : "Public";
}
