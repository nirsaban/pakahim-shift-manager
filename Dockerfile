# syntax=docker/dockerfile:1

FROM node:22-slim AS base
# Debian glibc, not Alpine musl — @node-rs/argon2's prebuilt native binding
# doesn't load reliably under musl; glibc is the well-supported target
# (same lesson learned in GeniriFlow-Brain/control-room).
RUN apt-get update && apt-get install -y --no-install-recommends openssl wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# prisma.config.ts eagerly resolves DATABASE_URL to load, even for `generate`
# (which never actually connects to a DB) — this placeholder just satisfies
# that check during the build; the real URL comes from .env.prod at runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Full node_modules (not just standalone's auto-traced subset) so the prisma
# CLI is available for `prisma migrate deploy` at startup and for manual
# `docker exec` commands (e.g. one-off seeding) after a deploy.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# schema.prisma has no datasource url — Prisma 7 keeps that in prisma.config.ts,
# which `prisma migrate deploy` needs at runtime to find DATABASE_URL.
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
# Operational scripts run via `docker exec` on the server: seeding reference
# data, bootstrapping a clean database, sending a test push. Without these the
# container can serve traffic but cannot be administered.
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
# lib/ and tsconfig are needed because those scripts import the app's services
# and rely on the `@/` path alias; the standalone bundle only contains the
# traced server build, not the source tree.
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
