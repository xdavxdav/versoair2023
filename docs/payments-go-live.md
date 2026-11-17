# Payments go-live runbook (Stripe, CAD)

Audience: the owner (Luq). Companion to
[stripe-first-transaction.md](./payments/stripe-first-transaction.md).
Nothing here is enabled by merging code: `render.yaml` keeps
`ONLINE_PAYMENTS_ENABLED`, `MARKETING_CHECKOUT_ENABLED` and
`FREE_TRIALS_ENABLED` at `"false"`.

**Never paste a Stripe key (test or live) into chat, tickets, commits or
screenshots. Enter it only in the Render dashboard.**

## What can take money today

Only the **marketing cart** (packs and print products) is a complete Stripe
path: CAD, server-side prices, signed webhook, replay-safe fulfilment. Open it
with `MARKETING_CHECKOUT_ENABLED` alone. Keep `ONLINE_PAYMENTS_ENABLED=false`;
it opens many other surfaces (table below) that are not ready.

| Surface | Endpoint | Flags required | Notes |
| --- | --- | --- | --- |
| Marketing packs + print products | `POST /api/marketing/cart/checkout` | `MARKETING_CHECKOUT_ENABLED` **or** `ONLINE_PAYMENTS_ENABLED` | Stripe, CAD, price read from DB; request body ignored |
| Business subscription (Stripe) | `POST /api/v1/payments/create-checkout` | `ONLINE_PAYMENTS_ENABLED` **and** `COMMERCIAL_SUBSCRIPTIONS_ENABLED` | Amounts server-side but currency is hard-coded **USD** (gap, below) |
| Business tier from wallet balance | `POST /api/payments/tier/upgrade` | same two flags | Wallet funds, no Stripe |
| Wallet deposit | `/api/wallet/deposit`, `/api/payments/wallet/deposit` | `ONLINE_PAYMENTS_ENABLED` | No Stripe top-up exists; first is a PayPal redirect preview, second always returns 503 |
| PayPal, artist paid tiers, tips, withdraw, bank/Interac/crypto/mobile-money | `routes/paypal.ts`, `artist-subscriptions.ts`, `streamroyale.ts`, `payments.ts` | `ONLINE_PAYMENTS_ENABLED` | Not Stripe; out of scope for this go-live |
| NGO POS charge | `POST /api/v1/payments/charge` | `ONLINE_PAYMENTS_ENABLED`, superuser | Admin types the amount; default currency USD |
| Save card / setup intent / billing portal | `/api/v1/payments/*` | Stripe key only | Charges nothing |
| Journal listings | `/api/marketing/journal/*` | n/a | No purchase path (free listings, admin-generated PDFs) |
| Listener subscription | `services/listener-subscription.ts` | n/a | Reads a table only; nothing creates a Stripe subscription |
| Free trials | | `FREE_TRIALS_ENABLED` | Grants a tier with no payment; leave `false` |

## Known gaps (decide before or shortly after launch)

1. **GST/HST is not handled.** No Stripe Tax, tax rates or tax lines. Charged
   total = catalogue price. Whether prices are tax-inclusive and whether you
   must register (CRA small-supplier threshold) is a question for your
   accountant. Options: set prices tax-inclusive, or enable Stripe Tax and add
   `automatic_tax` to the Checkout session (code change).
2. **Subscription checkout charges USD.** Leave `COMMERCIAL_SUBSCRIPTIONS_ENABLED`
   off until the currency and prices are decided.
3. **No customer receipt email.** The Checkout session does not pass an email.
   Stripe's own receipts (Dashboard > Settings > Customer emails) are only sent
   in **live** mode, so they cannot be seen in the sandbox test. Check one with
   your small real purchase (Part B step 5.2).
4. **Refunds do not revoke subscription tiers automatically.** Marketing orders
   are marked `refunded` / `disputed` / `chargeback` automatically; a
   subscription tier must be downgraded by support.
5. **Print products ship; orders have no address columns.** Checkout now
   collects a CA/US shipping address when the cart has print items and the
   webhook copies it into the order `notes` ("Ship to: ..."). Shipping is
   "Free" in the cart; there is no shipping fee or tax logic. If you do not
   want to fulfil print orders at launch, deactivate the print products first.
6. **The cart does not say tax is included or excluded.** Do not describe prices
   as "tax included" until gap 1 is decided.
7. **Wallet-funded tier upgrade is not atomic** (`BEGIN` on the shared pool, no
   row lock). It is behind two closed flags; fix before opening wallets.
8. Pending orders from abandoned checkouts are never expired (harmless; they are
   not counted as revenue).

## Part A: test mode (no real money)

Do this on a **separate staging service with its own disposable database**, not
on the production service: a sandbox purchase writes real `orders` and
`transactions` rows to whatever database the service uses.

1. Stripe Dashboard: create an account (business details, CAD, the new bank
   account can wait). Switch to **Test mode** (top right toggle).
2. Developers > API keys: copy the **test** secret key (`sk_test_...`).
3. Developers > Webhooks > Add endpoint:
   - URL: `https://<staging-domain>/api/v1/payments/webhook`
   - Events: `checkout.session.completed`, `charge.refunded`,
     `charge.dispute.created`, `charge.dispute.closed`
     (optional, log/card-save only: `payment_intent.payment_failed`,
     `setup_intent.succeeded`).
   - Copy the signing secret (`whsec_...`).
4. Render (staging service) > Environment, set:
   - `STRIPE_SECRET_KEY` = test key
   - `STRIPE_WEBHOOK_SECRET` = that endpoint's signing secret
   - `PUBLIC_BASE_URL` = the staging origin (`https://...`, no trailing path)
   - flags stay `false`. Save (Render redeploys).
5. Sign in as the owner and open `GET /api/marketing/admin/payments-status`.
   Expect `keyMode: "test"`, `webhookSecretConfigured: true`, the right
   `publicBaseUrl`, and all flags false.
6. Set `MARKETING_CHECKOUT_ENABLED=true` on staging only.

### First sandbox purchase (5 steps)

1. Sign in as a normal user, add one active pack to the cart, press checkout.
   Stripe Checkout must show **CAD** and the same total as the cart. Use one
   print product in this test: Checkout must ask for a CA/US shipping address,
   and after payment the order notes must show "Ship to: ...".
2. Pay with card `4242 4242 4242 4242`, any future expiry, any CVC/postal code.
3. Dashboard > Developers > Webhooks: the `checkout.session.completed` delivery
   must be `200`. In the app the order must be `paid` and the cart empty. Click
   **Resend** on the event: still `200` and **no** second order or transaction
   (replay-safe).
4. Dashboard > Payments: refund the payment in full. Webhook `charge.refunded`
   must return `200` and the order becomes `refunded`. Also try `4000 0000 0000 0002`
   (declined) and cancelling on the Checkout page; the order must stay unpaid.
5. Check the order and `transactions` rows have the CAD amount you saw in step 1
   (refund shows as a negative `refund` row). Then set
   `MARKETING_CHECKOUT_ENABLED=false` on staging.

Only continue if every step matched.

## Part B: live (real money)

Prerequisites: Part A passed, the business bank account is open, and you have an
answer on GST/HST (gap 1).

1. Stripe: complete **Activate account**, add the business bank account for
   payouts, confirm default currency is CAD.
2. Switch the Dashboard to **Live mode**. Create the live webhook endpoint
   exactly as in Part A step 3 with the production URL
   `https://<production-domain>/api/v1/payments/webhook` (live and test
   endpoints and secrets are different).
3. Render (production service) > Environment: set `STRIPE_SECRET_KEY` (live
   `sk_live_...`; use a restricted `rk_live_...` key only if you repeated all of
   Part A with an equivalent restricted test key) and `STRIPE_WEBHOOK_SECRET` (live
   `whsec_...`). Confirm `PUBLIC_BASE_URL` / `PRODUCTION_URL` is the real
   `https://` domain. Flags still `false`. Save.
4. Check `/api/marketing/admin/payments-status`: `keyMode: "live"`,
   `webhookSecretConfigured: true`, flags false. Fix anything unexpected before
   continuing.
5. **Flip order** (one at a time, verify after each):
   1. `MARKETING_CHECKOUT_ENABLED=true`. This is the only flag to enable.
   2. Make one real small purchase yourself (a low-priced item), confirm the
      order is `paid`, the webhook is `200`, and refund it from the Dashboard.
   3. Leave `ONLINE_PAYMENTS_ENABLED`, `COMMERCIAL_SUBSCRIPTIONS_ENABLED` and
      `FREE_TRIALS_ENABLED` at `false`.
6. Watch Dashboard > Webhooks for failed deliveries for the first days. Stripe
   retries failed deliveries; the handler is safe to retry.

### Rollback

Set `MARKETING_CHECKOUT_ENABLED=false` in Render and save. New checkouts are
refused immediately (HTTP 503). Webhooks keep working on purpose, so payments
already in flight, refunds and disputes are still recorded. To also stop all
Stripe activity, remove `STRIPE_SECRET_KEY`.

## What the code guarantees (audited)

- The webhook reads the raw request body and verifies Stripe's signature. A
  missing secret returns 503 in **every** environment; missing or invalid
  signatures return 400 and touch nothing.
- Fulfilment is claimed by inserting the Checkout Session id into
  `transactions.reference` (unique) in the same database transaction as the
  order update, so replays and concurrent duplicates do nothing; a failure rolls
  back and returns 500 so Stripe retries.
- Refund and dispute events are claimed per event id (`stripe_event:<id>`) and
  never grant anything.
- Amounts are integer cents read from the database at checkout; currency is
  fixed to CAD for marketing orders. The request body is ignored.

Tests: `JWT_SECRET=local-test-only-secret-0123456789abcdef node --import tsx --test server/routes/api-v1/payments-webhook.test.ts server/services/stripe-reversals.test.ts server/services/stripe-webhook.test.ts server/services/marketing-checkout.test.ts`
