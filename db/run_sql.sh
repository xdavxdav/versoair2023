#!/usr/bin/env bash
set -euo pipefail

# db/run_sql.sh
# Usage: ./db/run_sql.sh [path/to/file.sql]
# Sources ../.env if present and uses PGPASSWORD/PGUSER/PGHOST/PGPORT/PGDATABASE.

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  # Export variables from .env
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

SQL_FILE="${1:-$DIR/update_schema.sql}"
if [ ! -f "$SQL_FILE" ]; then
  echo "SQL file not found: $SQL_FILE" >&2
  exit 1
fi

: "${PGPASSWORD:?PGPASSWORD not set in environment or .env}"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-versoair}"
PGDATABASE="${PGDATABASE:-versoair_business_intelligence}"

echo "Running: psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f $SQL_FILE"

# Use psql with ON_ERROR_STOP so failures abort and return non-zero
PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
