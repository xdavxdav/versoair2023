# versoair2023

## Website languages

### GeoAdmin commercial offers

Commercial displays use `GEOADMIN_OFFER_ORDER`, names, prices and scoped
platform/services in `client/src/lib/geoadmin-pricing.ts`: Standard (0),
Essentiel (180,000), Premium (300,000), Pro Vérifié (400,000), Pro Max (780,000)
FCFA per year, and Enterprise (custom quote). These are non-final reference
prices, subject to market research and a written offer.

Premium is **inquiry-only**, with the same proposed platform scope as Essentiel.
Proposed service deliverables are one scoping interview, a long presentation
draft using client inputs, five product/service sheets, and one correction
round. Publication depends on available platform fields. All services require
written confirmation; no managed social campaign or advertising spend is
automatically included. Verification is not purchased automatically.

The five existing technical subscription IDs and permissions are unchanged.
`premium` is a commercial offer key only, never a `TierKey`, billing plan or
account entitlement. The account-admin selector deliberately keeps the five
technical tiers. Public pricing, comparisons and inquiry dialogs show six
offers; the navy/gold card shows the five paid/custom offers, not Standard.
Selecting an offer or preparing the mail inquiry never upgrades an account.

The language selector uses a native French/English public-copy catalogue, not
the legacy Google website widget. Initial coverage includes pricing and its
custom-plan dialog, the promotional card (including Enterprise custom), the
sign-in/registration screens, help, and the terms/privacy/cookie pages.
Unknown copy stays in its source language; selecting a language does **not**
claim that every page, server error, or user submission has been translated.
French legal copy is authored translation, not external legal certification.
Have counsel and native speakers approve critical copy before release.

Other supported languages use **Google Translate through the Cloud Translation
API**: <https://cloud.google.com/translate>. Results are automatic, visibly
attributed with Google's unmodified official badge, and marked with
machine-translation language metadata. Badge source and usage requirements:
<https://cloud.google.com/translate/attribution>. Only the
fixed public catalogue in `shared/public-translations.ts` and
`shared/legal-translations.ts` can be submitted. The endpoint accepts a language,
not arbitrary text. Passwords, forms, private messages, and user-generated
content are never collected for translation.

FR/EN work without any Cloud credentials or billing. Cloud translation is
disabled unless all of these server-only Render environment variables are set:

- `CLOUD_TRANSLATION_ENABLED=true` (explicit opt-in after billing approval)
- `GOOGLE_CLOUD_TRANSLATION_API_KEY` (Cloud Translation Basic API key; restrict
  it to the Cloud Translation API and appropriate server restrictions)
- `REDIS_URL` (persistent Redis; translation never uses an in-memory fallback)
- `TRANSLATION_MONTHLY_CHARACTER_LIMIT` (explicit positive integer approved by
  the owner; no default spending allowance)

Enable the Cloud Translation API and billing in the owner's Google Cloud
project. Configure provider quotas as an independent hard safeguard; Google
Cloud budget alerts alone are not spending caps. Never use a `VITE_` variable for
the key or paste it into source control/chat. This setup does not create a Cloud
account, enable billing, or change the database connection.

`GET /api/translations/:language` returns a complete versioned public dictionary.
Successful automatic translations are cached in Redis for 30 days; catalogue
changes invalidate them. Concurrent requests are deduplicated with a Redis
lease. A shared atomic monthly UTC character counter reserves the full
catalogue before calling Google, across app instances and deployments.
Reservations are not refunded on failures because provider charges may already
have occurred. Use durable Redis without eviction of translation usage keys;
clearing Redis loses this application-side accounting, so provider quotas
remain necessary. The character limit is not a currency-denominated guarantee
and does not cover other applications using the same Google project.

Missing configuration, cache outages, timeouts, malformed responses, or an
exhausted allowance produce an explicit error; the previous language remains
active and can be retried. No automatic reload or success-shaped fallback occurs.
To extend coverage, add reviewed EN/FR copy and localize the component with
`useLocalizedContent`. Keep URLs, values and account data outside the catalogue.

Validation: `npm run test:translation`, `npm run check`, `npm run check:api`,
and `npm run build`. Tests mock Google and use no production database or keys;
they do not establish live Cloud availability or professional legal approval.

export interface AuthUser {
  userId: string;        // changed from `id` — matches server JWT payload
  email: string;
  role: string;
  username?: string;
}

## SEO prerender route list

Generate the route list for prerender tools (the shared public static routes in
`server/utils/seo-routes.ts`; no database required):

```bash
npm run seo:routes
```

This command writes:

- `client/public/prerender-routes.json`
- `client/public/prerender-routes.txt`

Dynamic `/business/:id` pages are intentionally **not** prerendered: react-snap has
no API/database behind it, so they would snapshot as error pages without JSON-LD.
They are listed in the sitemap and render their `<SeoHead>` + JSON-LD client-side.

Run full prerender pipeline (route list → build → react-snap):

```bash
npm run build:prerender
```

This now also runs a post-prerender SEO validation pass that checks each
generated route for:

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">` (matching `https://www.versoair.com/<route>`), with no
  conflicting duplicates
- `og:title`, `og:description`, `og:url`, `twitter:card`
- JSON-LD (`LocalBusiness` or subtype) on `/business/:id` routes, if any are present
- duplicate titles / canonicals across routes

The build fails (non-zero exit) if any check fails.

Or run react-snap directly after a normal build:

```bash
npm run build
npm run prerender:snap
npm run seo:validate-prerender
```

`prerender:snap` reads `dist/public/prerender-routes.json` and uses it as the
exact include list (`crawl: false`).

## Sitemap

`/sitemap.xml` is a sitemap index (`/sitemap-pages.xml` plus
`/sitemap-businesses-N.xml`, 10,000 active businesses per file). `robots.txt`
always points at the canonical `https://www.versoair.com` origin. After deploying,
verify the live site:

```bash
npm run seo:validate-sitemap -- https://www.versoair.com
```

## Production mail setup

Use these env vars in Render:

- `ADMIN_EMAIL`: destination inbox for admin/platform notifications (recommended:
  `admin@versoair.com`, routed by Cloudflare to your real mailbox)
- `SMTP_HOST=smtp-mail.outlook.com`
- `SMTP_PORT=587`
- `SMTP_USER=<your_hotmail_outlook_mailbox>`
- `SMTP_PASS=<app_password_or_mail_password>`
- `SMTP_FROM=<same_as_smtp_user_or_verified_sender>`

Cloudflare Email Routing handles inbound aliases (for example
`admin@versoair.com`, `support@versoair.com`, `noreply@versoair.com`) and can
forward them to the mailbox used by `SMTP_USER`.

## Geo Admin staff invitations

Geo Admin staff access is invite-only. A signed-in superuser can open
`/geo-admin/dashboard` and use **Manage Geo Admin access** to invite selected
staff by real email address, assigned admin username, and the Admin or
Moderator role. Invitations are one-use links that expire after 72 hours.
New recipients set a password; an existing verified account must sign in with
the invited email and accept the link, preserving its password and other portal
access. Password recovery is linked from the Geo Admin sign-in page. Invitation
messages use `noreply@versoair.com`; make sure this sender is permitted by the
configured SMTP provider.

Apply the versioned Drizzle migration before deploying code that depends on
`geo_admin_invitations`; startup table checks are not a substitute for the
reviewed production migration process.
