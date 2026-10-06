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
