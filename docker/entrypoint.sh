#!/bin/sh
set -e

echo "Running migrations..."
npx prisma migrate deploy

# Seeding is intentionally NOT run here: prisma/seed.ts does a scoped
# deleteMany on shifts/incidents before recreating demo rows, which would
# wipe real client data on every container restart. Seed manually, once,
# via: docker exec <container> npx tsx prisma/seed.ts

# One-time data repair for shifts imported before roster times were zone-aware
# (they read three hours late). Idempotent - it only matches rows the OLD code
# wrote, so after the first boot it finds nothing. Never fails the boot: `|| true`
# plus the script's own catch, because wrong hours are bad and no app is worse.
echo "Checking roster timezone..."
npx tsx scripts/repair-timezone-on-boot.ts || true

echo "Starting app..."
exec node server.js
