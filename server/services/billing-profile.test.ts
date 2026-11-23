import test from "node:test";
import assert from "node:assert/strict";
import {
  loadBillingProfile,
  resetBillingProfileEnsureForTests,
  saveBillingProfile,
  syncBillingProfileToStripe,
} from "./billing-profile";

const SAMPLE = {
  fullName: "Amina Koné",
  phone: "+1 514-555-0142",
  addressLine1: "450 Rue Sainte-Catherine",
  addressLine2: "",
  city: "Montreal",
  region: "Quebec",
  postalCode: "H3B 1A7",
  country: "CA",
  acceptedTerms: true as const,
};

test("billing profile saves, reloads, and syncs to Stripe customer", async () => {
  resetBillingProfileEnsureForTests();
  const rows = new Map<number, any>();
  const fakePool = {
    async query(sql: string, params: unknown[] = []) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      if (normalized.startsWith("INSERT INTO user_billing_profiles")) {
        rows.set(Number(params[0]), {
          full_name: params[1],
          phone: params[2],
          address_line1: params[3],
          address_line2: params[4],
          city: params[5],
          region: params[6],
          postal_code: params[7],
          country: params[8],
        });
        return { rows: [], rowCount: 1 };
      }
      if (normalized.startsWith("SELECT full_name, phone")) {
        const found = rows.get(Number(params[0]));
        return { rows: found ? [found] : [] };
      }
      return { rows: [] };
    },
  };

  assert.equal(await loadBillingProfile(fakePool, 19), null);
  await saveBillingProfile(fakePool, 19, SAMPLE);
  const loaded = await loadBillingProfile(fakePool, 19);
  assert.deepEqual(loaded, {
    fullName: "Amina Koné",
    phone: "+1 514-555-0142",
    addressLine1: "450 Rue Sainte-Catherine",
    addressLine2: "",
    city: "Montreal",
    region: "Quebec",
    postalCode: "H3B 1A7",
    country: "CA",
  });

  const updatedCustomers: any[] = [];
  const fakeStripe = {
    customers: {
      async update(id: string, payload: any) {
        updatedCustomers.push({ id, payload });
      },
    },
  } as any;

  await syncBillingProfileToStripe(fakeStripe, "cus_abc", SAMPLE);
  assert.equal(updatedCustomers.length, 1);
  assert.equal(updatedCustomers[0].id, "cus_abc");
  assert.equal(updatedCustomers[0].payload.name, "Amina Koné");
  assert.equal(updatedCustomers[0].payload.phone, "+1 514-555-0142");
  assert.equal(updatedCustomers[0].payload.address.city, "Montreal");
});
