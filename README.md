# versoair2023
export interface AuthUser {
  userId: string;        // changed from `id` — matches server JWT payload
  email: string;
  role: string;
  username?: string;
}

## SEO prerender route list

Generate a deterministic route list for prerender tools from live directory data:

```bash
npm run seo:routes
```

This command writes:

- `client/public/prerender-routes.json`
- `client/public/prerender-routes.txt`

Routes include base directory/category pages and all active `/business/:id` pages.

Run full prerender pipeline (route list → build → react-snap):

```bash
npm run build:prerender
```

Or run react-snap directly after a normal build:

```bash
npm run build
npm run prerender:snap
```

`prerender:snap` reads `dist/public/prerender-routes.json` and uses it as the
exact include list (`crawl: false`) so data-driven routes are not missed.
