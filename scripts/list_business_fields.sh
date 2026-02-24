#!/usr/bin/env bash
# Usage: ./scripts/list_business_fields.sh
# Expects a local .env at repo root with PG credentials (PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE)
set -euo pipefail
# load .env if present
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . .env
  set +a
fi
: "${PGUSER:?}"
: "${PGPASSWORD:?}"
: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGDATABASE:?}"

echo "== Distinct business_type =="
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT DISTINCT business_type FROM businesses WHERE business_type IS NOT NULL ORDER BY business_type;"

echo "== Distinct category_id in businesses =="
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT DISTINCT category_id FROM businesses WHERE category_id IS NOT NULL ORDER BY category_id;"

echo "== Distinct category names (join categories) =="
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT DISTINCT c.id, c.name FROM businesses b JOIN categories c ON b.category_id = c.id ORDER BY c.name;"
