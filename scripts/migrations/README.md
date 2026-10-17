# Database migration status

This directory is not the active migration source. It currently contains no
SQL migration files; `scripts/run-migrations.sh` is retained only as a
fail-fast compatibility stub.

## Current schema paths

- Drizzle schema definitions are in `shared/schema.ts`.
- Drizzle migration files and their journal are in the repository-root
  `migrations/` directory.
- `npm run db:migrate` invokes `drizzle-kit migrate` using `drizzle.config.ts`.
- The server also runs `ensureAllTables()` during startup. That function
  creates and alters schema objects at runtime; it is not a substitute for a
  reviewed, versioned migration process and can leave partial changes if a
  later operation fails.
- `0003_auth_and_inbox_schema.sql` is an additive repair for users-table
  columns used by registration and for the inbox conversation/message tables
  and indexes. Startup schema repair includes the same missing user columns
  and inbox tables so a reviewed deployment can recover without running the
  migration manually. Verify the live schema before release; do not assume a
  migration ran solely because the service restarted.
- `0004_geo_admin_invitations.sql` creates the one-use, expiring invitations
  used for superuser-managed Geo Admin staff access.

The Render dashboard was verified to deploy the Dockerfile, whose build and
start steps do not run `npm run db:migrate`. The repository's `render.yaml` is
not evidence that it is the active Render configuration. Do not assume a
migration runs automatically during deployment.

## Before a production schema change

Do not run a migration against production until the database owner has
approved the target and release procedure. At minimum:

1. Identify the authoritative production provider, project, branch, and
   database through the provider dashboard without copying connection secrets
   into logs or documentation.
2. Test the exact migration against an isolated branch and representative
   data. Review every statement, especially data updates in the existing
   Drizzle migrations.
3. Confirm a current backup or point-in-time recovery window and that the
   owner knows how to restore it. Do not delete the only existing snapshot
   merely to make room for another without an approved recovery plan.
4. Use one serialized migration executor with an appropriately direct
   database connection. Do not run migrations from every web instance.
5. Record the approved migration, target, result, and recovery decision. Then
   verify application health and the changed schema/data.

`npm run db:migrate` is a manual operation and must be run only after those
checks. Never use `db:push` or a wildcard `psql` command as a production
migration procedure.
