# Production Runbook

This runbook is for the accepted Stage 09 production Compose topology. It does not provision TLS, DNS, VPS infrastructure, or production secrets.

## Baseline

- Edge: `nginx` publishes port `80`.
- Internal services: `public`, `admin`, `api`, `postgres`, and one-shot `migrate`.
- PostgreSQL data volume: `postgres_prod_data`.
- API media volume: `api_prod_media`.
- Production Compose file: `docker-compose.prod.yml`.
- Production environment file: `.env.production`, created from `.env.production.example`.

Never remove production Docker volumes as part of routine production operations.

## Initial Setup

1. Prepare an Ubuntu host with Docker Engine and the Docker Compose plugin.
2. Clone the reviewed repository revision.
3. Create `.env.production` from `.env.production.example`.
4. Generate strong values for `POSTGRES_PASSWORD`, `SESSION_HASH_PEPPER`, and any other required secrets. Do not commit `.env.production`.
5. Set the public origins for the actual deployment:
   - `PUBLIC_SITE_ORIGIN`
   - `NEXT_PUBLIC_SITE_ORIGIN`
   - `PUBLIC_MEDIA_ORIGIN`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `VITE_ADMIN_API_BASE_URL`
6. Validate configuration:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

7. Build images:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

8. Run migrations through the one-shot service:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate
```

9. Start services:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres api public admin nginx
```

10. Verify health and logs:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 api
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 nginx
```

## Administrator Bootstrap

The repository includes a verified administrator creation command:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api python -m app.auth.create_admin
```

Use the interactive prompts or pass `--email` only. Avoid passing passwords in shell history.

## Normal Update Procedure

1. Fetch the approved deployment revision.
2. Inspect the working tree and revision before changing services:

```sh
git status --short
git log --oneline -5
```

3. Build changed images:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

4. Run the migration service:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate
```

5. Recreate application services in a controlled way:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d api public admin nginx
```

6. Verify:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 api
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 public
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 admin
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=100 nginx
```

Do not deploy arbitrary unreviewed branch state. Do not use `git reset --hard` as a normal update step; reserve it for deliberate recovery after preserving evidence and local changes.

## PostgreSQL Backup

Create a logical custom-format backup without stopping PostgreSQL:

```sh
infra/ops/backup-postgres.sh
```

Default output:

```text
backups/postgres/postgres-YYYYMMDD-HHMMSS.dump
```

The script reads Compose/environment configuration from `docker-compose.prod.yml` and `.env.production` by default. It does not print database passwords and does not modify the database.

Recommended retention for launch:

- daily database backups;
- keep 7 daily backups;
- keep 4 weekly backups;
- copy encrypted backups off the VPS.

VPS snapshots are useful as a secondary layer, but a VPS snapshot alone is not a sufficient application backup strategy.

## PostgreSQL Restore Verification

Verify a backup by restoring it into a separate database, not over production:

```sh
infra/ops/restore-postgres.sh backups/postgres/postgres-YYYYMMDD-HHMMSS.dump
```

By default the script creates a database named like:

```text
<production_db>_restore_verify_YYYYMMDD_HHMMSS
```

It validates the archive, restores it, queries the restored database, and prints the Alembic version. If you choose an existing target database, replacement requires:

```sh
ALLOW_REPLACE_TARGET_DB=yes TARGET_DB=my_restore_check infra/ops/restore-postgres.sh backups/postgres/postgres-YYYYMMDD-HHMMSS.dump
```

In-place production restore is deliberately blocked unless both are true:

```sh
TARGET_DB=<production_db> ALLOW_PRODUCTION_RESTORE=yes ALLOW_REPLACE_TARGET_DB=yes infra/ops/restore-postgres.sh backups/postgres/postgres-YYYYMMDD-HHMMSS.dump
```

Only use in-place restore during a deliberate incident recovery. Do not use test reset tooling for production restore.

## Media Backup

Create a tar archive of the API media volume:

```sh
infra/ops/backup-media.sh
```

Default output:

```text
backups/media/media-YYYYMMDD-HHMMSS.tar.gz
```

The script reads the `api_prod_media` Docker volume through a temporary container and does not stop the stack.

## Media Restore Verification

Verify a media archive into a separate Docker volume:

```sh
infra/ops/restore-media.sh backups/media/media-YYYYMMDD-HHMMSS.tar.gz
```

The script validates archive paths and rejects absolute paths or `..` traversal. By default it restores into:

```text
<compose_project>_media_restore_verify
```

To deliberately replace production media contents:

```sh
ALLOW_MEDIA_REPLACE=yes infra/ops/restore-media.sh backups/media/media-YYYYMMDD-HHMMSS.tar.gz
```

Replacement clears only the target media volume before extracting the archive. It does not remove Docker volumes.

## Rollback

Application rollback and database rollback are separate decisions.

- A previous reviewed Git revision or image can be redeployed.
- Alembic downgrade should not be assumed safe.
- If a migration is not backward-compatible, recovery may require restoring a PostgreSQL backup.
- A production database restore must be deliberate and should be rehearsed through restore verification first.

## Operations Commands

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 nginx
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 public
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 admin
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 api
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 postgres
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 migrate
docker compose --env-file .env.production -f docker-compose.prod.yml restart api
docker compose --env-file .env.production -f docker-compose.prod.yml restart nginx
docker system df
docker volume ls
```

## Launch Blockers And Next Pass Decisions

- TLS is not provisioned yet. A later pass must configure HTTPS certificates and port `443`.
- DNS must point the public and admin domains at the VPS before launch.
- Production notification provider remains a launch decision.
- Currency remains a separate launch decision.
- Off-host encrypted backup storage must be selected and operated outside this repository.
