/**
 * Shared billing identity validation and Stripe Checkout trust/security options
 * for VERSO AIR INC. online payments.
 */
import { z } from "zod";
import type Stripe from "stripe";

export const MERCHANT_LEGAL_NAME = "VERSO AIR INC.";

export const BILLING_COUNTRIES = [
  { code: "CA", name: "Canada" },
  { code: "US", name: "United States" },
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "SN", name: "Senegal" },
  { code: "CM", name: "Cameroon" },
  { code: "CD", name: "DR Congo" },
  { code: "MA", name: "Morocco" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "AU", name: "Australia" },
] as const;

export const billingDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full legal name.")
    .max(120, "Full name must be 120 characters or fewer."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number.")
    .max(25, "Phone number is too long.")
    .refine((val) => /^[+0-9()\s.-]+$/.test(val) && val.replace(/\D/g, "").length >= 7, {
      message: "Please enter a valid phone number with at least 7 digits.",
    }),
  addressLine1: z
    .string()
    .trim()
    .min(3, "Please enter your billing street address.")
    .max(160, "Street address is too long."),
  addressLine2: z.string().trim().max(120).optional().default(""),
  city: z
    .string()
    .trim()
    .min(2, "Please enter your city.")
    .max(80, "City name is too long."),
  region: z
    .string()
    .trim()
    .min(2, "Please enter your province or state.")
    .max(80, "Province or state is too long."),
  postalCode: z
    .string()
    .trim()
    .min(3, "Please enter your postal or ZIP code.")
    .max(20, "Postal or ZIP code is too long."),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Please select a valid 2-letter country code."),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({
      message: "Please confirm the payment purpose and Terms of Service.",
    }),
  }),
});

export type BillingDetailsInput = z.infer<typeof billingDetailsSchema>;

export interface StoredBillingProfile {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export function toStripeCustomerBilling(details: BillingDetailsInput): {
  name: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
} {
  return {
    name: details.fullName,
    phone: details.phone,
    address: {
      line1: details.addressLine1,
      ...(details.addressLine2 ? { line2: details.addressLine2 } : {}),
      city: details.city,
      state: details.region,
      postal_code: details.postalCode,
      country: details.country,
    },
  };
}

/**
 * Hardened Stripe Checkout security, billing verification, receipt, and
 * legal-transparency parameters shared across all VERSO AIR INC. checkouts.
 */
export function buildTrustedCheckoutSecurityOptions(input: {
  purpose: string;
  mode: "payment" | "subscription";
  hasCustomer: boolean;
}): Partial<Stripe.Checkout.SessionCreateParams> {
  const safePurpose = input.purpose.trim().slice(0, 180);
  const submitMessage = `Official payment to ${MERCHANT_LEGAL_NAME} for: ${safePurpose}. Card processing is encrypted by Stripe; an itemized receipt is emailed immediately.`;
  const termsMessage = `I confirm this payment to ${MERCHANT_LEGAL_NAME} for ${safePurpose} and agree to the Terms of Service and Refund Policy.`;

  return {
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    ...(input.hasCustomer
      ? {
          customer_update: {
            name: "auto" as const,
            address: "auto" as const,
          },
        }
      : {}),
    consent_collection: {
      terms_of_service: "required",
    },
    custom_text: {
      submit: { message: submitMessage.slice(0, 1000) },
      terms_of_service_acceptance: { message: termsMessage.slice(0, 1000) },
    },
    ...(input.mode === "payment"
      ? {
          invoice_creation: {
            enabled: true,
            invoice_data: {
              description: `${MERCHANT_LEGAL_NAME} — ${safePurpose}`.slice(0, 500),
              footer: `${MERCHANT_LEGAL_NAME} · Official Payment Receipt · Support available 24/7 at versoair.com/sav`,
            },
          },
        }
      : {}),
  };
}
