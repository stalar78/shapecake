# Production Runbook

This runbook describes the accepted Cake & Shape production deployment and the operating procedure after launch.

## Production Baseline

Production launch was accepted on 2026-08-10. Stage 10 post-launch UX/contact refinements were accepted in production on the same date.

- VPS hostname: `cakeshape-prod`.
- VPS public IPv4: `159.194.228.151`.
- Repository path on VPS: `/opt/cakeshape`.
- Production Compose project: `cakeshape_prod`.
- Production Compose file: `docker-compose.prod.yml`.
- Production environment file: `/opt/cakeshape/.env.production`.
- Public canonical site: `https://cakeshape.ru`.
- Public `www` host: `https://www.cakeshape.ru`, canonical redirect to the apex host.
- Admin site: `https://admin.cakeshape.ru`.
- API health: `https://cakeshape.ru/api/health`.
- Internet-facing service: Docker `nginx` on ports `80` and `443`.
- Internal services: `public`, `admin`, `api`, `postgres`, and one-shot `migrate`.
- PostgreSQL volume: `cakeshape_prod_postgres_prod_data`.
- API media volume: `cakeshape_prod_api_prod_media`.

The production database and media volumes are the source of truth after launch. Never overwrite them from a local/pre-production snapshot during a normal deployment.

Never run `docker compose down -v` in production.

## Security Invariants

- `.env.production` and all production secrets stay outside Git.
- Session cookies remain HttpOnly and production sessions use secure cookies.
- Mutating admin endpoints remain CSRF-protected.
- Authentication tokens are never stored in localStorage.
- An authenticated admin workspace receiving API `401` must clear stale local auth state and return to login; `403` is not treated as session expiry.
- PostgreSQL is not published to the public network.
- Test reset tooling is never used against production.
- Certificates/private keys are not committed to Git.
- Production media and database data are not committed to Git.
- Do not trust arbitrary client-supplied forwarding headers outside the controlled Nginx boundary.
- `admin.cakeshape.ru` responses send `X-Robots-Tag: noindex, nofollow`; the admin interface must remain excluded from search indexing.
- The public `cakeshape.ru` site remains indexable and continues to expose its normal `robots.txt` and sitemap.

## Current Production Topology

```text
Internet
   |
   | 80 / 443
   v
Docker Nginx
   |-------------------------------|
   |               |               |
   v               v               v
Next.js public   Vite admin       FastAPI
                                   |
                                   v
                               PostgreSQL
                                   |
                                   +--> persistent media volume
```

Nginx routes the apex public host to the Next.js service, the admin host to the admin service, and `/api/` traffic to FastAPI. `www.cakeshape.ru` is intentionally a canonical redirect to `https://cakeshape.ru` rather than a second public origin.

## DNS

The following names must resolve to `159.194.228.151`:

```text
cakeshape.ru
www.cakeshape.ru
admin.cakeshape.ru
```

Mail-related MX/TXT/autoconfig/autodiscover records are independent of the website deployment and must not be removed when editing web DNS records.

Useful local verification:

```powershell
Resolve-DnsName cakeshape.ru -Type A
Resolve-DnsName www.cakeshape.ru -Type A
Resolve-DnsName admin.cakeshape.ru -Type A
```

## Canonical Host Behavior

Accepted production redirect behavior:

```text
http://cakeshape.ru/...      -> 301 https://cakeshape.ru/...
http://www.cakeshape.ru/...  -> 301 https://cakeshape.ru/...
https://www.cakeshape.ru/... -> 301 https://cakeshape.ru/...
```

Query strings and paths are preserved by the redirect.

## TLS / Let's Encrypt

The production certificate is managed by Certbot on the VPS.

Certificate name:

```text
cakeshape.ru
```

Certificate paths:

```text
/etc/letsencrypt/live/cakeshape.ru/fullchain.pem
/etc/letsencrypt/live/cakeshape.ru/privkey.pem
```

Covered names:

```text
cakeshape.ru
www.cakeshape.ru
admin.cakeshape.ru
```

The Docker Nginx container mounts `/etc/letsencrypt` read-only and publishes ports `80` and `443`.

Certbot uses the `standalone` authenticator. Because standalone validation needs port 80, renewal hooks temporarily stop only the production Nginx container and then start that same container again.

Hooks:

```text
/usr/local/sbin/cakeshape-certbot-pre
/usr/local/sbin/cakeshape-certbot-post
```

Hook links:

```text
/etc/letsencrypt/renewal-hooks/pre/10-cakeshape-nginx-stop
/etc/letsencrypt/renewal-hooks/post/90-cakeshape-nginx-start
```

Certbot timer checks:

```sh
systemctl is-enabled certbot.timer
systemctl is-active certbot.timer
systemctl list-timers certbot.timer --no-pager
```

Renewal simulation was successfully verified at launch with:

```sh
certbot renew --dry-run
```

A successful dry-run is not a reason to rerun it routinely. Re-test after changing Certbot, Nginx, firewall, DNS, or renewal hooks.

## Health Checks

Production services are expected to show:

- `postgres`: healthy;
- `api`: healthy;
- `public`: healthy;
- `admin`: healthy;
- `migrate`: exited with code 0 after migration;
- `nginx`: running with ports 80/443 published.

Check:

```sh
cd /opt/cakeshape
docker compose -f docker-compose.prod.yml --env-file .env.production ps -a
```

External smoke:

```sh
curl -I https://cakeshape.ru
curl -I https://www.cakeshape.ru/test-path?source=smoke
curl -I https://admin.cakeshape.ru
curl -i https://cakeshape.ru/api/health
curl -I http://cakeshape.ru
```

Expected:

- public apex HTTPS: `200`;
- public `www` HTTPS: `301` to the same path/query on `https://cakeshape.ru`;
- admin HTTPS: `200`;
- API health: `200` with `{"status":"ok"}`;
- apex HTTP: `301` to HTTPS apex.

## Administrator Bootstrap

The repository includes a verified administrator creation command:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api python -m app.auth.create_admin
```

Use interactive password entry. Do not pass passwords in shell history.

Do not create additional production administrators without an explicit operational need.

## Mandatory Pre-Deploy Backup

Before every significant production deployment, create a fresh production backup:

```sh
/usr/local/sbin/cakeshape-backup
```

The production backup script creates one timestamped directory under:

```text
/var/backups/cakeshape/YYYYMMDDTHHMMSSZ/
```

Each backup contains:

```text
postgres.dump
media.tar.gz
SHA256SUMS
```

The database dump is PostgreSQL custom format. The media archive contains the current API media storage. `SHA256SUMS` records integrity hashes for both artifacts.

Verify the newest backup:

```sh
LATEST="$(find /var/backups/cakeshape -mindepth 1 -maxdepth 1 -type d | sort | tail -1)"
echo "$LATEST"
ls -lh "$LATEST"
cat "$LATEST/SHA256SUMS"
```

Never begin a risky migration or data-affecting deployment if the fresh backup did not complete successfully.

## Automatic Daily Backup

A systemd timer runs the same production backup automatically.

Service:

```text
cakeshape-backup.service
```

Timer:

```text
cakeshape-backup.timer
```

Schedule:

```text
02:30 UTC daily, with up to 10 minutes randomized delay
```

Current on-host retention:

```text
14 days
```

Checks:

```sh
systemctl is-enabled cakeshape-backup.timer
systemctl is-active cakeshape-backup.timer
systemctl list-timers cakeshape-backup.timer --no-pager
systemctl status cakeshape-backup.service --no-pager
journalctl -u cakeshape-backup.service -n 50 --no-pager
```

Manual systemd execution test:

```sh
systemctl start cakeshape-backup.service
```

For a successful oneshot service, `inactive (dead)` after completion is normal when the process exited with `status=0/SUCCESS`.

## Off-Site Backup Status

The current automatic backups are stored on the same VPS as production. They protect against accidental database changes, failed deployments, bad migrations, and damaged Docker volumes, but they do not protect against total VPS loss.

Encrypted off-site backup replication has been discussed and is intentionally deferred by owner decision at this time. Do not describe it as already implemented. The absence of an off-site copy is an accepted operational risk until the owner chooses an external storage/provider approach.

VPS/provider snapshots may be used as a supplementary layer but should not be confused with an independent tested backup copy.

## Repository Backup / Restore Utilities

The repository also contains focused PostgreSQL/media backup and restore-verification utilities.

PostgreSQL logical backup:

```sh
infra/ops/backup-postgres.sh
```

PostgreSQL restore verification into a separate database:

```sh
infra/ops/restore-postgres.sh backups/postgres/postgres-YYYYMMDD-HHMMSS.dump
```

Media backup:

```sh
infra/ops/backup-media.sh
```

Media restore verification into a separate Docker volume:

```sh
infra/ops/restore-media.sh backups/media/media-YYYYMMDD-HHMMSS.tar.gz
```

Use restore-verification targets before considering an in-place production restore.

A production restore is an incident-recovery action, not a deployment step.

## Normal Deployment Procedure

Run production commands only on the VPS unless a step explicitly says LOCAL.

### 1. LOCAL — finish and review code first

The intended code workflow remains:

```text
feature branch -> implementation -> review -> acceptance -> merge to master
```

Do not deploy arbitrary local/unreviewed state.

### 2. SERVER — create a production backup

```sh
cd /opt/cakeshape
/usr/local/sbin/cakeshape-backup
```

Confirm that the backup completed before continuing.

### 3. SERVER — verify repository state

```sh
cd /opt/cakeshape
git status --short
git log --oneline -5
```

The production checkout should be clean before pulling.

### 4. SERVER — pull the approved revision

```sh
git pull --ff-only
```

Do not use `git reset --hard` as a routine deployment command.

### 5. SERVER — validate Compose configuration

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production config >/dev/null && echo "COMPOSE OK"
```

Stop if configuration validation fails.

### 6. SERVER — build and apply the production stack

For a normal approved release:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

The production dependency chain requires PostgreSQL health and successful migration before dependent application services become ready.

Use the narrowest safe deployment command for the actual change. Examples for frontend-only releases that do not require API, database, migration or Nginx changes:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --no-deps public
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build --no-deps admin
```

For a narrowly scoped Nginx-only change, validate Nginx configuration before reload/recreate. A narrow recreate can be used instead of rebuilding unrelated application services:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-deps --force-recreate nginx
```

Do not rebuild unrelated services merely for consistency.

### 7. SERVER — verify containers

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production ps -a
```

If a service is unhealthy or exited unexpectedly, inspect logs before proceeding.

### 8. SERVER — smoke test

```sh
curl -I https://cakeshape.ru
curl -I https://www.cakeshape.ru/test-path?source=smoke
curl -I https://admin.cakeshape.ru
curl -i https://cakeshape.ru/api/health
curl -I http://cakeshape.ru
```

### 9. BROWSER — final user smoke

Verify at minimum:

- homepage;
- catalog/filtering;
- several dessert cards/details;
- media/images;
- admin login;
- relevant public/admin surface changed by the release.

For public contact releases, verify the configured contact-card behavior without inventing business contact data:

- external WhatsApp/Telegram/social links open as external links;
- `tel:` remains a semantic telephone link and may be handled by whichever application the user's operating system has registered for the `tel:` scheme;
- `mailto:` remains an email link.

Do not make unnecessary production mutations merely to prove that the site is alive.

## Logs

```sh
cd /opt/cakeshape
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 nginx
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 public
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 admin
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 api
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 postgres
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 migrate
```

## Safe Restarts

Restart one service only when that is sufficient:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production restart api
docker compose -f docker-compose.prod.yml --env-file .env.production restart nginx
```

For Certbot post-renewal, start only the existing Nginx container rather than bringing up the whole dependency chain:

```sh
docker start cakeshape_prod-nginx-1
```

## Rollback Guidance

Application rollback and data rollback are separate decisions.

- A previous reviewed Git revision can be redeployed if application code must be rolled back.
- Preserve logs and evidence before changing revision during an incident.
- Never assume an Alembic downgrade is safe.
- If a migration changed data/schema incompatibly, recovery may require restoring the fresh pre-deploy PostgreSQL backup.
- Media rollback may be independent of database rollback.
- Restore into a verification target first whenever the incident allows time.
- Do not restore a local/pre-production snapshot over production simply to match code history.

## Common Failure Checks

### Public/admin unavailable

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production ps -a
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 nginx
```

### API unavailable

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 api
curl -i https://cakeshape.ru/api/health
```

### Admin unhealthy

The admin health check intentionally uses IPv4 loopback:

```text
http://127.0.0.1/health
```

Do not change it back to `http://localhost/health` without re-validating container name resolution/listening behavior.

### Admin shows authentication-required state after sitting open

The accepted admin behavior on an expired server session is to clear the stale authenticated workspace and return to the login screen with a clear session-expired message. Do not weaken session timeout or bypass CSRF to avoid this flow.

If an operator sees an old/stale admin bundle after a deployment, verify that the `admin` container was rebuilt from the approved revision before changing backend authentication settings.

### TLS problem

```sh
certbot certificates
systemctl status certbot.timer --no-pager
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=200 nginx
```

Check that the certificate paths exist and are readable on the host:

```sh
test -r /etc/letsencrypt/live/cakeshape.ru/fullchain.pem && echo "FULLCHAIN OK"
test -r /etc/letsencrypt/live/cakeshape.ru/privkey.pem && echo "PRIVATE KEY OK"
```

### Disk pressure

```sh
df -h
docker system df
du -sh /var/backups/cakeshape
```

Do not delete Docker volumes to recover disk space without an explicit recovery plan.

## Production Data Rule

After the 2026-08-10 launch, the production database and media are authoritative.

Future releases move code and safe migrations forward. They do not re-import the original local catalog snapshot over live production data.

## Post-Launch Operations Backlog

Current priorities are production stability and client-driven content/configuration updates.

Tracked deferred/operational items:

1. encrypted off-site backup replication — explicitly deferred for now;
2. periodic restore drill from an off-site copy — applicable after an off-site layer exists;
3. ongoing observation of disk usage, certificate renewal and backup timer results;
4. additional monitoring/hardening only when justified by observed production needs.
