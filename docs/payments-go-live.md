# Payments go-live runbook (Stripe, CAD)

Audience: the owner (Luq). Companion to
[stripe-first-transaction.md](./payments/stripe-first-transaction.md).
Nothing here is enabled by merging code: `render.yaml` keeps
`ONLINE_PAYMENTS_ENABLED`, `MARKETING_CHECKOUT_ENABLED`, `FREE_TRIALS_ENABLED`
and `RECURRING_BILLING_ENABLED` at `"false"`.

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
| Business subscription (Stripe) | `POST /api/v1/payments/create-checkout` | `ONLINE_PAYMENTS_ENABLED` **and** `COMMERCIAL_SUBSCRIPTIONS_ENABLED` | Stripe, CAD, amounts server-side from `shared/plan-pricing.ts`; Standard is free, Premium is inquiry-only, Enterprise is quote-only (400 `PLAN_QUOTE_ONLY`). Self-serve Pay buttons are live on `/pricing` for Essential, Pro Verified, and Pro Max (`ONLINE_PAYMENTS_ENABLED` and `COMMERCIAL_SUBSCRIPTIONS_ENABLED` are enabled on production). One-time prepaid unless `RECURRING_BILLING_ENABLED=true` (automatic renewal, see "Recurring billing") |
| Business tier from wallet balance | `POST /api/payments/tier/upgrade` | same two flags | Wallet funds, no Stripe; own legacy prices (gap 7) |
| Wallet deposit | `/api/wallet/deposit`, `/api/payments/wallet/deposit` | `ONLINE_PAYMENTS_ENABLED` | No Stripe top-up exists; first is a PayPal redirect preview, second always returns 503 |
| PayPal, artist paid tiers, tips, withdraw, bank/Interac/crypto/mobile-money | `routes/paypal.ts`, `artist-subscriptions.ts`, `streamroyale.ts`, `payments.ts` | `ONLINE_PAYMENTS_ENABLED` | Not Stripe; out of scope for this go-live |
| NGO POS charge | `POST /api/v1/payments/charge` | `ONLINE_PAYMENTS_ENABLED`, superuser | Admin types the amount; default currency USD |
| Save card / setup intent / billing portal | `/api/v1/payments/*` | Stripe key only | Charges nothing |
| Journal listings | `/api/marketing/journal/*` | n/a | No purchase path (free listings, admin-generated PDFs) |
| Listener subscription | `services/listener-subscription.ts` | n/a | Reads a table only; nothing creates a Stripe subscription |
| Free trials | | `FREE_TRIALS_ENABLED` | Grants a tier with no payment; leave `false` |

## Owner blockers (only Luq can resolve these)

1. **The shop catalog is empty.** `marketing_packs` and `print_products` have 0
   rows in production, `/api/marketing/packs` and `/api/marketing/print/products`
   return `[]`, nothing seeds production, and there is no admin screen to create
   or edit items. Nothing can be sold until Luq supplies the product **names and
   CAD prices** (and which print products to launch), and they are loaded through
   a reviewed, deliberate step. Do not seed production with test or invented data.
2. **Plan prices: currency decided, figures need your review.** Plans are
   charged in **CAD** (the company is Canadian; FCFA stays the on-screen
   reference on `client/src/lib/tiers.ts`). The single price table is
   `shared/plan-pricing.ts`, derived from the FCFA schedule at 0.0024 CAD per
   FCFA and rounded to the nearest CA$10 per year, monthly = a tenth of annual:

   | Plan | FCFA reference (annual) | Charged monthly | Charged annual |
   | --- | --- | --- | --- |
   | Essential | 180,000 | CA$43 | CA$430 |
   | Pro Verified | 400,000 | CA$96 | CA$960 |
   | Pro Max | 780,000 | CA$187 | CA$1,870 |
   | Enterprise | custom quote | not self-serve | not self-serve |

   These figures are a derivation, not an owner-approved price list; change
   them in that one file (the Finance panel and the tests read it too) before
   turning on `COMMERCIAL_SUBSCRIPTIONS_ENABLED`, which stays `false`. The
   `/pricing` page converts FCFA at a live indicative rate, so its CA$ figure
   can differ from the charged price by about 1%.
3. **Plans: prepaid today, recurring billing is built but switched off.** Plan
   checkout is `mode: "payment"` (one-time prepaid) until
   `RECURRING_BILLING_ENABLED` is `true`; then it creates a real Stripe
   subscription that renews every month or year. The code is complete and
   tested but off (`render.yaml` keeps it `"false"`), so nothing renews and
   nothing recurring is charged. Turning it on is the checklist under
   "Recurring billing" below. Public pages say nothing about automatic renewal;
   keep it that way until the flag is on.
4. GST/HST, receipts and print-order fulfilment: see Known gaps below.
5. **Stripe live account verification — RESOLVED.** Photo-ID verification is
   complete on live Stripe account `acct_1TAMOmARcKPnBUjj` (VERSO AIR INC.):
   `charges_enabled: true`, `payouts_enabled: true`, `requirements.past_due: []`,
   and live webhook `we_1UcpnCARcKPnBUjjiXbb3fA2`
   (`https://www.versoair.com/api/v1/payments/webhook`) is enabled across all 10
   checkout, reversal, and subscription events.
6. **Stripe payout bank — RESOLVED.** Stripe payouts are routed to the company's
   CAD Airwallex partner bank account (Digital Commerce Bank `••••6759`, routing
   `10009-352`).

### Charging a custom or catalog client before the shop is loaded

Self-serve plan checkout is live on `/pricing` for Essential, Pro Verified, and
Pro Max (`ONLINE_PAYMENTS_ENABLED=true` and
`COMMERCIAL_SUBSCRIPTIONS_ENABLED=true`). Until the marketing shop catalog is
loaded (blocker 1), or for custom-quoted offers (Premium content preparation or
Enterprise), you can create an Invoice or a Payment Link in the Stripe
Dashboard in CAD. The webhook acknowledges those events and ignores them
(they carry no plan or order metadata), so Stripe does not retry them. The
site does not record them either: grant the plan or fulfil the order by hand
and reconcile from the Dashboard.

## Known gaps (decide before or shortly after launch)

1. **GST/HST is not handled.** No Stripe Tax, tax rates or tax lines. Charged
   total = catalogue price. Whether prices are tax-inclusive and whether you
   must register (CRA small-supplier threshold) is a question for your
   accountant. Options: set prices tax-inclusive, or enable Stripe Tax and add
   `automatic_tax` to the Checkout session (code change).
2. **Plans are one-time prepaid payments unless `RECURRING_BILLING_ENABLED` is
   on** (charged in CAD like the shop). `/pricing` starts self-serve plan
   checkout for Essential, Pro Verified, and Pro Max when
   `ONLINE_PAYMENTS_ENABLED` and `COMMERCIAL_SUBSCRIPTIONS_ENABLED` are enabled,
   and the billing page opens the Stripe customer portal.
3. **No customer receipt email.** The Checkout session does not pass an email.
   Stripe's own receipts (Dashboard > Settings > Customer emails) are only sent
   in **live** mode, so they cannot be seen in the sandbox test. Check one with
   your small real purchase (Part B step 5.2).
4. **Refunds do not revoke subscription tiers automatically.** Marketing orders
   are marked `refunded` / `disputed` / `chargeback` automatically; a
   subscription tier must be downgraded by support. For an automatic-renewal
   plan, support first cancels the subscription in Stripe (otherwise the next
   invoice charges again and re-grants the plan), then downgrades the user.
5. **Print products ship; orders have no address columns.** Checkout now
   collects a CA/US shipping address when the cart has print items and the
   webhook copies it into the order `notes` ("Ship to: ..."). Shipping is
   "Free" in the cart; there is no shipping fee or tax logic. If you do not
   want to fulfil print orders at launch, deactivate the print products first.
6. **The cart does not say tax is included or excluded.** Do not describe prices
   as "tax included" until gap 1 is decided.
7. **Wallet-funded tier upgrade is not atomic** (`BEGIN` on the shared pool, no
   row lock). It is behind two closed flags; fix before opening wallets. It is
   also a separate legacy price list (premium 29.99, enterprise 99.99 per 30
   days, in wallet currency) that is not governed by `shared/plan-pricing.ts`
   and can sell `enterprise`; retire or align it before opening wallets.
8. Pending orders from abandoned checkouts are cancelled only if the webhook
   endpoint is subscribed to `checkout.session.expired` (Part A step 3);
   otherwise they stay `pending` (harmless; they are not counted as revenue).
9. **Billing history shows no currency code.** Ledger rows do not store the
   currency (`transactions.currency` is never written), so amounts appear with
   a `$` and nothing else. Everything Stripe charges for the shop and plans is
   CAD.

## Part A: test mode (no real money)

Do this on a **separate staging service with its own disposable database**, not
on the production service: a sandbox purchase writes real `orders` and
`transactions` rows to whatever database the service uses.

1. Stripe Dashboard: create an account (business details, CAD, the new bank
   account can wait). Switch to **Test mode** (top right toggle).
2. Developers > API keys: copy the **test** secret key (`sk_test_...`).
3. Developers > Webhooks > Add endpoint:
   - URL: `https://<staging-domain>/api/v1/payments/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`
     (optional, log/card-save only: `payment_intent.payment_failed`,
     `setup_intent.succeeded`). To also test automatic-renewal plans (see
     "Recurring billing"), add `invoice.paid`, `invoice.payment_failed` and
     `customer.subscription.deleted`.
   - API version: leave the Dashboard default. The handlers read the
     2025-02-24 invoice shape and the newer one (subscription under
     `parent.subscription_details`); a real 2026-09-30 invoice captured from a
     Stripe sandbox is pinned in `server/test-support/stripe-real-shapes.ts`.
   - Copy the signing secret (`whsec_...`).
4. Render (staging service) > Environment, set:
   - `STRIPE_SECRET_KEY` = test key
   - `STRIPE_WEBHOOK_SECRET` = that endpoint's signing secret
   - `PUBLIC_BASE_URL` = the staging origin (`https://...`, no trailing path)
   - flags stay `false`. Save (Render redeploys).
5. Sign in as the owner and open `GET /api/marketing/admin/payments-status`.
   Expect `keyMode: "test"`, `webhookSecretConfigured: true`, the right
   `publicBaseUrl`, and all flags false.
6. Set `MARKETING_CHECKOUT_ENABLED=true` on staging only, then open
   `payments-status` again: `blockers` must be empty (`warnings` will note that a
   test key is active).

The production catalog is empty (`marketing_packs` and `print_products` have no
rows) and no admin screen can add items, so the cart has nothing to sell. For
the sandbox, seed a $1 test pack into the **staging/local disposable** database
with `ALLOW_TEST_PACK_SEED=true npm run seed:test-pack` (the script refuses
production and non-loopback databases). Never seed production with test data.

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

Prerequisites: Part A passed, the business bank account is open, you have an
answer on GST/HST (gap 1), and **the owner-approved catalog (products and CAD
prices) is loaded in the production database**. Production is empty today; the
owner chooses the products and prices, and they must be loaded through a
reviewed, deliberate step before `MARKETING_CHECKOUT_ENABLED` is turned on.

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

## Recurring billing (built, off)

Plan checkout can create a real Stripe subscription (CAD, monthly or annual, the
same prices as `shared/plan-pricing.ts`) instead of a one-time payment. It is
switched by `RECURRING_BILLING_ENABLED` (`"false"` in `render.yaml`) and only
matters inside the two existing plan flags (`ONLINE_PAYMENTS_ENABLED` and
`COMMERCIAL_SUBSCRIPTIONS_ENABLED`), so while it is off nothing renews and
nothing recurring is ever charged. The flag only decides which kind of Checkout
Session is created; the webhook handlers below are always active but do nothing
without subscription events.

How it behaves:

- **First payment and every renewal** arrive as `invoice.paid`. Each invoice is
  recorded once (`transactions.reference` = `invoice:` + the invoice id, unique)
  in the same database transaction that extends the plan, so Stripe retries and
  replays change nothing. `premium_expires_at` only ever moves forward.
- **Failed renewal** (`invoice.payment_failed`): the plan is flagged `past_due`
  once and the user is notified. Access continues; the daily cron downgrades
  7 days after the paid period ended if no retry has succeeded, and a later
  successful retry restores the plan.
- **Cancellation** (`customer.subscription.deleted`, e.g. from the Stripe
  billing portal): renewal stops and the plan runs out with the period already
  paid, then the normal expiry flow applies.
- **Expiry cron:** an active subscriber gets 2 days of slack after the period
  end for Stripe's renewal to arrive before being treated as expired, and gets
  no "renew now" reminder. Prepaid users are unchanged. A database without the
  `plan_subscriptions` table behaves exactly as before.
- **Guards:** a user with an active or `past_due` subscription cannot start a
  second one (409 `SUBSCRIPTION_ALREADY_ACTIVE`), and
  `POST /api/v1/subscription/downgrade` refuses (409
  `SUBSCRIPTION_BILLING_ACTIVE`) until the subscription is cancelled.
- **Storage:** a separate `plan_subscriptions` table, created by the boot
  repair in `server/services/ensure-tables.ts` (`CREATE TABLE IF NOT EXISTS`).
  That repair is non-fatal: if it cannot run, the server still starts and
  recurring plans simply stay unavailable. Nothing was added to `users`.

Before turning it on (staging with test keys first):

1. Check the table exists in the database the service uses (read-only):
   `SELECT to_regclass('public.plan_subscriptions');` must not return null. It
   is created at the first server start after this code is deployed.
2. Webhook endpoint: add `invoice.paid`, `invoice.payment_failed` and
   `customer.subscription.deleted` to the events of Part A step 3. Live and
   test endpoints are separate; do both.
3. Stripe Dashboard > Settings > Billing > Customer portal: allow cancelling
   subscriptions and updating payment methods. Set the failed-payment retry
   schedule (Settings > Billing > Revenue recovery) to finish within about 7
   days so it matches the grace period. Portal and retry settings are separate
   in test and live mode.
4. Run the whole cycle in test mode with the three flags on:
   1. Subscribe with `4242 4242 4242 4242`. Expect the CAD total, a
      `plan_subscriptions` row, an `invoice:` row in `transactions`, the user on
      the chosen tier, and `invoice.paid` answered `200`.
   2. **Resend** the event: still `200`, no second row.
   3. Renewal: put the test customer in a Stripe **test clock** (Dashboard >
      Billing > Test clocks), store its `cus_...` id in that staging user's
      `users.stripe_customer_id` before subscribing (checkout reuses the stored
      customer), then advance the clock one cycle. A second invoice must extend
      `premium_expires_at`.
   4. Failure: in the billing portal change the card to
      `4000 0000 0000 0341` (it attaches but charges fail) and advance the clock
      again. Expect `invoice.payment_failed`, the plan `past_due`, and the
      "Payment Failed" notification with access unchanged.
   5. Cancel in the billing portal: the status becomes `cancelled` and the plan
      stays active until the paid period ends.
5. Search the logs for lines containing `not applied:` (`unknown_subscription`,
   `invalid_plan`); there should be none for your test subscription.
6. Only then set `RECURRING_BILLING_ENABLED=true` in production, and only
   after `COMMERCIAL_SUBSCRIPTIONS_ENABLED` is a deliberate decision. Roll back
   by setting it to `false`: new plan checkouts are prepaid again, but
   subscriptions that already exist keep renewing and extending access until
   they are cancelled in Stripe.

Known limits (decide or handle through support):

- The Stripe billing portal cannot switch plans (prices are created inline), so
  a plan change for a subscriber is cancel, then subscribe again.
- The recurring checkout does not copy the card into the in-app saved cards.
- Two subscriptions started within seconds of each other (before the first
  `invoice.paid` is processed) are possible; cancel the duplicate in Stripe.
- A prepaid remainder plus a new subscription does not stack; access runs to
  whichever end is later.
- `customer.subscription.updated` is not handled, so a subscription set to cancel
  at period end only shows as cancelled when it actually ends.
- Refunds and disputes of a renewal are recorded but do not revoke the plan
  (gap 4).
- Refund and dispute events find a renewal through the payment's invoice id,
  which the pinned API version (`STRIPE_API_VERSION` in
  `server/routes/api-v1/payments.ts`) returns. If that version is ever raised,
  re-test refunds of a renewal.

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
- Automatic renewals (only when `RECURRING_BILLING_ENABLED` created a
  subscription) are claimed per Stripe invoice (`invoice:<id>`, unique) in the
  same database transaction as the plan update; access only moves forward, and a
  failure rolls back and returns 500 so Stripe retries.
- Amounts are integer cents read from the database at checkout; currency is
  fixed to CAD for marketing orders. The request body is ignored.
- A paid session is applied only to a `pending` order of the same user whose
  total and currency match what Stripe collected. Anything else is held for
  review: the payment stays recorded, the order and cart are left alone, Stripe
  still gets `200`, and a `[PAYMENT-ALERT]` line is logged and emailed to
  `ADMIN_EMAIL` (falling back to `SMTP_FROM`, then `SMTP_USER`). A redelivery
  does not alert again.
- `checkout.session.expired` cancels only a `pending` order and keeps the cart.
- Checkout, saved-card setup and billing-portal sessions are limited to 10
  requests per 15 minutes per signed-in user (HTTP 429, code
  `PAYMENT_RATE_LIMITED`).
- Staff order status changes only move forward: staff cannot mark an order paid
  or pending, and `disputed` / `chargeback` orders have no staff transitions.
- The NGO POS charge takes the amount as text (no float rounding), sends XOF and
  XAF as whole units, and accepts an optional `idempotencyKey` so a retry never
  charges twice. Refunds are intentionally not gated by `ONLINE_PAYMENTS_ENABLED`.

Tests: `npm run test:payments` runs the whole payment set (checkout, webhook, reversals, plan pricing, and the recurring-billing files `plan-subscriptions`, `payments-recurring`, `subscription-downgrade`, `subscription-expiry`). The original webhook subset:
`JWT_SECRET=local-test-only-secret-0123456789abcdef node --import tsx --test server/routes/api-v1/payments-webhook.test.ts server/services/stripe-reversals.test.ts server/services/stripe-webhook.test.ts server/services/marketing-checkout.test.ts`
