export type ListingField = "type" | "category" | "name" | "city" | "price";

export interface ListingDraft {
  type: string;
  category: string;
  name: string;
  city: string;
  price: string;
}

export type ListingErrors = Partial<Record<ListingField, string>>;

/** Largest amount the price column (numeric 12,2) can hold. */
export const MAX_LISTING_PRICE = 9_999_999_999;

/** Order of the fields on screen, so the first error can be scrolled into view. */
export const LISTING_FIELD_ORDER: readonly ListingField[] = [
  "type",
  "category",
  "name",
  "city",
  "price",
];

export function validateListing(draft: ListingDraft): ListingErrors {
  const errors: ListingErrors = {};
  if (!draft.type) errors.type = "Choisissez le type de bien.";
  if (!draft.category) errors.category = "Choisissez Vente ou Location.";
  if (!draft.name.trim()) errors.name = "Donnez un titre à votre annonce.";
  if (!draft.city) errors.city = "Choisissez la ville.";

  const rawPrice = draft.price.trim();
  const price = Number(rawPrice);
  if (!rawPrice) {
    errors.price = "Indiquez le prix en XOF.";
  } else if (!Number.isFinite(price) || price <= 0) {
    errors.price = "Le prix doit être un nombre supérieur à 0.";
  } else if (price > MAX_LISTING_PRICE) {
    errors.price = "Ce prix est trop élevé. Vérifiez le montant.";
  }
  return errors;
}

export function firstListingError(errors: ListingErrors): ListingField | null {
  return LISTING_FIELD_ORDER.find((field) => errors[field]) ?? null;
}

export type ListingStatus = "published" | "pending" | "rejected";

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  published: "Publiée",
  pending: "En attente de vérification",
  rejected: "Refusée",
};

/**
 * A listing is public only when the marketplace query would return it
 * (verified flag and "verified" status together), so the badge never promises more.
 */
export function listingStatus(property: {
  verified?: boolean | null;
  verificationStatus?: string | null;
}): ListingStatus {
  if (property.verificationStatus === "rejected") return "rejected";
  if (property.verified === true && property.verificationStatus === "verified") {
    return "published";
  }
  return "pending";
}
