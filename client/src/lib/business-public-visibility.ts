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
  directoryCountryCode = "CA",
): string {
  const directoryCountry = directoryCountryCode.trim().toUpperCase();
  const countryCode = String(
    business.countryCode ?? business.country_code ?? "",
  ).toUpperCase();
  const isVerified = business.isVerified ?? business.is_verified ?? false;
  const isActive = business.isActive ?? business.is_active ?? true;
  const blockers: string[] = [];

  if (countryCode !== directoryCountry) {
    blockers.push(
      `country ${countryCode || "not set"} (directory is ${
        directoryCountry === "CA" ? "Canada-only" : `${directoryCountry}-only`
      })`,
    );
  }
  if (!isVerified) blockers.push("not verified");
  if (!isActive) blockers.push("inactive");
  if (String(business.email || "").toLowerCase().endsWith("@versoair.local")) {
    blockers.push("internal test email");
  }
  if (String(business.website || "").toLowerCase().endsWith(".example.com")) {
    blockers.push("example website");
  }

  return blockers.length ? `Not public — ${blockers.join("; ")}` : "Public";
}
