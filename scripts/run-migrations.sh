#!/bin/bash
# Database Migration Runner
# Usage: ./scripts/run-migrations.sh
# This script runs all SQL migrations in sequential order

set -e  # Exit on error

DB_URL="${DATABASE_URL:-}"

if [ -z "$DB_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable not set"
  exit 1
fi

MIGRATIONS_DIR="scripts/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Error: Migrations directory not found at $MIGRATIONS_DIR"
  exit 1
fi

echo "🔄 Running database migrations..."
echo "📁 Migrations directory: $MIGRATIONS_DIR"
echo ""

# Find all .sql files, sort by filename (001_, 002_, etc), and run them
for migration in $(find "$MIGRATIONS_DIR" -name "*.sql" | sort); do
  echo "▶️  Running migration: $(basename "$migration")"
  psql "$DB_URL" -f "$migration"
  echo "✅ Completed: $(basename "$migration")"
  echo ""
done

echo "🎉 All migrations completed successfully!"
