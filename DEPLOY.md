# Deploying to production

Runs as three Docker containers (postgres, redis, app) on the shared
miltech.cloud VPS, same pattern as control-room / kursim / Amutot: no
published app ports, reached only through the shared yogev-nginx reverse
proxy over the external `miltech-association-net` Docker network.

The app image is built and pushed to `ghcr.io/nirsaban/takahim-shift-manager`
by `.github/workflows/deploy.yml` on every push to `main` — the VPS only
pulls, it never builds. The image is public, so no registry login is needed
on the VPS to pull it.

## One-time setup (first deploy only)

1. On the VPS: `mkdir -p /opt/takahim && cd /opt/takahim`, then copy
   `docker-compose.prod.yml` there (the deploy workflow does this
   automatically on every run once its secrets are configured — see
   `.github/workflows/deploy.yml`).
2. `cp .env.prod.example .env.prod` and fill in real values — `.env.prod`
   stays on the VPS only, it's gitignored and the pipeline never touches it.
3. Add the server block from `docker/nginx-snippet.conf` to the shared
   nginx config, then reload nginx (`docker exec <nginx-container> nginx -s
   reload` or the project's equivalent).
4. Point DNS for `takahim.miltech.cloud` at the VPS, then obtain a cert
   (certbot) and upgrade the block to HTTPS, matching how the other
   `*.miltech.cloud` subdomains are served.
5. Add the deploy public key (see repo secrets / `README-deploy-key.txt`
   generated alongside this) to `~/.ssh/authorized_keys` for the deploy user
   on the VPS.
6. Pull and start:
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```
7. Seed once, manually — **do not** rely on any automatic seeding:
   ```bash
   docker exec takahim-app npx tsx prisma/seed.ts
   ```
   `prisma/seed.ts` does a scoped `deleteMany` on shifts/incidents before
   recreating demo rows. That's fine on an empty database but destructive
   against real data — never re-run it once the client's actual roster is
   in the system.

## Every deploy after that

Push to `main` and the pipeline (`.github/workflows/deploy.yml`) does it:
builds the image, pushes to GHCR, SSHes into the VPS, pulls, restarts the
`app` container. The container's `entrypoint.sh` runs `prisma migrate
deploy` automatically on every boot — non-interactive, only applies
already-committed migrations, never seeds or resets.

To trigger manually instead of on push, run the "Build & Deploy" workflow
via `workflow_dispatch` in the Actions tab (or `gh workflow run deploy.yml`).

**Backup before any deploy that includes a migration**, once there's real
client data:
```bash
docker exec takahim-db pg_dump -U takahim takahim > backup-$(date +%Y%m%d-%H%M).sql
```

## Known gotchas

- **SMTP cert issue**: `smtp.hostinger.com`'s TLS cert has intermittently
  expired, causing OTP email 500s that are a provider issue, not a code
  bug — don't disable TLS verification to work around it, just retry/check
  the provider.
- **`@node-rs/argon2` requires glibc**, not musl — the Dockerfile uses
  `node:22-slim` (Debian), not Alpine, for this reason. Don't switch the
  base image without re-verifying argon2 loads.
- The dev-only OTP fallback code (`123456`) is disabled automatically in
  this image (`NODE_ENV=production`) — real OTPs must actually be delivered
  by SMTP in production.
- **Docker Hub / GHCR can 503 transiently** on layer pulls — the deploy
  workflow retries the build+push step up to 3 times for this reason.

## Rolling back

Migrations are forward-only (no down migrations — normal for Prisma):
1. Restore from the pre-deploy `pg_dump` backup.
2. `git revert` (or push a previous commit) to `main` — the pipeline
   redeploys the prior image automatically. Or manually on the VPS:
   ```bash
   docker pull ghcr.io/nirsaban/takahim-shift-manager:<previous-sha>
   docker tag ghcr.io/nirsaban/takahim-shift-manager:<previous-sha> ghcr.io/nirsaban/takahim-shift-manager:latest
   docker compose -f docker-compose.prod.yml up -d app
   ```
