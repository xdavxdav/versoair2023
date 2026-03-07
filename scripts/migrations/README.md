# Database Migrations

This directory contains SQL migrations that manage database schema and data changes.

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
