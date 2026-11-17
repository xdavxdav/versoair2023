/**
 * Objects captured verbatim from a Stripe sandbox running API version
 * 2026-09-30.preview, so the parsers are tested against what Stripe really
 * sends and not only against shapes inferred from documentation.
 *
 * Captured from a `default_incomplete` monthly CAD subscription whose metadata
 * is the one plan checkout sets. Only the two hosted-page URLs were dropped.
 */

export const REAL_SUBSCRIPTION_ID = "sub_1UcpF1AcoRVebmEGFMWuso4c";
export const REAL_INVOICE_ID = "in_1UcpF2AcoRVebmEGRGaAmkv2";
export const REAL_INVOICE_PERIOD_END = 1797524899;

const PLAN_METADATA = {
  billingCycle: "monthly",
  targetTier: "verified",
  type: "subscription_fee",
  userId: "424242",
};

/** The invoice as Stripe returned it: finalized and still open (unpaid). */
export function realOpenInvoice(): Record<string, any> {
  return {
    id: REAL_INVOICE_ID,
    object: "invoice",
    account_country: "US",
    account_name: "stripe-sandbox-cyan-chair",
    account_tax_ids: null,
    amount_due: 9600,
    amount_overpaid: 0,
    amount_paid: 0,
    amount_remaining: 9600,
    amount_shipping: 0,
    application: null,
    attempt_count: 0,
    attempted: false,
    auto_advance: false,
    automatic_tax: {
      disabled_reason: null,
      enabled: false,
      liability: null,
      provider: null,
      status: null,
    },
    automatically_finalizes_at: null,
    billing_reason: "subscription_create",
    collection_method: "charge_automatically",
    created: 1794932900,
    currency: "cad",
    custom_fields: null,
    customer: "cus_Ve7TKYG7qQJBED",
    customer_account: null,
    customer_address: null,
    customer_email: "vv-shape-check@example.invalid",
    customer_name: "VV recurring shape check (sandbox, disposable)",
    customer_phone: null,
    customer_shipping: null,
    customer_tax_exempt: "none",
    customer_tax_ids: [],
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discounts: [],
    due_date: null,
    effective_at: 1794932900,
    ending_balance: 0,
    footer: null,
    from_invoice: null,
    issuer: { type: "self" },
    last_finalization_error: null,
    latest_revision: null,
    lines: {
      object: "list",
      data: [
        {
          id: "il_1UcpF1AcoRVebmEG6ZbiIsbr",
          object: "line_item",
          amount: 9600,
          currency: "cad",
          description:
            "1 × VV shape check plan (sandbox, disposable) (at $96.00 / month)",
          discount_amounts: [],
          discountable: true,
          discounts: [],
          invoice: REAL_INVOICE_ID,
          livemode: false,
          metadata: { ...PLAN_METADATA },
          parent: {
            invoice_item_details: null,
            subscription_item_details: {
              invoice_item: null,
              proration: false,
              proration_details: { credited_items: null },
              subscription: REAL_SUBSCRIPTION_ID,
              subscription_item: "si_Ve7T0y9GxTKdYy",
            },
            type: "subscription_item_details",
          },
          period: { end: REAL_INVOICE_PERIOD_END, start: 1794932899 },
          pretax_credit_amounts: [],
          pricing: {
            price_details: {
              price: "price_1UcpF1AcoRVebmEGR6oh7tVN",
              product: "prod_Ve7TZlZM5DiXRb",
            },
            type: "price_details",
            unit_amount_decimal: "9600",
          },
          quantity: 1,
          quantity_decimal: "1",
          subtotal: 9600,
          taxes: [],
        },
      ],
      has_more: false,
      total_count: 1,
      url: `/v1/invoices/${REAL_INVOICE_ID}/lines`,
    },
    livemode: false,
    metadata: {},
    next_payment_attempt: null,
    number: "YFCQRREJ-0001",
    on_behalf_of: null,
    parent: {
      quote_details: null,
      subscription_details: {
        metadata: { ...PLAN_METADATA },
        subscription: REAL_SUBSCRIPTION_ID,
      },
      type: "subscription_details",
    },
    payment_settings: {
      default_mandate: null,
      payment_method_options: null,
      payment_method_types: null,
    },
    period_end: 1794932899,
    period_start: 1794932899,
    post_payment_credit_notes_amount: 0,
    pre_payment_credit_notes_amount: 0,
    receipt_number: null,
    rendering: null,
    shipping_cost: null,
    shipping_details: null,
    starting_balance: 0,
    statement_descriptor: null,
    status: "open",
    status_transitions: {
      finalized_at: 1794932900,
      marked_uncollectible_at: null,
      paid_at: null,
      voided_at: null,
    },
    subtotal: 9600,
    subtotal_excluding_tax: 9600,
    test_clock: null,
    total: 9600,
    total_discount_amounts: [],
    total_excluding_tax: 9600,
    total_pretax_credit_amounts: [],
    total_taxes: [],
    webhooks_delivered_at: 1794932900,
  };
}

/** The same invoice once the customer has paid it (the only fields Stripe flips). */
export function realPaidInvoice(): Record<string, any> {
  return {
    ...realOpenInvoice(),
    amount_paid: 9600,
    amount_remaining: 0,
    attempt_count: 1,
    attempted: true,
    status: "paid",
    status_transitions: {
      finalized_at: 1794932900,
      marked_uncollectible_at: null,
      paid_at: 1794932901,
      voided_at: null,
    },
  };
}
