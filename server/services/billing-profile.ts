/**
 * Private customer billing profile persistence & Stripe Customer sync.
 * Stores verified legal name, phone, and billing address so buyers see
 * accurate receipts and VERSO AIR INC. maintains clean payment records.
 */
import type Stripe from "stripe";
import {
  toStripeCustomerBilling,
  type BillingDetailsInput,
  type StoredBillingProfile,
} from "@shared/billing-details";

export interface BillingQueryPool {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
}

export const BILLING_PROFILE_SCHEMA_UPGRADES: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS user_billing_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address_line1 VARCHAR(160) NOT NULL,
    address_line2 VARCHAR(120) NOT NULL DEFAULT '',
    city VARCHAR(80) NOT NULL,
    region VARCHAR(80) NOT NULL,
    postal_code VARCHAR(24) NOT NULL,
    country CHAR(2) NOT NULL,
    terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
];

let tableEnsured = false;

export async function ensureBillingProfileTable(
  pool: BillingQueryPool,
): Promise<void> {
  if (tableEnsured) return;
  for (const stmt of BILLING_PROFILE_SCHEMA_UPGRADES) {
    await pool.query(stmt);
  }
  tableEnsured = true;
}

export function resetBillingProfileEnsureForTests(): void {
  tableEnsured = false;
}

export async function loadBillingProfile(
  pool: BillingQueryPool,
  userId: number,
): Promise<StoredBillingProfile | null> {
  await ensureBillingProfileTable(pool);
  const { rows } = await pool.query(
    `SELECT full_name, phone, address_line1, address_line2, city, region, postal_code, country
       FROM user_billing_profiles
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    fullName: String(row.full_name || ""),
    phone: String(row.phone || ""),
    addressLine1: String(row.address_line1 || ""),
    addressLine2: String(row.address_line2 || ""),
    city: String(row.city || ""),
    region: String(row.region || ""),
    postalCode: String(row.postal_code || ""),
    country: String(row.country || "CA").trim().toUpperCase(),
  };
}

export async function saveBillingProfile(
  pool: BillingQueryPool,
  userId: number,
  details: BillingDetailsInput,
): Promise<StoredBillingProfile> {
  await ensureBillingProfileTable(pool);
  await pool.query(
    `INSERT INTO user_billing_profiles
       (user_id, full_name, phone, address_line1, address_line2, city, region, postal_code, country, terms_accepted_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       phone = EXCLUDED.phone,
       address_line1 = EXCLUDED.address_line1,
       address_line2 = EXCLUDED.address_line2,
       city = EXCLUDED.city,
       region = EXCLUDED.region,
       postal_code = EXCLUDED.postal_code,
       country = EXCLUDED.country,
       terms_accepted_at = NOW(),
       updated_at = NOW()`,
    [
      userId,
      details.fullName,
      details.phone,
      details.addressLine1,
      details.addressLine2 || "",
      details.city,
      details.region,
      details.postalCode,
      details.country,
    ],
  );
  return {
    fullName: details.fullName,
    phone: details.phone,
    addressLine1: details.addressLine1,
    addressLine2: details.addressLine2 || "",
    city: details.city,
    region: details.region,
    postalCode: details.postalCode,
    country: details.country,
  };
}

/**
 * Sync verified legal name, phone, and billing address onto the Stripe Customer
 * before opening Checkout so Stripe pre-fills and links the verified identity.
 */
export async function syncBillingProfileToStripe(
  stripeClient: Stripe | null,
  customerId: string | null | undefined,
  details: BillingDetailsInput,
): Promise<void> {
  if (!stripeClient || !customerId) return;
  const updateFn = (stripeClient as any)?.customers?.update;
  if (typeof updateFn !== "function") return;
  try {
    await updateFn.call(
      stripeClient.customers,
      customerId,
      toStripeCustomerBilling(details),
    );
  } catch (err) {
    console.warn(
      "[PAYMENTS] Could not pre-sync billing details to Stripe customer:",
      err instanceof Error ? err.message : err,
    );
  }
}
