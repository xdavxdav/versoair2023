# Stripe first-transaction checklist

Online payments stay disabled until this checklist is complete. Never put Stripe
keys in client variables, source control, chat, logs, or screenshots.

## Sandbox

1. Use a disposable local PostgreSQL database. `npm run seed:test-pack` refuses
   production and non-loopback database URLs; set `ALLOW_TEST_PACK_SEED=true`
   only for the intended local test.
2. Configure Stripe **test-mode** secret and webhook keys in the server
   environment. Keep `ONLINE_PAYMENTS_ENABLED=false`. The marketing cart has its
   own `MARKETING_CHECKOUT_ENABLED` gate.
3. Set the public base URL to the intended staging origin. Verify the owner-only
   `GET /api/marketing/admin/payments-status` reports `keyMode: "test"`, the
   expected URL, and only the intended checkout flag.
4. Enable `MARKETING_CHECKOUT_ENABLED` only in staging. Place a test order and
   confirm: Stripe Checkout is CAD; the displayed catalogue price matches the
   stored product price; the webhook marks the order paid and clears that user's
   cart; a replay does not duplicate the transaction.
5. Test cancellation, unavailable/inactive products, Stripe creation failure,
   and webhook retry. Confirm orders have clear support/fulfilment handling and
   test a refund before calling the sandbox flow ready.
6. Disable the staging flag after the test. Do not copy test keys to production.

## Production switch

Only after the sandbox checks and owner review:

1. Confirm the production webhook endpoint and signing secret in Stripe.
2. Set production secret and webhook secrets using the hosting provider's secret
   manager. Verify `payments-status` reports `keyMode: "live"` without exposing
   key material.
3. Keep the global `ONLINE_PAYMENTS_ENABLED` flag off. Enable only
   `MARKETING_CHECKOUT_ENABLED` for marketing checkout, then verify the first
   real transaction, webhook, order, and fulfilment end to end.
4. Disable the marketing flag immediately if any amount, currency, order, or
   webhook result differs from the expected CAD order.

The Render template deliberately sets `MARKETING_CHECKOUT_ENABLED=false`.
Changing this template or deploying code does not enable charges.
