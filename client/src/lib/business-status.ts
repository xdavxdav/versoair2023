// What a visitor is told about a listing's standing. Verified means Verso Air
// approved it; claimed means an owner account has taken it over. The claimed
// flag is only ever a yes/no: who the owner is never reaches the browser.

export type BusinessStatusKey = "verified" | "unclaimed";

export interface BusinessStatusItem {
  key: BusinessStatusKey;
  label: string;
  help: string;
}

export const UNCLAIMED_NOTICE =
  "This listing hasn't been claimed by its owner yet, so some details may be missing.";

const ITEMS: Record<BusinessStatusKey, BusinessStatusItem> = {
  verified: {
    key: "verified",
    label: "Verified",
    help: "Checked and approved by Verso Air.",
  },
  unclaimed: {
    key: "unclaimed",
    label: "Unclaimed",
    help: UNCLAIMED_NOTICE,
  },
};

/** The API sends a boolean; anything else means the state is unknown. */
export function parseClaimed(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

/**
 * Only states that are known to be true produce a label, so a response that
 * does not carry the claimed flag never shows "Unclaimed" by mistake.
 */
export function businessStatusItems(input: {
  verified?: boolean | null;
  claimed?: boolean | null;
}): BusinessStatusItem[] {
  const items: BusinessStatusItem[] = [];
  if (input.verified === true) items.push(ITEMS.verified);
  if (input.claimed === false) items.push(ITEMS.unclaimed);
  return items;
}
