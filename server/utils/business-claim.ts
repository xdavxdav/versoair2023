export interface BusinessClaimEvidence {
  emailMatchesListed: boolean;
  emailDomainMatchesWebsite: boolean;
  phoneMatchesListed: boolean;
}

function normalizePhone(value: string | null | undefined): string {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
}

function websiteDomain(value: string | null | undefined): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function getBusinessClaimEvidence(
  business: {
    email?: string | null;
    phone?: string | null;
    website?: string | null;
  },
  contact: { workEmail?: string; workPhone?: string },
): BusinessClaimEvidence {
  const workEmail = contact.workEmail?.trim().toLowerCase() || "";
  const listedEmail = business.email?.trim().toLowerCase() || "";
  const submittedDomain = workEmail.split("@")[1] || "";
  const listedDomain = websiteDomain(business.website);

  return {
    emailMatchesListed: !!workEmail && workEmail === listedEmail,
    emailDomainMatchesWebsite:
      !!submittedDomain &&
      !!listedDomain &&
      (submittedDomain === listedDomain ||
        submittedDomain.endsWith(`.${listedDomain}`)),
    phoneMatchesListed:
      normalizePhone(contact.workPhone).length >= 7 &&
      normalizePhone(contact.workPhone) === normalizePhone(business.phone),
  };
}

export function hasStrongBusinessClaimEvidence(
  evidence: BusinessClaimEvidence,
): boolean {
  return (
    evidence.emailMatchesListed ||
    evidence.emailDomainMatchesWebsite ||
    evidence.phoneMatchesListed
  );
}

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
