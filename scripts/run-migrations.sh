#!/bin/bash
set -euo pipefail

echo "This legacy runner is retired: scripts/migrations contains no SQL migrations." >&2
echo "Review scripts/migrations/README.md and use the approved Drizzle migration procedure." >&2
exit 1
