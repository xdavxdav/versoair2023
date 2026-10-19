# versoair2023

## Owner access and support operations

See [the access, ticketing and rollout runbook](docs/ACCESS-TICKETING.md).
The technical Admin Panel, Card Vault and staff invitations require the
configured `SUPERADMIN_EMAIL` identity **and** the stored `superuser` role.
Staff support uses `/geo-admin/workspace`; subscriptions do not grant staff
roles. The owner overview includes persistent implementation tracking.

## VersoAI setup

The hosted chat needs a server-side `GROQ_API_KEY`; no model download is
required. In Render, open the `versoair` web service, select **Environment**,
add the key, and save/redeploy. For local development, copy `.env.example` to
the ignored `.env`, set the key, and restart the backend. Never commit the key,
paste it into chat, or expose it through a `VITE_` variable.
`GROQ_MODEL` defaults to `openai/gpt-oss-120b`. Choose a model returned by
Groq's `/openai/v1/models` endpoint for your account; a model documented publicly
may still be unavailable to your key.
Groq usage limits, billing and applicable service/model terms still apply.

After deploying, check `GET /api/ai/status`, then send a chat through the widget.
A successful `/api/ai/chat` response must have `success: true`, a nonempty
`reply`, and `provider: "groq"` to verify a real cloud-model reply. Status alone
only indicates configuration, not that the key is valid or quota is available.
If replies use `provider: "fallback"`, inspect backend provider errors for
authentication, quota or model failures. Rule-based directory responses are
not a local AI model. Ollama is an optional self-hosted alternative; installing
it on a visitor's machine does not connect the hosted backend to that machine.

The widget and API share the request schema in `shared/ai-chat.ts`. Clients
send only `user`/`assistant` messages and optional page context; trusted system
instructions remain on the backend. History is bounded to the most recent 12
messages, matching the model context window used by the service.

Validate the request contract without a key or database:
`node --import tsx --test shared/ai-chat.test.ts`.

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
Standard is the only permanently free business plan, at 0 FCFA per year.
Other plans are paid; any free trial is temporary and subject to eligibility,
with duration and terms confirmed before activation. This clarification does not
activate trials or change account permissions.
Selecting an offer or preparing the mail inquiry never upgrades an account.

The navy/gold promotional card keeps the same content and visual treatment
across resolutions. Offer columns adapt to the card's available width, with
full-width placement above the selector on pricing and the GeoAdmin gate.
Premium's full breakdown remains in plan details rather than stretching a tile.
Promotional prices use the same selected-market formatter as the selector:
CAD for Canada, EUR for France and FCFA for Côte d'Ivoire. Missing rates are
explicitly unavailable; unsupported markets are coming soon.
Resizing never changes prices or contacts. All markets show the owner's
confirmed contacts: +225 07-48-34-38-16, +225 05-64-60-64-01 and
+1 (437) 435-9726, each with separate direct-call and WhatsApp links.
`GEOADMIN_CONTACTS` supplies the shared `GeoAdminContacts` component on the
promotional card, pricing page and GeoAdmin gate. The support email remains.
The promotional card links to the existing `/versoai` assistant route via a
localized "Ask VersoAI" action instead of repeating the website homepage URL.

The country/language selector uses the Google Translate website widget for
client-side page translation. It offers the widget's supported language list,
sets the `googtrans` preference before loading the script, and switches through
the widget's language control. If the control is not ready when a language is
selected, the page reloads with the saved language preference. Automatic country
detection selects a suggested language unless the visitor has chosen a manual
override. Google Translate is an external service and may process page text and
set its own cookies; the Privacy Policy discloses this behavior.
The UI stores standard language codes; Hebrew (`he`) is mapped to the widget's
legacy `iw` code for its language control and cookie. French restores the original
page copy, so untranslated English in the original copy still needs editorial
localization. A missing widget select must not trigger repeated page reloads:
the simple widget applies the saved cookie on initial load.

The application does not use paid Google Cloud Translation credentials or its
server-side translation endpoint. Legacy `CLOUD_TRANSLATION_ENABLED`,
`GOOGLE_CLOUD_TRANSLATION_API_KEY` and `TRANSLATION_MONTHLY_CHARACTER_LIMIT`
settings are not read by the server translation route and can be removed from
the deployment. Do not remove `REDIS_URL` if another application feature uses it.

`GET /api/translations/:language` still serves bundled editorial dictionaries
for compatibility; the selector no longer depends on those dictionaries or the
endpoint. Google Translate is machine translation, not legal certification.
Have counsel and native speakers approve critical copy before release.

The retained dictionary endpoint accepts a language, not arbitrary text. It
does not collect passwords, form values, private messages, or user-generated
content for translation. The external browser widget has separate processing
described in the Privacy Policy.

To extend the retained dictionary coverage, add reviewed EN/FR copy and its Spanish translation in
`shared/spanish-translations.ts`, then localize the component with
`useLocalizedContent`. Spanish uses English source phrases as stable keys rather
than catalogue positions; TypeScript and completeness tests require an entry
for every catalogue phrase. To add another language, provide its complete
dictionary and register it in `BUNDLED_LANGUAGES` and `nativeDictionary`.
Review the explicit company copy in the About page as well.
Keep URLs, values and account data outside the catalogue.

Validation: `npm run test:translation`, `npm run check`, `npm run check:api`,
and `npm run build`. Browser tests mock the Google Translate widget and do not
establish live third-party availability or professional legal approval.

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
