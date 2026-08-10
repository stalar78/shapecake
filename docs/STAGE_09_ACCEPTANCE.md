# Stage 09 Acceptance — Production Readiness and Launch

## Status

Accepted.

Production launch date: `2026-08-10`.

Production HTTPS baseline commit:

`2567c6acda80f00d49aa10d3ab2a07d3dedfa7d7` — `feat: enable production HTTPS`

Supporting launch fixes/configuration:

- `1820996816ff47c38a1ebc0d5584a8588cdc0264` — `fix: use IPv4 loopback for admin healthcheck`;
- `d0b70e8fe57662da5c5820836fa9f42ab4eb44ad` — `chore: configure production domains`.

## Accepted production environment

- VPS hostname: `cakeshape-prod`;
- VPS public IPv4: `159.194.228.151`;
- repository checkout: `/opt/cakeshape`;
- production Compose project: `cakeshape_prod`;
- production Compose file: `docker-compose.prod.yml`;
- production environment file: `/opt/cakeshape/.env.production`, server-local and not committed.

Production endpoints:

- `https://cakeshape.ru`;
- `https://www.cakeshape.ru`;
- `https://admin.cakeshape.ru`;
- `https://cakeshape.ru/api/health`.

## Accepted topology

- Nginx is the only intentionally internet-facing application container;
- ports `80` and `443` are published by Nginx;
- public Next.js, admin Nginx/Vite runtime, FastAPI and PostgreSQL remain internal to the Docker network;
- PostgreSQL is not publicly exposed;
- production data is stored in persistent named volumes;
- one-shot Alembic migration service is part of the production dependency chain.

Persistent volumes:

- `cakeshape_prod_postgres_prod_data`;
- `cakeshape_prod_api_prod_media`.

## DNS and HTTPS acceptance

DNS was switched to the production VPS for:

- `cakeshape.ru`;
- `www.cakeshape.ru`;
- `admin.cakeshape.ru`.

Mail-related MX/TXT records were preserved.

Let's Encrypt certificate provisioning succeeded for all three production hostnames.

Certificate paths:

```text
/etc/letsencrypt/live/cakeshape.ru/fullchain.pem
/etc/letsencrypt/live/cakeshape.ru/privkey.pem
```

HTTP -> HTTPS redirect was verified.

Production HTTPS responses were verified:

- public site: `200`;
- admin site: `200`;
- API health: `200` with `{"status":"ok"}`.

## Certbot renewal acceptance

Certbot uses the `standalone` authenticator.

The systemd `certbot.timer` is enabled and active.

Renewal hooks were installed so standalone ACME validation can temporarily use port 80:

- pre-hook stops the production Nginx service;
- post-hook starts only the existing `cakeshape_prod-nginx-1` container.

`certbot renew --dry-run` completed successfully during launch.

## Production data acceptance

The intended catalog database and media snapshot were restored before public launch.

Production migration state was verified against the current Alembic head before launch.

After launch, production PostgreSQL and media are authoritative. The original local/pre-production backup must never be reapplied over live production as part of a normal deployment.

## Health acceptance

The following runtime state was verified during launch:

- PostgreSQL healthy;
- API healthy;
- public Next.js healthy;
- admin healthy;
- migration service exited successfully;
- Nginx running on ports 80/443.

The admin health-check correction to `http://127.0.0.1/health` was verified in the actual production container after `localhost` failed to connect in that container environment.

## Browser / application acceptance

The production public and admin URLs were opened successfully after DNS/TLS cutover.

Administrator login over HTTPS succeeded.

Public routes and media were manually checked and reported working.

A deliberate production mutation was not introduced solely for launch smoke testing; existing application/domain mutation behavior had already been covered by the accepted development/integration stages, while launch verification focused on the production transport/runtime/authentication boundary.

## Backup acceptance

A production backup script is installed at:

```text
/usr/local/sbin/cakeshape-backup
```

Backup destination:

```text
/var/backups/cakeshape
```

Each timestamped backup contains:

- `postgres.dump`;
- `media.tar.gz`;
- `SHA256SUMS`.

The first manual production backup completed successfully and produced a PostgreSQL custom-format dump and media archive with SHA256 hashes.

The same backup was also executed successfully through systemd with `status=0/SUCCESS`.

Automatic backup units:

- `cakeshape-backup.service`;
- `cakeshape-backup.timer`.

Schedule:

- daily at `02:30 UTC`;
- up to 10 minutes randomized delay;
- persistent timer behavior;
- current on-host retention: 14 days.

## Remaining post-launch infrastructure priority

Current automatic backups are still stored on the production VPS.

This is sufficient for deployment/migration/data-error recovery but not for complete VPS loss.

The first post-launch infrastructure task is therefore:

**implement encrypted off-site backup replication and verify recovery from an off-site copy.**

This is tracked as post-launch operational hardening rather than a reason to reopen the accepted product stages.

## Security invariants preserved

- HttpOnly sessions preserved;
- secure production session cookies preserved;
- CSRF requirements preserved;
- no auth tokens moved to localStorage;
- no secrets committed to Git;
- no certificates/private keys committed to Git;
- PostgreSQL remains private;
- no destructive test reset tooling used in production;
- no public production deployment workflow uses `docker compose down -v`;
- production volumes are not removed during routine operations.

## Operational decision

Normal future production deployments must follow:

```text
fresh production backup
-> approved Git revision
-> Compose validation
-> migration/build/recreate
-> container health verification
-> HTTPS/API/browser smoke
-> rollback decision if required
```

Application rollback and database/media rollback remain separate decisions.

## Decision

Stage 09 is accepted.

The Cake & Shape MVP is live in production. Further work moves to controlled post-launch operations, beginning with off-site backup protection, followed by recovery drills and production-driven maintenance/product backlog work.
