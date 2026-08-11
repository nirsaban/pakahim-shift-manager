#!/bin/sh
set -e

echo "Running migrations..."
npx prisma migrate deploy

# Seeding is intentionally NOT run here: prisma/seed.ts does a scoped
# deleteMany on shifts/incidents before recreating demo rows, which would
# wipe real client data on every container restart. Seed manually, once,
# via: docker exec <container> npx tsx prisma/seed.ts

echo "Starting app..."
exec node server.js
