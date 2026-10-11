# Database Migrations

This directory contains SQL migrations that manage database schema and data changes.

## Before Any Production Migration: Refresh the Neon Snapshot

Neon's free plan keeps only a **6-hour** restore history and allows **one** snapshot per project. Before running a migration or other risky change against production:

1. Neon console → project `blue-grass-85533510` → branch `production` → **Backup & Restore**.
2. Delete the existing manual snapshot (it is stale and the free plan cannot hold two).
3. Click **Create snapshot** and confirm it appears with the current timestamp.
4. Only then run the migration.

Optional off-Neon copy: `pg_dump "$DATABASE_URL" -Fc -f backup.dump` (store privately, never in the repo).

> **Better solution (do this once you have real users): upgrade the Neon plan.**
> This manual routine is a stopgap that depends on someone remembering it. A paid plan replaces it with:
> - a longer point-in-time restore window (days instead of 6 hours), so a mistake noticed tomorrow is still recoverable;
> - more than one snapshot, so you never have to delete your only backup first;
> - **scheduled automatic snapshots**, so backups no longer rely on memory.
>
> With real user data, losing even a day is costly, so upgrade before launch rather than after the first incident. Once upgraded, remove this section and the reminder comments in `run-migrations.sh` and `deploy-production.sh`.

## How It Works

Migrations run **automatically** on Render deployment and can be run **manually** locally.

### File Naming Convention

Migrations are numbered sequentially:

```
001_initialize_countries.sql
002_seed_sample_businesses.sql
003_add_indexes.sql  (future)
```

Numbers ensure migrations run in correct order.

### Running Migrations Locally

**Option 1: Using the migration runner**

```bash
./scripts/run-migrations.sh
```

**Option 2: Run a single migration**

```bash
psql $DATABASE_URL -f scripts/migrations/001_initialize_countries.sql
```

**Option 3: Run all migrations at once**

```bash
psql $DATABASE_URL -f scripts/migrations/*.sql
```

### On Render (Automatic)

Migrations will auto-run during deployment. See `.render/build.sh` for build hook.

## Current Migrations

| Migration                        | Purpose                                        | Status    |
| -------------------------------- | ---------------------------------------------- | --------- |
| `001_initialize_countries.sql`   | Add all 35 supported countries                 | ✅ Active |
| `002_seed_sample_businesses.sql` | Populate sample businesses across 10 countries | ✅ Active |

## Adding New Migrations

1. Create a new file with next number:

   ```bash
   touch scripts/migrations/003_your_migration_name.sql
   ```

2. Write your SQL:

   ```sql
   -- Migration 003: Your description
   -- Purpose: What does this do
   -- Date: YYYY-MM-DD

   -- Your SQL here
   INSERT INTO ...

   -- Verify
   SELECT 'Migration 003 complete' as status;
   ```

3. Test locally:

   ```bash
   psql $DATABASE_URL -f scripts/migrations/003_your_migration_name.sql
   ```

4. Commit and push to trigger Render deployment

## Key Rules

✅ **DO:**

- Write **idempotent** SQL (use `ON CONFLICT DO NOTHING`, `IF NOT EXISTS`, etc.)
- Test locally before pushing
- Include comments explaining what the migration does
- Verify migration with a final SELECT statement

❌ **DON'T:**

- Delete or rename existing migration files
- Run migrations out of order
- Make migrations dependent on external tools/APIs

## Rollback

To rollback a migration:

1. Create a reverse migration (e.g., `003_undo_previous_change.sql`)
2. Run the new migration
3. Push to git

Migrations are **append-only** — once deployed, they stay in history.

## For Render Auto-Run

The Render build process checks for and runs migrations automatically. Ensure your `.render/build.sh` or startup script includes:

```bash
if [ -f ./scripts/run-migrations.sh ]; then
  ./scripts/run-migrations.sh
fi
```
