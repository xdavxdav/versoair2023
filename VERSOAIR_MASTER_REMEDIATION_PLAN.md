# Verso Air — Master Production Remediation Plan

> **Purpose:** One evidence-led roadmap for making the website safer to deploy, reliable to operate, accurate for users, and maintainable. This is a remediation plan, not a claim that the listed work is already complete.
>
> **Status rule:** A task is complete only when its acceptance checks pass and it has a commit hash or PR link that can be verified against the branch Render actually deploys. Label unfinished work **partial** and state what remains. Never publish credentials, secret values, or private customer data in evidence.

## Résumé exécutif

### Current status — 2026-10-10

The local `main` branch contains royalty commit `c00af4ad437600e719c8f3a52a8dc9fbcd040bc7`; `origin/main` remains at `5af14862c401d79112fb939789c1ea87cf25649b`. Neither SHA is confirmed as currently deployed by Render; opening the dashboard redirected to Google sign-in, so its current SHA, instance count, and running entry point(s) could not be checked. The local royalty refinements preserve locked/distributed pool status, reject contributions to closed pools, and discard a connection if rollback fails; the change is committed locally and was not pushed. Type-check, production build, focused backend unit tests, and mocked royalty replay checks pass. The live sitemap check passed robots/sitemap validation for eight unique URLs and three sampled pages. Synthetic-account flows were not run: no local server was listening, and the account seeder requires a configured test database and credentials. The separate `d521cace` commit in `~/Downloads/VersoAIR.tm` adds only an unused Neon config stub and is not in this checkout or `origin`; it was left untouched.

| Priority | Done / verified | Partial | Not yet / blocked | Estimated completion |
|---|---|---|---|---:|
| **P0 — Production safety** | Transactional royalty payouts are in `5af14862`; royalty refinements are committed locally as `c00af4ad`; newsletter, digest, and journal safeguards are committed; type-check, production build, focused backend tests, and mocked royalty replay checks pass. | Deployment of `5af14862` or `c00af4ad` is not verified. | Render instance count/entry points; Neon backup/restore and migration ownership; production overlap behavior; Google OAuth and Cloudflare mail configuration. | **50%** |
| **P1 — User-visible correctness** | Live sitemap/robots check passed for 8 URLs, including 3 direct-URL samples; local SEO prerender acceptance was previously 8/8. Preview-metric labels are implemented in prior local history. | Metric-source verification and confirmation that the intended build is deployed. | Live HTML metadata check failed on all 8 sitemap URLs: each returned HTTP 200 and a title, but no description, canonical, or `og:title`. Synthetic sign-in/permissions/admin/notification/dashboard flows and authorized data checks also remain untested. | **33%** |
| **P2 — Maintainability** | Repository-root inventory is documented. | Cleanup decisions and command-target review. | Owner approval to remove/restore stale seed targets or make other cleanup changes. | **50%** |

Percentages use equal-weight workstreams: fully verified = 100%, partial = 50%, and not started or blocked = 0%; the overall estimate across P0/P1/P2 is **44%**. They are progress estimates, not acceptance-test pass rates. Production-dependent gates remain open even where local implementation is complete.

Les éléments Render partagés par le propriétaire le 2026-10-08 confirment le dépôt `xdavxdav/versoair2023`, la branche de déploiement `main`, le SHA alors déployé `e675ff493676b8bcf40a6a0e7e528d91f5e16b6a` et le mode Docker via `./Dockerfile`. Au 2026-10-10, le checkout local contient le commit local-only `c00af4ad437600e719c8f3a52a8dc9fbcd040bc7`, tandis que `origin/main` reste au SHA `5af14862c401d79112fb939789c1ea87cf25649b`; aucun des deux nouveaux SHA n'est confirmé dans Render. Le service était indiqué en ligne sur `www.versoair.com` et `/api/health` avait répondu `200` avec la base connectée au moment du relevé historique. La configuration courante Render, le rétablissement DB, les tâches de fond en multi-instance, la rotation des secrets et les parcours utilisateur restent à vérifier.

Le checkout accessible est sur `main` et contient le commit local `c00af4ad437600e719c8f3a52a8dc9fbcd040bc7`; `origin/main` reste à `5af14862c401d79112fb939789c1ea87cf25649b`. Aucun push n'a été effectué. Le commit `d521cace` trouvé dans un autre checkout n'est pas présent ici ou sur `origin`.

## Workspace scope update — 2026-10-08 (historical snapshot)

This section records the repo-local scope map and current evidence. It does not certify production.

| Workstream | Local finding / evidence | Status and next action |
|---|---|---|
| Deployment identity/configuration | Owner-confirmed Render dashboard identifies repository `xdavxdav/versoair2023`, branch `main`, full commit `e675ff493676b8bcf40a6a0e7e528d91f5e16b6a`, and Docker deployment using `./Dockerfile`; the live URL is `www.versoair.com`. On 2026-10-08 `git rev-parse HEAD` returned that same full SHA. The repository also contains a separate Node-runtime `render.yaml`; owner reports that no Blueprint is configured. | **That dated source/branch/SHA match is evidence for the 2026-10-08 checkout only. Blueprint absence remains owner-reported; instance count still needs Render-side confirmation.** |
| Startup/readiness | Owner-provided startup logs show the server started on port 5002, checked tables, initialized routes and Socket.IO, and found static files. Local source review shows both server entry points await `ensureAllTables()` before `listen`; that initializer can return normally after an initial DB connection failure and catches a number of DDL errors. | **Partially verified in production logs; local false-success readiness risk and boot-time schema mutation remain unresolved.** |
| Database | Startup log reports table verification completed: 2 tables created, 82 already present, and 0 failures. Prior live `/api/health` probe returned 200 with DB connected. | **Connection/schema check observed; provider/owner identity, backups, restore ability, data correctness, and authorization remain unverified.** |
| Migration safety | A table-creation/schema step ran during startup, but the supplied evidence does not establish exactly which changes ran, whether execution is versioned or serialized, or how rollback/recovery works. | **Not verified; inspect migration definitions and startup path with the DB owner before declaring safe.** |
| Background jobs | Startup logs show several scheduled jobs starting. The evidence does not establish idempotency, locking, restart behavior, or safety with multiple service instances. | **Partially observed; restart/multi-instance safety remains unverified.** |
| Product flows and data | Startup logs do not exercise sign-in, permissions, admin actions, notifications, or dashboard metric accuracy. | **Not verified; require authorized end-to-end tests and evidence-backed data checks.** |
| SEO | `PUBLIC_STATIC_ROUTES` is the shared source for the eight static prerender/sitemap routes. Live `seo:validate-sitemap -- https://www.versoair.com --sample=3` passed: robots points at the sitemap index, all eight page URLs were listed, and three sampled URLs returned 200. The first local prerender run missed Helmet tags on `/`, `/businesses-directory`, and `/batiment`; the snapshot script waited for network idle but not for React Helmet metadata. Added an explicit `og:title` readiness selector to React Snap. Latest `npm run build:prerender` then built, crawled, and validated all eight routes, including `/automobile` with one consistent set of checks. | **Local source fix validated 8/8. Commit/deploy and live metadata/Search Console verification remain outstanding.** |
| Background jobs | Static review found no distributed/process-level scheduler guard around the jobs started by both server entry points. Newsletter and digest processors read pending work before claiming it, journal cron inserts editions and queues mail without idempotency keys, and royalty distribution reopens a locked pool after any partial failure. Marketplace approval and session deletion use repeat-safe database predicates. | **Static risk review complete. Confirm production instance count and whether both entry points run against the same database; design idempotency/claim/recovery before changing job behavior.** |
| Feature honesty | Public sector pages expose analytics/finance/ad tabs with unsupported hard-coded values and fallbacks. Finance analytics also maps business ratings to revenue/occupancy/growth; construction analytics has fabricated fallback values. Examples include €485M, €45.8B, €245M, growth percentages, campaign counts, and sector KPIs. Added a shared demo notice to analytics/finance/ad tabs across the eight sector pages and to construction project/resource metrics, preserving the sample dashboard experience without presenting the values as verified reporting. | **Demo-label mitigation implemented locally per owner direction. Metric-source verification and production deployment remain open.** |
| Remaining owner-controlled gates | Confirm service instance count; provide Neon migration and backup/restore/recovery process for review; safe release authorization; Google OAuth console/secret configuration; Cloudflare sender-domain/token and real mail delivery; Neon ownership/access evidence; Search Console and official business profile access; live listing/data verification. Never include secret values in this plan. | **Keep explicitly blocked until owner evidence/access is supplied. Deployment branch, exact SHA, and Dockerfile mode are confirmed; no Blueprint is owner-reported.** |

### Priority work queue — current status and next actions

| Priority | What we can finish now | Status |
|---|---|---|
| **P0 — Production safety** | Historical Render evidence identifies `xdavxdav/versoair2023`, branch `main`, deployed SHA `e675ff493676b8bcf40a6a0e7e528d91f5e16b6a`, and Docker deployment via `./Dockerfile`; owner reports there is no Blueprint. Local `main` contains `c00af4ad`; `origin/main` remains at `5af14862`. | **Current Render SHA is unconfirmed.** Still request Render-side instance and entry-point confirmation. |
| **P0 — Startup and migrations** | Reviewed startup behavior locally; production logs show server startup and a table/schema step. | **Can investigate locally; not ready to close.** Neon/database owner must provide migration versioning/serialization and backup/restore or forward-recovery process before production startup/schema changes. |
| **P0 — Database and secrets** | Record the observed live database connection and identify what remains owner-verifiable. | **Partially verified.** Evidence indicates the live app connects to Neon. Neon ownership, backups, tested restore capability, data correctness, and secret rotation remain owner-side checks. |
| **P1 — SEO/prerender** | Added React Snap readiness wait for route-specific Helmet metadata; local prerender acceptance passed 8/8. Live sitemap/robots check passes for 8 URLs and 3 direct-URL samples. | **Live sitemap verified, but live metadata failed:** all 8 listed pages returned HTTP 200 and a title, but lacked meta description, canonical, and `og:title`. Current deployed SHA is unverified; confirm deployment before attributing this to the local fix. |
| **P1 — User flows, permissions, data accuracy** | Inspect local code and, with an authorized test account, exercise sign-in, permissions, admin actions, notifications, and representative dashboard values. | **Not complete.** User must perform authorized test-account actions and share non-sensitive results; do not share credentials. |
| **P1 — Feature honesty/UI** | Keep the sample dashboards visible and mark illustrative figures clearly. | **Shared demo notice added to all analytics/finance/ad panels across eight sector pages and construction's project/resource panels.** Reviewed and committed locally; verify metric sources before representing any figure as live reporting, and deploy through the normal `main` release process. |
| **P0 — Scheduled-job safety** | Newsletter sends are claimed and queued atomically; digest queue processing is guarded by a PostgreSQL advisory lock; journal edition and email-queue writes are transactionally deduplicated; royalty payouts run in a database transaction in `5af14862`. | **Local reliability fixes validated;** Render instance count, entry points, production overlap, and external email idempotency remain unverified. Royalty refinements are in local commit `c00af4ad`, not yet deployed. |
| **P2 — Maintainability** | Inventory tracked scripts/configuration, dead command targets, duplicate workers, and ignore rules; remove items only after reference checks and tests. | **Repository-root inventory recorded.** Dead seed command targets and historical cleanup-script statements need owner review; no configuration, frontend, or uncertain file was removed. |

### Local review findings and safe boundaries

**Background-job findings and local fixes (not production behavior tests):**

- `newsletter-cron.ts` and the admin send route now share a transactional campaign claim/enqueue operation. `digest-worker.ts` now serializes queue processing across processes using a PostgreSQL advisory lock.
- `journal-cron.ts` now uses a per-edition transaction lock and atomically records the edition and queues recipient email. Failed database writes roll back both records and queued messages.
- External email delivery remains at-least-once across a crash after provider acceptance but before marking a queue item sent; the current schema/provider contract supplies no idempotency key.
- `royalty-engine.ts` uses an atomic `open` → `locked` update and wraps royalty writes in a transaction; failures roll back payout changes. Notifications are sent after commit, and rollback failure discards the database connection. Pool refinements are committed locally as `c00af4ad`, not production-verified.
- `marketplace-auto-approve.ts` conditionally updates only `pending` rows, and session cleanup deletes expired rows; these individual database operations are repeat-safe. This does not prove the whole runtime is safe with multiple replicas.
- Both `index.ts` and `index-music.ts` initialize overlapping background jobs. Render's active instance count and which entry points are running in production must be confirmed by the owner.

**Feature-honesty review:** Eight public sector pages (`commerce`, `hotellerie`, `batiment`, `automobile`, `finances`, `divertissement`, `sante`, `logement`) expose analytics/finance/ads or performance tabs. Confirmed examples include metrics derived from business ratings but labelled as revenue/occupancy/growth, hard-coded fallback totals and percentages, finance values such as `€45.8B`, and campaign/ROI metrics with no verified source. The owner chose to keep the tabs as sample previews; a shared, visible notice now identifies the figures as illustrative and not verified live reporting. Keep listing/search functions separate, and do not present these values as measured facts until their sources and definitions are verified.

### Master sequence — P0 protect, P1 prove, P2 maintain

P0 protects production. P1 proves user-facing behavior and data. P2 covers polish and maintainability. Local validation is not release verification: code remains local-only until reviewed, committed, merged through the normal release path, deployed, and checked against the resulting Render commit.

| # | Priority | Action | Current evidence / exit condition |
|---|---|---|---|
| 1 | **P0 — Preserve, review, and ship the focused local changes** | Keep the royalty refinement separate from prior frontend work. Release only through the normal `main` process; verify the Render SHA before and after release. | Royalty refinement is committed locally as `c00af4ad`; `origin/main` remains at `5af14862`. Render deployment of either SHA remains unverified; no push was made. |
| 2 | **P0 — Resolve Neon migration and recovery ownership** | Ask the Neon/account owner which project, database, and branch are production; what backup/PITR and restore options exist and when recovery was last tested; who approves schema changes; how migrations are applied and recovered if they fail. | Startup logs show a `[MIGRATE]` table-creation step. Do not alter production startup/schema behavior until the step’s effects and recovery plan are understood and documented. |
| 3 | **P0 — Confirm scheduled-job deployment risk** | Ask who owns scheduled processes and confirm Render’s instance count and active entry point(s). Implement safe atomic claims/idempotency and failure recovery without changing schedules or product rules; retain external side-effect and payout risks as explicit gates. | Newsletter and journal writes are transactional; digest processing is serialized by a DB advisory lock; royalty distribution is transactional. Type-check and focused backend unit tests pass. Provider-level email idempotency and production overlap behavior remain open. |
| 4 | **P0 — Reconcile deployment configuration without changing runtime** | Treat the Render dashboard’s Dockerfile mode as active for this service. Owner reports there is no Blueprint. Keep the Node `render.yaml` discrepancy documented; decide separately whether to align the file. Do not create a Blueprint or change the live runtime merely to remove the discrepancy. | Local `main` matches `origin/main` at `5af14862`; the Render dashboard redirected to Google sign-in and could not be inspected. Current service mode, deployment SHA, instance count, and entry point(s) are unverified. |
| 5 | **P1 — Prove user-facing flows and data** | Use authorized synthetic test accounts to test sign-in/out, regular-user versus admin access, notifications, and representative directory/dashboard data. Record each check as pass, fail, or needs investigation. Do not use customer accounts or share credentials. | Not tested end-to-end. No local server was listening; the test-account seeder requires a configured test database and credentials. Do not seed or test against the production database. |
| 6 | **P1 — Keep preview metrics unmistakably illustrative** | Preserve the existing preview display; do not make further frontend changes in this backend-only pass. Keep the previously verified sample-label evidence and check production only after release. | Existing local commit has the shared notice across the eight sector dashboards; prior 390px review recorded the label as visible/readable. No UI files changed in this pass; production deployment and metric-source verification remain open. |
| 7 | **P2 — Verify SEO after deployment** | After release, inspect each live route’s title, description, canonical, and social metadata. Only then consider Search Console submission. | Sitemap index, child sitemap, robots declaration, 8 unique URLs, and 3 sampled direct URLs passed on 2026-10-10. A live check of all 8 URLs failed: descriptions, canonicals, and `og:title` were absent. Verify the deployed SHA before diagnosing the mismatch; Search Console submission remains open. |
| 8 | **P2 — Track cleanup separately** | Continue repository cleanup only as a separate workstream; preserve unrelated changes, and do not let lower-priority cleanup delay Neon recovery, job safety, or access checks. Remove dead command targets only after references and operator use are confirmed. | Root inventory found tracked `.vscode` files, no tracked build/dependency/upload artifacts, two package seed commands targeting a missing script, and prior cleanup targets absent from this checkout. No files/configuration were removed; review remains open. |

## 1. Priorities and release gates

### P0 — Production safety and deploy integrity

These are release gates. Resolve or document them before treating production as safely maintainable.

#### P0.1 Confirm and retain the source branch and deployment mapping

- Owner-provided Render evidence and confirmation from 2026-10-08 show repository `xdavxdav/versoair2023`, production branch `main`, deployed commit `e675ff493676b8bcf40a6a0e7e528d91f5e16b6a`, and Docker deployment via `./Dockerfile`.
- At that earlier check, local `HEAD` matched the deployed SHA. Current local `HEAD` is `ee0b4049a9580ac7a041db39865e852ddbac880f`, while `origin/main` remains at the earlier SHA. The local branch name is `fix/ui-and-geoadmin-test-accounts`; do not confuse it with the Render deployment branch.
- The checked-in `Dockerfile` builds with `npm run build` and starts `node dist/index.js`. `render.yaml` separately defines a Node-runtime service with `npm ci && npm run build` and `npm start`; the owner reports no Blueprint, so do not treat `render.yaml` as the active service config. Keep the owner-reported setting distinct from direct Render-side verification.
- Establish one authoritative deployment branch and make the release process report its commit SHA.
- Do not assume that local edits or a successful deployment affect `main` or production. Do not mark a fix complete without verifying it on the Render-deployed branch and live service.

**Acceptance:** Repository, Render deployment branch, full SHA, and active Dockerfile mode are recorded and the deployed SHA matches the intended source. The earlier deployment identity is documented, but current local changes are not on `main` or verified in Render. Owner reports no Blueprint; treat that as owner evidence, not independent Render verification.

#### P0.2 Reduce time to readiness without lying about readiness

- Keep noncritical periodic jobs after the HTTP server starts or move them to a managed worker process.
- Both `server/index.ts` and `server/index-music.ts` await `ensureAllTables()` before binding the port, and start periodic jobs after `listen`.
- `ensureAllTables()` returns normally when its initial DB connection fails and catches multiple table/column DDL errors. Startup can therefore log that tables are verified without proving the required schema is ready. `/api/health` separately probes the database and returns 500 on query failure; `/api/status` reports API status only.
- Do not simply defer required database initialization and then report a healthy service. Resolve the boot-time schema mutation and false-success signal through an approved versioned migration/readiness design; fail readiness clearly until required checks pass.
- Add bounded timeouts, explicit logs, and failure behavior for required initialization. Avoid silent retries or “success-shaped” health responses.

**Acceptance:** Cold starts and restarts are measured; health checks distinguish liveness from readiness; required routes start reliably; a dependency outage is visible and does not return a false healthy status.

#### P0.3 Make production schema changes controlled and recoverable

- The current working `render.yaml` build command is `npm ci && npm run build`; it does not run a migration, seed, or `db:push`. The file has uncommitted owner changes, and the active production service is owner-reported to use Docker instead.
- `package.json` currently defines `"db:push": "drizzle-kit push"` without `--force`, but `scripts/setup/_db_push.sh` pipes `yes` into it. Tracked editor tasks and project guidance also mention `db:push`. Do not run or retire these manual paths until the database owner confirms the supported procedure.
- Keep versioned migrations, but remove `npm run db:migrate` from the ordinary web-service build command. Run migrations as a separate, release-specific, observable one-shot step after review and before deploying application code that requires the new schema. Require explicit release approval or an equivalent controlled gate.
- Ensure only one migration runner can operate at a time, including across simultaneous deploys/retries. Document who/what may run migrations, backup and rollback/forward-repair procedures, and how to recover a failed migration.
- Keep seed data separate from production schema migration. Do not run `npm run seed` automatically on every production build.

**Acceptance:** The ordinary web build contains no schema push, migration, or seed command. A separate controlled release step applies reviewed, versioned migrations once, with concurrency protection, backup/recovery procedures, and a successful test against a representative database snapshot.

#### P0.4 Verify the production database source and secret hygiene

- The `e675ff4` version of `render.yaml` declared a Render database named `versoair-db` and mapped `DATABASE_URL` to its connection string. The current uncommitted working copy removes that mapping. Neither version proves that the live Docker service has no environment override or external database attachment.
- The live health endpoint returned HTTP 200 and reported the database connected. This establishes reachability at the time checked, not the identity, ownership, backup policy, or intended source of the database.
- Verify the actual Render environment/configuration without copying secret values into this document. Confirm whether Render PostgreSQL or another provider is authoritative and whether any Neon references are active.
- `@neondatabase/serverless` was not found as a direct `package.json` dependency or in server source in the available check; the lockfile contains indirect references. Re-search all source, build, and deployment paths before removing anything.
- `.env` and `SUPERADMIN_CREDENTIALS.md` were absent from the visible workspace. The `.gitignore` excludes `.env` patterns and re-includes `.env.example`. Local Git history is available, but secret exposure across remote history, forks, and provider logs still needs an authorized review.
- Treat previously exposed credentials as compromised until an authorized operator confirms rotation. Rotate affected database, JWT, session, and third-party credentials; invalidate sessions/tokens where appropriate. Check audit logs and production configuration without exposing values. History rewriting/removal does not replace rotation.

**Acceptance:** The live database provider and account are verified; only necessary DB drivers remain; an authorized owner confirms credentials were rotated and the exposure response is recorded; Git history and forks/caches are checked from a real clone or provider tooling.

### P1 — User-visible correctness and core reliability

#### P1.1 Establish one schema and data lifecycle

- Reconcile Drizzle schema definitions, `ensureAllTables()`, SQL migrations, and seed scripts. Select and document the authoritative schema source and safe provisioning lifecycle.
- Do not delete compatibility code or seed utilities until call sites, deployed databases, and rollback needs have been checked.
- Plan incremental removal of legacy schema duplication, including `shared/schema.ts` and `server/services/ensure-tables.ts`, with schema-drift checks and migration tests.

**Acceptance:** A clean database can be provisioned reproducibly; schema changes are migration-backed; schema drift is detectable; seed operations are explicit, environment-scoped, and idempotent where required.

#### P1.2 Audit authentication and authorization coverage

- Map public, authenticated, admin, GeoAdmin, business, artist, music, OAuth, and socket routes to the intended roles and ownership checks.
- Test unauthenticated access, role escalation, cross-user resource access, CSRF, cookie/session behavior, CORS, OAuth callback handling, and socket event authorization.
- Inventory overlapping JWT/session/Passport/cookie/CSRF mechanisms. Simplify only after route coverage is understood; avoid broad rewrites that weaken protection.

**Acceptance:** A route/access-control matrix exists; automated negative tests cover sensitive routes and ownership boundaries; no unexplained/unprotected route remains.

#### P1.3 Verify GeoAdmin CRUD end to end

- Test create, read/list, update, delete/archive, validation, authorization, and failure behavior for each GeoAdmin-managed entity.
- Confirm persistence after reload and consistency in public/admin views; document unavailable or intentionally restricted operations.

**Acceptance:** CRUD test evidence covers valid and invalid inputs, permissions, persistence, and visible status; incomplete capabilities are labeled rather than marked complete.

#### P1.4 Make dashboards and notifications trustworthy

- Reproduce the reported notification click issue. Each notification should either navigate to its relevant content, mark as read, or clearly disclose why it cannot; test keyboard and mobile interaction as well.
- Reproduce dashboard layout shifts and unexpected scrolling with realistic data and slow network responses. Stabilize loading/empty states and layout dimensions instead of masking the movement.
- Trace each dashboard metric to its live query. Identify mock, fixture, stale, fallback, and synthetic data; do not show illustrative values as real operational statistics.
- Define one shared status/category color mapping for admin dashboards and test contrast/meaning consistently.
- Test on supported mobile, laptop, and large-screen sizes; check horizontal overflow, sticky/fixed overlap, and panel/content bounds. Preserve intentional viewport panels rather than forcing every section to full height.

**Acceptance:** Authenticated manual and automated checks demonstrate notification behavior, stable loading/scrolling, live-data provenance, and consistent accessible status colors.

#### P1.5 Finish or clearly gate incomplete product features

For every feature below, choose one of two outcomes: deliver and test a real end-to-end capability, or hide/disable it and label it accurately until it is ready. Do not call a feature “complete” because a route or UI control exists.

| Feature | Required verification or safe interim behavior |
|---|---|
| Vector search | Verify an actual vector index/provider and retrieval quality; otherwise label and present it as basic SQL/text search. |
| Analytics | Verify backend aggregation, filters, date ranges, and data provenance before presenting client-facing metrics. |
| Equalizer, crossfade, pitch shift | Wire controls to the audio engine and test audible behavior, or disable the controls. |
| Video | Verify upload, storage, authorization, returned media URL, and playback in the actual post/player surfaces. The available `PostCard` source has a `<video controls>` element when `videoUrl` exists, but end-to-end upload-to-play was not verified. Resolve CSP/media-host rules only for approved origins. |
| SMTP/email | Confirm provider, secret configuration, sender/domain status, bounce/error handling, and actual delivery to controlled test mailboxes. An initialized socket or endpoint is not proof of email delivery. |
| AI chat | Verify a real configured model/provider, access controls, usage/error handling, and safe production behavior; otherwise disable or label as unavailable. |
| Astrology | Verify a working backend and meaningful outputs; otherwise hide/disable the stub. |
| Offline sync | Define supported offline actions, conflict rules, persistence, and replay; otherwise remove claims/UI implying sync works. |
| Push notifications | Verify browser permission, service worker/subscription lifecycle, server delivery, and opt-out. Socket.IO delivery alone is not browser push. |
| Payments/payouts | Deferred from implementation in this pass; see section 4. Keep real payouts unavailable until independently verified. |

**Acceptance:** Each exposed feature has a tested capability statement and failure path; unfinished features are gated and do not imply functionality they lack.

#### P1.6 Keep translated headings to one rendered text

- A production-page inspection found homepage gold headings whose CSS pseudo-elements emitted a second copy from French `data-text` while Google Translate translated the visible content. The local workspace change removes pseudo-element copies and styles the single translated text node.
- This remains a local edit only; the current checkout has Git metadata, but no Render deployment/commit mapping has been verified. Do not infer production presence from local branch status.
- Run local build/check and inspect translated headings in the live browser at desktop and mobile widths only after verifying that the intended release was deployed.

**Acceptance:** One visible heading per panel in original and translated languages; no decorative layer repeats untranslated source text; build and live visual check pass.

### P1 — Search visibility and SEO

- Give every indexable route a unique, accurate `<title>` and meta description. Validate both initial HTML and client-side route changes.
- Provide a reachable `/sitemap.xml` containing canonical, public, indexable URLs only. Choose static or dynamic generation based on the inventory and update process; exclude private/admin/user-specific routes.
- Check `robots.txt`, canonical tags, redirects, status codes, and representative pages for crawlability. A client-rendered app should be tested with a search-engine renderer or server-rendered metadata strategy where needed.
- Submit the sitemap to Google Search Console only after it is live, valid, and representative production pages are verified.

**Acceptance:** Automated URL/title/description checks pass; sitemap and robots endpoints return expected content; private routes are excluded; crawl tests show indexable page content and no accidental blocking.

### P2 — Maintainability and repository hygiene

- The previously mentioned `check-transactions.cjs` and `fix-slug-duplicates.*` files are absent from the repository root currently inspected. Do not delete or recreate files based on a prior workspace inventory.
- Two `package.json` streaming-seed commands target the absent `_seed_streaming_data.cjs`; references were not found outside `package.json`. Confirm whether these commands should be retired or restored before changing the manifest.
- `client/public/sw.js`, `client/public/service-worker.js`, and `public/service-worker.js` are tracked but distinct. The app registers `/sw.js`; server static handling still serves both worker names. Preserve these frontend assets under the current backend-only scope.
- The repository-root tracked set has no build/dependency/upload/OS artifacts; `.vscode/` has five tracked shared files. Keep them, and do not inspect or modify the untracked MCP configuration.
- `.gitignore` covers `node_modules/`, `dist/`, `dist-music/`, `.idea/`, `.DS_Store`, and `uploads/`. Review tracked files and editor settings before any cleanup; preserve intentional shared workspace settings.
- Add tests/lint/build commands that are appropriate to the actual package scripts; avoid introducing duplicate tooling.

**Acceptance:** Tracked-file inventory contains no accidental secrets, build artifacts, dependencies, uploads, OS detritus, or personal editor state; retained scripts have an owner/purpose; deletions are verified against call sites and automation.

## 2. Explicitly deferred

### Stripe and real-money payouts

Do not implement or expose payout functionality as part of the initial remediation pass. Keep payouts disabled for real users until the complete data flow is designed and independently reviewed: account eligibility, payout state transitions, webhook signature/idempotency, ledger/reconciliation, retries, failure handling, audit trail, permissions, and end-to-end sandbox tests. Re-enable only through an explicit release gate after legal/compliance and operational owners approve.

The current backend still exposes artist payout-request and admin payout-status routes, and the royalty scheduler updates artist wallet balances. Their safe gating for real users is not verified. They were not changed in this backend pass because the owner explicitly asked to preserve existing functionality rules; obtain explicit approval and an independent review before changing or enabling any money flow.

Existing payment/webhook surfaces must still be checked for safe gating and must not imply that incomplete payouts are available. This is a containment check, not a Stripe feature implementation.

### Incorporation (“Inc”) and legal/business formation

Defer incorporation and other company-formation/legal administration. Track it separately from software reliability work; do not treat it as a code remediation.

## 3. Evidence snapshot (available workspace and live site)

Evidence is limited to files visible in the workspace and browser checks made during this session. It is not a substitute for access to Render settings, Git history, authenticated accounts, or the inaccessible Desktop documents.

| Area | Current evidence | Status |
|---|---|---|
| Git branch / Render deploy branch | On 2026-10-08, local HEAD matched owner-reported Render SHA `e675ff493676b8bcf40a6a0e7e528d91f5e16b6a`. Current local branch is `fix/ui-and-geoadmin-test-accounts` at `ee0b4049a9580ac7a041db39865e852ddbac880f`; `origin/main` remains at the earlier SHA. | **The current local changes are not on `main` and are not verified in production.** |
| Render build/start configuration | Owner-provided Render evidence identifies Docker mode using `./Dockerfile`, whose production entry point is `node dist/index.js`. The working `render.yaml` separately defines Node runtime, `npm ci && npm run build`, and `npm start`; that file has uncommitted owner changes and does not prove the live configuration. Owner reports no Blueprint. | **Docker mode and no-Blueprint report remain owner-provided; current Render instance count/configuration source is unverified.** |
| Schema push | `package.json` currently defines `"db:push": "drizzle-kit push"` without `--force`; `scripts/setup/_db_push.sh` still pipes `yes` into the command. The helper has no discovered call site, but editor tasks and project guidance still refer to `db:push`. | **Manual schema-push confirmation can still be bypassed; deployment does not invoke it in the current `render.yaml` build command. Owner/operator review remains required before removal.** |
| Production seed | `npm run seed` exists, but is not in the checked-in Render build command. | **Confirmed local script; no automatic seed in this file** |
| Database mapping | Owner previously identified Neon and supplied startup/health evidence showing a connection. The working `render.yaml` now has no `DATABASE_URL` mapping to its declared Render DB, but that uncommitted file still does not establish the live Docker service's environment source. | **Connection and reported Neon usage observed; current provider ownership, live environment source, backup/restore, and data correctness unverified.** |
| Startup | Owner-provided logs show server startup on port 5002, table checks, routes and Socket.IO initialization, and static-file discovery. Local source review shows both entry points await `ensureAllTables()` before listening; initializer can return normally after DB connection or DDL errors. | **Partially verified from logs; false-success readiness risk and controlled fix remain open** |
| Database | Startup log reports 2 tables created, 82 already present, and 0 failed; earlier live `/api/health` check reported connected. | **Connected/schema check observed; provider ownership, backup/restore, and data correctness unverified** |
| Migration safety | Schema/table creation occurred during startup according to logs; versioning, serialization, exact effects, and recovery were not demonstrated. | **Not verified; review migration path and recovery with owner** |
| Background jobs | Static review found newsletter/digest work selected before claims, journal edition/email queue writes without a transaction, and royalty distribution reopening a locked pool after partial failure. Both server entry points initialize overlapping schedulers. | **Risks identified; Render instance count and production overlap/restart behavior were unknown at this snapshot.** |
| Product flows and data | Startup evidence does not test authentication, permissions, admin actions, notifications, or metric accuracy. | **Not verified; end-to-end and data-source checks remain required** |
| Prerender SEO | Updated `server/scripts/run-react-snap.ts` to wait for `meta[property="og:title"]`, rather than relying only on `networkidle0` before snapshot capture. Latest `npm run build:prerender` completed successfully; all eight routes passed title, description, canonical, Open Graph, and Twitter validation, including a clean single result for `/automobile`. | **Local 8/8 validation passed. Commit/deploy and live verification remain outstanding.** |
| Secret files / history | A local `.env` file is present but ignored and untracked; its contents were not read. `.env.example` is the only tracked `.env`-pattern file. `SUPERADMIN_CREDENTIALS.md` is absent from the repository root. `.gitignore` excludes `.env` patterns. | **Local tracked-file state checked; remote history/forks/provider audit and credential rotation remain unverified. Never copy secret values into evidence.** |
| Neon driver | No `@neondatabase/serverless` reference was found in app source. `package.json` includes `@neon/config` and `@neon/env` in the uncommitted working diff; `package-lock.json` also has Neon-related package entries. | **Not enough evidence to remove packages or identify the production connection source.** |
| Cleanup scripts | `check-transactions.cjs` and `fix-slug-duplicates.*` are absent from the repository root currently inspected. `package.json` has `db:seed-streaming` and `db:seed-streaming:reset` commands whose `_seed_streaming_data.cjs` target is absent. | **Broken command targets confirmed; do not remove or recreate until the intended operator workflow is confirmed.** |
| Ignore rules | `.env.example` is the only tracked `.env`-pattern file; no tracked `dist`, `node_modules`, `uploads`, `.idea`, or `.DS_Store` path was found. Five `.vscode` files are tracked; `.vscode/` is not ignored. | **Root hygiene inventory complete; retain the shared workspace files and do not inspect or alter untracked MCP configuration.** |
| Dashboard and feature behavior | Source contains notification UI and a conditional video player; authenticated CRUD, live metrics, playback flow, email delivery, and other end-to-end paths were not established. | **Unverified / partial by feature** |
| Translated homepage headings | Local CSS/markup edit now avoids duplicate pseudo-text and allows translation. No commit or live deployment proof is available. | **Local-only, unverified in production** |
| Type/build verification | Node/npm are installed in this checkout but are not on the default terminal PATH; supplying `/Users/admin/.local/share/node-v24.21.0/bin` and the installed Chrome-for-Testing executable allowed the local prerender pipeline to complete. | **Full local build/prerender passes; not production evidence** |
| Referenced audit documents | Five files under `/Users/admin/Desktop/files` were denied by sandbox policy. | **Not reviewed; upload to accessible workspace to merge** |

## Workspace scope update — 2026-10-09

The owner authorized continued implementation for this sequence with a backend-only boundary: preserve existing frontend display, parameters, settings, and product rules. No client files or deployment/database settings were changed in this pass. The checkout is now at local commit `ee0b4049a9580ac7a041db39865e852ddbac880f`; `origin/main` remains `e675ff493676b8bcf40a6a0e7e528d91f5e16b6a`. The focused SEO/demo-label commit is local and not verified on production.

| Area | Current local evidence | Status / remaining gate |
|---|---|---|
| Newsletter delivery | Scheduled cron and admin send now use one transaction that conditionally claims a campaign, queues all active subscribers, and marks it sent atomically. A concurrent sender that loses the claim queues nothing. | **Local backend change; tests pass.** Existing campaigns left in `sending` by older partial runs may already have some queued messages; recipient-level historical deduplication is not available in the current schema. |
| Digest worker | A PostgreSQL advisory lock now ensures only one worker processes/retries the email queue at a time across app processes sharing the database. | **Local backend change; helper tests pass.** A provider acceptance followed by process failure before the queue status update can still result in at-least-once delivery; external provider idempotency is not established. |
| Journal cron | A per-edition PostgreSQL transaction lock, existing-edition check, edition insert, and subscriber queue inserts are atomic. Weekly and monthly jobs use separate lock keys. | **Local backend change; type/build checks pass.** No database constraint or production overlap test was added; do not apply schema changes without the migration/recovery owner gate. |
| Royalty/payout behavior | The royalty engine still unlocks a pool after a partial failure, and wallet/payout routes remain present. The owner requested preserving existing functionality rules; payout behavior was not changed. | **Open release gate.** The plan separately defers real-user payouts pending legal/operational approval and independent review. |
| Migration tooling | `package.json` currently has non-forced `drizzle-kit push`, but `scripts/setup/_db_push.sh` still pipes `yes` into it. Tracked editor tasks and project guidance also mention `db:push`; its operational uses have not been approved for removal. | **Open.** Do not run or retire the workflow until the database owner approves the migration/recovery procedure. |
| Repository hygiene | The repository-root tracked set contains `.env.example` but no tracked build/dependency/upload artifacts. Five `.vscode` files are tracked. The earlier-mentioned `check-transactions.cjs` and `fix-slug-duplicates.*` targets are absent from the repository root; two package seed commands point to the absent `_seed_streaming_data.cjs`. | **Inventory updated, cleanup not authorized.** Keep tracked workspace files and settings; leave the untracked MCP config uninspected and untouched. |
| Deployment and user verification | Current local commit differs from `origin/main`; no Render instance/entry-point evidence, authorized account results, Neon recovery evidence, or deployment of this commit is available. | **Owner-controlled items remain blocked.** |

## 4. End-to-end roadmap for everything remaining

This is the recommended work order, not a promise that all work can be completed from the current checkout. Deployment identity is confirmed; resolve the remaining configuration-source question and proceed with independent repo-local work. Deliver small, reviewable changes with proof on the actual Render deployment branch. Do not bundle risky database, auth, payment, and UI changes into one release.

### Stage 0 — Unlock reliable verification (blocking)

**Work**

1. Deployment identity matched on 2026-10-08: the local SHA then equaled the owner-confirmed Render deployed SHA on `main`. The current local `HEAD` differs from `origin/main`; record and verify a new deployed SHA after an authorized release.
2. Render dashboard evidence identifies Docker mode via `./Dockerfile`; owner reports no Blueprint. Request Render instance count and configuration-source confirmation. Record environment sources without secret values.
3. Make the five Desktop source documents available inside the workspace and reconcile any additional findings before implementation.
4. Keep the available local Node/npm toolchain usable; rerun focused checks in CI/release branch as well as locally.
5. Establish a safe test environment and authorized test accounts for admin, GeoAdmin, business, artist, and regular-user flows. Use synthetic/non-sensitive records; the owner should execute sign-in and permission checks and share only non-sensitive results.

**Exit gate:** Current deployment maps to the exact local SHA and Render instance count/configuration are known; source audit documents are consolidated; required tests can run locally or in CI. If blocked, continue only with read-only changes that do not depend on unavailable secrets/production access.

### Stage 1 — Contain immediate production risk

**Work**

1. Have the authorized infrastructure owner verify whether previously exposed secrets were rotated. Rotate any uncertain credential, revoke affected sessions/tokens, inspect provider audit logs, and separately assess Git history/forks/caches. Never put credential values in tickets or this plan.
2. Verify the actual production database provider and ownership against Render configuration and database-side evidence. Decide whether Render PostgreSQL or another provider is canonical; remove the Neon driver only after exhaustive source/build/runtime reference checks.
3. Remove the forced schema-push option/workflow and automatic production seeding. Confirm seeds are not reachable from deploy hooks, startup code, or manual runbooks.
4. Explicitly disable or gate real-user Stripe payouts and other incomplete money flows. Do not test with real payouts.
5. Add/verify backups, retention, and a restore test before schema work.

**Exit gate:** Secret rotation and history investigation have owner-confirmed evidence; production DB identity and backup/restore process are recorded; no forced push or automatic seed can run in the web deploy path; payouts remain safely gated.

### Stage 2 — Make boot and database changes predictable

**Work**

1. Trace startup for both `server/index.ts` and `server/index-music.ts`; measure current cold start and identify required versus optional startup dependencies.
2. Define separate liveness/readiness semantics. Keep required dependencies visible in readiness; move only optional work to post-listen jobs or a dedicated worker. Add bounded timeouts and actionable failure logs.
3. Choose one versioned schema/migration lifecycle. Remove migration execution from the normal web build and define a serialized, release-specific one-shot migration job with review, backup, lock/concurrency handling, and forward-recovery procedures.
4. Reconcile `shared/schema.ts`, `ensureAllTables()`, migration SQL, and seeds incrementally. Generate/check schema drift and prove a clean database can be provisioned from documented steps.
5. Test cold start, DB unavailable, migration failure, restart, and simultaneous/retried release scenarios in staging.

**Exit gate:** Both applications have measured readiness behavior; web builds do not mutate schema; migrations are reviewed and serialized; clean install and recovery tests pass.

### Stage 3 — Prove authorization, admin workflows, and data correctness

**Work**

1. Create an API/page/socket route matrix with public/authenticated/admin/owner requirements and corresponding negative tests.
2. Test JWT/session/cookie/CSRF/CORS/OAuth/Socket.IO boundaries, role escalation, cross-account access, and logout/revocation. Simplify mechanisms only after tests protect intended behavior.
3. Complete GeoAdmin CRUD tests (create/read/update/delete or archive), validation, permissions, persistence, and failure states.
4. Trace dashboard and analytics values from UI through API/query to source tables. Mark mocks and estimates; remove or visibly label data that is not factual.
5. Correct aggregation, filtering, time zone, pagination, and empty/loading/error states; test against known synthetic data.

**Exit gate:** All sensitive routes have expected access tests; GeoAdmin CRUD evidence is complete; each user-visible metric has a documented source and a test against known data.

### Stage 4 — Fix user-reported UI and feature honesty

**Work**

1. Reproduce notification clicks with an authenticated account. Make each supported action navigate to relevant content or mark read, provide a clear fallback, and test keyboard/mobile interactions.
2. Reproduce dashboard layout shifts/scroll jumps under slow API responses and realistic data. Fix root causes (unstable dimensions, async content insertion, competing scroll containers) and check multiple viewport sizes.
3. Define one shared admin status/category color map with accessible contrast; update and test all admin dashboard surfaces consistently.
4. Verify the homepage translated headings show one text instance in each language and viewport. Reapply/review the local CSS fix on the verified branch and run build plus visual checks before production deployment.
5. For vector search, audio effects, video, SMTP, AI chat, astrology, offline sync, and push notifications, make a feature-by-feature decision: implement fully with measurable end-to-end tests, or hide/disable and label accurately. Prioritize based on user value only after behavior and ownership are agreed.
6. For video specifically, test upload → storage → authorized URL → playback → failure/unsupported-media states, including approved CSP sources. Existing conditional player markup alone is not completion evidence.
7. For email and browser push, test delivery to controlled accounts and permission/opt-out lifecycle; do not confuse Socket.IO messages with browser push or initialized transport with SMTP delivery.

**Exit gate:** Reported UI bugs have before/after repros and automated/manual evidence; displayed data and feature claims match working behavior; gated features are inaccessible to users until ready.

### Stage 5 — SEO and repository maintainability

These tasks can run in parallel with Stage 3–4 after branch/tool access is established, but Search Console submission waits for SEO acceptance.

**SEO work**

1. Inventory indexable public routes; set unique titles/descriptions and canonical metadata for direct loads and client-side navigation.
2. Validate status codes, redirects, `robots.txt`, canonical URLs, rendering/crawl visibility, and exclusion of authenticated/admin/private routes.
3. Generate and validate `/sitemap.xml` from canonical public pages and the intended listing inventory; verify freshness and size behavior.
4. Submit to Search Console only after the deployed sitemap and representative pages pass the crawl checks.

**Repository work**

1. Use Git history and references to inventory old patch scripts and `.js`/`.mjs`/`.cjs` duplicates. Document owner/purpose; delete only proven dead files.
2. Inspect tracked files for `.env`, credentials, build outputs, `node_modules`, uploads, `.idea`, `.vscode`, and OS files. Preserve intentional shared workspace settings; ignore/remove only verified personal/generated material.
3. Review `check-transactions.cjs`, `fix-slug-duplicates.mjs`, and the direct/indirect Neon references before deciding removal.
4. Add or repair focused tests for deployment config, schema lifecycle, route metadata, and UI regressions using existing project tooling.

**Exit gate:** Public routes and sitemap pass automated crawl checks; Search Console submission is recorded only after production verification; tracked-file/script inventories have an owner and no accidental generated/secrets files.

### Stage 6 — Release, verify, and operate

For every PR/release:

1. Run focused tests, type-check, build, and relevant security/config tests in CI.
2. Review the diff and migration/rollback plan; obtain appropriate database/security/product-owner approvals.
3. Merge to the confirmed Render branch and record PR/commit SHA.
4. Confirm Render deployed that exact SHA, inspect startup/readiness and migration logs, and run health checks.
5. Run production smoke tests for public pages, login/logout, representative authorized dashboard operations, notifications, and any feature included in the release.
6. Watch logs/metrics/error rates for a defined observation period; roll back app or apply a documented forward repair if acceptance fails.
7. Mark each item complete only with the evidence template below. Keep partial/deferred items open and visible.

**Final operating gate:** No unresolved P0 issue is silently waived; readiness/rollback/backup ownership is clear; critical user journeys and real data are verified; every release is traceable to a deployed SHA. This is an operational standard, not a guarantee of zero defects.

### Parallel work and explicit dependencies

- **Must happen first:** Stage 0 branch/access/tooling setup. Security containment and product-specific investigations can begin in parallel once authorized owners are identified.
- **Before schema consolidation:** backups/restore evidence and migration ownership (Stage 1).
- **Before changing auth implementation:** route/access matrix and regression tests (Stage 3).
- **Before exposing analytics or feature claims:** source/behavior verification (Stages 3–4).
- **Before Search Console:** deployed SEO metadata, robots, canonical URLs, and sitemap all pass (Stage 5).
- **Always deferred from this roadmap:** Stripe payout implementation and incorporation/legal formation. Only verify safe payout gating; no real-money processing work is included.

## 5. Completion evidence template

Copy this block for every issue when implementation begins:

```text
Issue / ID:
Priority:
Status: pending | partial | verified complete | deferred
Decision / scope:
Files changed:
Commit SHA or PR:
Tests and exact results:
Production verification (URL, deployed SHA, date, steps):
Remaining work / known limitations:
Owner or approval required:
```

Do not use a commit hash from a different branch as proof that production contains a fix. Do not use a healthy homepage or a passing build as proof that unrelated features work.

## 6. Out of scope for this document

- This document alone does not authorize source-code remediation, production configuration changes, credential access, migrations, payment operations, or deletions. On 2026-10-09 the owner explicitly authorized local backend-only reliability fixes while preserving frontend display, parameters, settings, and product rules. That does not authorize production deployment, database/migration operations, payout changes, or cleanup deletions.
- Stripe/payout implementation and incorporation/legal work remain deferred.
- The inaccessible files are not represented or summarized; merge them only after their contents are made available through an accessible workspace.
