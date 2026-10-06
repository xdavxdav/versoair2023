# versoair2023
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
