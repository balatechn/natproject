#!/bin/sh
set -e

echo "========================================"
echo " NAT Project API — startup"
echo "========================================"

# Run pending migrations (idempotent — safe on every deploy)
echo "→ Applying database migrations…"
./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma
echo "✓ Migrations complete"

echo "→ Starting API on port ${PORT:-3001}…"
exec node dist/main
