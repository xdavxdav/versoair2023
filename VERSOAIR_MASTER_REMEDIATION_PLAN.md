# Verso Air — Master Production Remediation Plan

> **Purpose:** One evidence-led roadmap for making the website safer to deploy, reliable to operate, accurate for users, and maintainable. This is a remediation plan, not a claim that the listed work is already complete.
>
> **Status rule:** A task is complete only when its acceptance checks pass and it has a commit hash or PR link that can be verified against the branch Render actually deploys. Label unfinished work **partial** and state what remains. Never publish credentials, secret values, or private customer data in evidence.

## Résumé exécutif

Les vérifications locales et le contrôle du site en production montrent une base fonctionnelle — `/api/health` a répondu `200` avec la base de données connectée — mais cela ne suffit pas à démontrer que chaque déploiement, fonctionnalité ou parcours utilisateur est sûr et prêt. Les prochaines étapes les plus importantes sont de confirmer la branche déployée par Render, de sécuriser le processus de démarrage et les migrations, de vérifier la rotation des secrets, puis de tester les fonctions visibles par les utilisateurs avec des critères mesurables.

Le dépôt de travail accessible ici ne contient pas de dossier `.git`. Par conséquent, la branche, l’historique, les fichiers suivis et les hashes de commit ne peuvent pas être vérifiés dans cet environnement. Les fichiers complémentaires indiqués sur le Bureau n’étaient pas accessibles par la sandbox; leur contenu n’est pas supposé dans ce document.

## 1. Priorities and release gates

### P0 — Production safety and deploy integrity

These are release gates. Resolve or document them before treating production as safely maintainable.

#### P0.1 Confirm the source branch and deployment mapping — first action

- Verify directly in Render which repository, service, branch, build command, start command, and environment group back the public production site.
- Verify the configured Git remote and current branch from an accessible clone; compare the deployed commit with the intended release branch.
- Establish one authoritative deployment branch and make the release process report its commit SHA.
- Do not assume that local edits or a successful deployment affect `main` or production. Do not mark a fix complete without verifying it on the Render-deployed branch and live service.

**Acceptance:** Render service settings and the deployed commit SHA are recorded; source branch and deployment mapping agree; a harmless release can be traced from branch to deployed SHA.

#### P0.2 Reduce time to readiness without lying about readiness

- Keep noncritical periodic jobs after the HTTP server starts or move them to a managed worker process.
- Current `server/index.ts` starts email initialization asynchronously and schedules recurring jobs after `listen`, but it awaits `ensureAllTables()` and `registerRoutes(app)` before binding the port. Those are material remaining pre-listen tasks.
- Inspect `server/index-music.ts` separately; do not assume it has the same sequencing.
- Do not simply defer required database initialization and then report a healthy service. Define readiness: `/api/health` should only report ready when dependencies required to serve requests are available. If migrations or schema checks are separated from boot, fail readiness clearly until complete.
- Add bounded timeouts, explicit logs, and failure behavior for required initialization. Avoid silent retries or “success-shaped” health responses.

**Acceptance:** Cold starts and restarts are measured; health checks distinguish liveness from readiness; required routes start reliably; a dependency outage is visible and does not return a false healthy status.

#### P0.3 Make production schema changes controlled and recoverable

- `render.yaml` currently builds with `npm ci && npm run build && npm run db:migrate`; automatic seed execution and `db:push` are not in that command.
- `package.json` still defines `"db:push": "drizzle-kit push --force"`. Remove the force option and retire this workflow for production after checking all callers and operator procedures.
- Keep versioned migrations, but remove `npm run db:migrate` from the ordinary web-service build command. Run migrations as a separate, release-specific, observable one-shot step after review and before deploying application code that requires the new schema. Require explicit release approval or an equivalent controlled gate.
- Ensure only one migration runner can operate at a time, including across simultaneous deploys/retries. Document who/what may run migrations, backup and rollback/forward-repair procedures, and how to recover a failed migration.
- Keep seed data separate from production schema migration. Do not run `npm run seed` automatically on every production build.

**Acceptance:** The ordinary web build contains no schema push, migration, or seed command. A separate controlled release step applies reviewed, versioned migrations once, with concurrency protection, backup/recovery procedures, and a successful test against a representative database snapshot.

#### P0.4 Verify the production database source and secret hygiene

- The checked-in `render.yaml` declares a Render database named `versoair-db` and maps `DATABASE_URL` to its connection string. This does **not** prove that the live Render service has no environment override or external database attachment.
- The live health endpoint returned HTTP 200 and reported the database connected. This establishes reachability at the time checked, not the identity, ownership, backup policy, or intended source of the database.
- Verify the actual Render environment/configuration without copying secret values into this document. Confirm whether Render PostgreSQL or another provider is authoritative and whether any Neon references are active.
- `@neondatabase/serverless` was not found as a direct `package.json` dependency or in server source in the available check; the lockfile contains indirect references. Re-search all source, build, and deployment paths before removing anything.
- `.env` and `SUPERADMIN_CREDENTIALS.md` were absent from the visible workspace. The `.gitignore` excludes `.env` patterns and re-includes `.env.example`. Since this checkout has no `.git`, prior exposure in repository history cannot be verified.
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
- This is a local edit only: the workspace has no `.git`, no commit/PR can be supplied, and `npm run check` could not run because `npm` was unavailable. The edit is not proven present on Render or `main`.
- After an accessible tracked checkout is available, review/reapply as appropriate, run the build/check, and inspect translated headings in the live browser at desktop and mobile widths.

**Acceptance:** One visible heading per panel in original and translated languages; no decorative layer repeats untranslated source text; build and live visual check pass.

### P1 — Search visibility and SEO

- Give every indexable route a unique, accurate `<title>` and meta description. Validate both initial HTML and client-side route changes.
- Provide a reachable `/sitemap.xml` containing canonical, public, indexable URLs only. Choose static or dynamic generation based on the inventory and update process; exclude private/admin/user-specific routes.
- Check `robots.txt`, canonical tags, redirects, status codes, and representative pages for crawlability. A client-rendered app should be tested with a search-engine renderer or server-rendered metadata strategy where needed.
- Submit the sitemap to Google Search Console only after it is live, valid, and representative production pages are verified.

**Acceptance:** Automated URL/title/description checks pass; sitemap and robots endpoints return expected content; private routes are excluded; crawl tests show indexable page content and no accidental blocking.

### P2 — Maintainability and repository hygiene

- Review `check-transactions.cjs` and `fix-slug-duplicates.mjs` before deleting: both exist in the available workspace, but whether they are duplicates/dead is not established.
- Inventory duplicate `.js`/`.mjs` and `.js`/`.cjs` pairs and the 174-commit history from a real clone. Search references, CI, deployment hooks, and operator documentation before removal.
- Current `.gitignore` already covers `node_modules/`, `dist/`, `dist-music/`, `.idea/`, `.DS_Store`, and `uploads/`. `.vscode/` is not ignored. Verify tracked files with Git, remove generated/local files from tracking only when confirmed, and preserve intentional shared VS Code settings if the team relies on them.
- Add tests/lint/build commands that are appropriate to the actual package scripts; avoid introducing duplicate tooling.

**Acceptance:** Tracked-file inventory contains no accidental secrets, build artifacts, dependencies, uploads, OS detritus, or personal editor state; retained scripts have an owner/purpose; deletions are verified against call sites and automation.

## 2. Explicitly deferred

### Stripe and real-money payouts

Do not implement or expose payout functionality as part of the initial remediation pass. Keep payouts disabled for real users until the complete data flow is designed and independently reviewed: account eligibility, payout state transitions, webhook signature/idempotency, ledger/reconciliation, retries, failure handling, audit trail, permissions, and end-to-end sandbox tests. Re-enable only through an explicit release gate after legal/compliance and operational owners approve.

Existing payment/webhook surfaces must still be checked for safe gating and must not imply that incomplete payouts are available. This is a containment check, not a Stripe feature implementation.

### Incorporation (“Inc”) and legal/business formation

Defer incorporation and other company-formation/legal administration. Track it separately from software reliability work; do not treat it as a code remediation.

## 3. Evidence snapshot (available workspace and live site)

Evidence is limited to files visible in the workspace and browser checks made during this session. It is not a substitute for access to Render settings, Git history, authenticated accounts, or the inaccessible Desktop documents.

| Area | Current evidence | Status |
|---|---|---|
| Git branch / Render deploy branch | Workspace at `/Users/admin/Downloads/VersoAIR.tm` has no `.git`; Render dashboard settings were not available. | **Unverified — first gate** |
| Render build command | Checked-in `render.yaml`: `npm ci && npm run build && npm run db:migrate`; starts with `npm start`. | **Confirmed in file; live service mapping unverified** |
| Forced DB push | `package.json` contains `drizzle-kit push --force`; it is not in the checked-in Render build command. | **Confirmed local risk if invoked; deploy pipeline not using it in this file** |
| Production seed | `npm run seed` exists, but is not in the checked-in Render build command. | **Confirmed local script; no automatic seed in this file** |
| Database mapping | `render.yaml` maps `DATABASE_URL` to Render DB `versoair-db`; live `/api/health` returned 200 and reported DB connected. | **Partial — actual live DB identity/overrides unverified** |
| Startup | In `server/index.ts`, email init is asynchronous and recurring jobs start after `listen`; `ensureAllTables()` and `registerRoutes()` are awaited before listening. `index-music.ts` needs separate review. | **Partial** |
| Secret files / history | `.env` and `SUPERADMIN_CREDENTIALS.md` are absent from the visible tree; `.gitignore` excludes `.env` patterns and keeps `.env.example`. No Git history is available. | **Tree status confirmed; rotation/history unverified** |
| Neon driver | No direct `@neondatabase/serverless` dependency or server-source usage found in the prior check; lockfile references are indirect. | **Partially checked; full source/build reference audit needed** |
| Cleanup scripts | `check-transactions.cjs` and `fix-slug-duplicates.mjs` exist; `.js` slug counterpart was absent. | **Presence confirmed; safe deletion/duplication unverified** |
| Ignore rules | Required build/system/data paths are ignored; `.vscode/` is not. Whether any are tracked could not be verified without Git. | **Partial** |
| Dashboard and feature behavior | Source contains notification UI and a conditional video player; authenticated CRUD, live metrics, playback flow, email delivery, and other end-to-end paths were not established. | **Unverified / partial by feature** |
| Translated homepage headings | Local CSS/markup edit now avoids duplicate pseudo-text and allows translation. No commit or live deployment proof is available. | **Local-only, unverified in production** |
| Type/build verification | Editor diagnostics showed no errors for the touched homepage file. `npm run check` could not run because `npm` was unavailable. | **Partial; full check still required** |
| Referenced audit documents | Five files under `/Users/admin/Desktop/files` were denied by sandbox policy. | **Not reviewed; upload to accessible workspace to merge** |

## 4. End-to-end roadmap for everything remaining

This is the recommended work order, not a promise that all work can be completed from the current checkout. Begin with the access gates; then deliver small, reviewable changes with proof on the actual Render deployment branch. Do not bundle risky database, auth, payment, and UI changes into one release.

### Stage 0 — Unlock reliable verification (blocking)

**Work**

1. Open an accessible Git checkout with remote, current branch, and history; establish whether it is the repository/branch configured in Render.
2. In Render, record the web service, deployment branch, last successful deployed commit SHA, build/start commands, health path, linked database, and any environment overrides. Record no secret values.
3. Make the five Desktop source documents available inside the workspace and reconcile any additional findings before implementation.
4. Restore a usable local toolchain and dependency installation so build, type-check, and tests can be run. Current session lacked `npm`.
5. Establish a safe test environment and authorized test accounts for admin, GeoAdmin, business, artist, and regular-user flows. Use synthetic/non-sensitive records.

**Exit gate:** A reviewer can connect the local branch and each PR to the Render deployed SHA; source audit documents are consolidated; required tests can run locally or in CI. If blocked, continue only with read-only changes that do not depend on unavailable secrets/production access.

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

- No source-code remediation, production configuration change, credential access, migration, payment operation, or deletion is authorized by this planning document.
- Stripe/payout implementation and incorporation/legal work remain deferred.
- The inaccessible files are not represented or summarized; merge them only after their contents are made available through an accessible workspace.
