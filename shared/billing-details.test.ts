import test from "node:test";
import assert from "node:assert/strict";
import {
  MERCHANT_LEGAL_NAME,
  billingDetailsSchema,
  buildTrustedCheckoutSecurityOptions,
  toStripeCustomerBilling,
} from "./billing-details";

const VALID_BILLING = {
  fullName: "Luqman Diallo",
  phone: "+1 (416) 555-0199",
  addressLine1: "123 Bay Street",
  addressLine2: "Suite 400",
  city: "Toronto",
  region: "Ontario",
  postalCode: "M5J 2S1",
  country: "ca",
  acceptedTerms: true as const,
};

test("billingDetailsSchema accepts complete billing identity and normalizes country", () => {
  const parsed = billingDetailsSchema.safeParse(VALID_BILLING);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.country, "CA");
    const stripeBilling = toStripeCustomerBilling(parsed.data);
    assert.equal(stripeBilling.name, "Luqman Diallo");
    assert.equal(stripeBilling.phone, "+1 (416) 555-0199");
    assert.equal(stripeBilling.address.line1, "123 Bay Street");
    assert.equal(stripeBilling.address.country, "CA");
  }
});

test("billingDetailsSchema rejects missing name, bad phone, missing address, or unaccepted terms", () => {
  for (const patch of [
    { fullName: "A" },
    { phone: "123" },
    { phone: "abc-def-ghij" },
    { addressLine1: "" },
    { city: "" },
    { region: "" },
    { postalCode: "" },
    { country: "CANADA" },
    { acceptedTerms: false },
  ]) {
    const res = billingDetailsSchema.safeParse({ ...VALID_BILLING, ...patch });
    assert.equal(res.success, false, `Expected failure for ${JSON.stringify(patch)}`);
  }
});

test("buildTrustedCheckoutSecurityOptions enforces billing address, phone, terms consent, purpose copy, and PDF invoices", () => {
  const oneTime = buildTrustedCheckoutSecurityOptions({
    purpose: "Pro Verified Plan (annual)",
    mode: "payment",
    hasCustomer: true,
  });

  assert.equal(oneTime.billing_address_collection, "required");
  assert.deepEqual(oneTime.phone_number_collection, { enabled: true });
  assert.deepEqual(oneTime.customer_update, { name: "auto", address: "auto" });
  assert.deepEqual(oneTime.consent_collection, { terms_of_service: "required" });
  assert.match(oneTime.custom_text?.submit?.message ?? "", new RegExp(MERCHANT_LEGAL_NAME));
  assert.match(oneTime.custom_text?.submit?.message ?? "", /Pro Verified Plan \(annual\)/);
  assert.equal(oneTime.invoice_creation?.enabled, true);

  const recurring = buildTrustedCheckoutSecurityOptions({
    purpose: "Essential Subscription (monthly)",
    mode: "subscription",
    hasCustomer: true,
  });
  assert.equal(recurring.billing_address_collection, "required");
  assert.equal(recurring.invoice_creation, undefined);
});
