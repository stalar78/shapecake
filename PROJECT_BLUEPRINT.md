# Project Blueprint — Cake & Shape

## Identity

- Owner: stalar78
- Current stage: Stage 09 accepted; production is live
- Repository: `stalar78/shapecake`
- Local path: `C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake`
- Production VPS hostname: `cakeshape-prod`
- Production VPS IPv4: `159.194.228.151`
- Public site: `https://cakeshape.ru`
- Admin site: `https://admin.cakeshape.ru`

## Purpose

A custom public dessert catalog and a purpose-built administration application for daily catalog, content, and customer-request management.

## MVP scope

Included: public storefront, catalog and dessert pages, custom admin, categories, products, variants, media, customer requests, reviews, promotions, site settings, notifications boundary, SEO foundation, final public visual integration, Docker/VPS deployment, HTTPS and production backup operations.

Excluded: online payments, customer accounts, delivery integrations, warehouse accounting, loyalty program, full CRM, mobile applications.

## Production architecture

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

Only Nginx is intentionally internet-facing. PostgreSQL, API, public and admin service ports remain internal to the production Docker network.

Production Compose: `docker-compose.prod.yml`.

Production environment: `/opt/cakeshape/.env.production`, server-local and never committed.

Production persistent volumes:

- `cakeshape_prod_postgres_prod_data`;
- `cakeshape_prod_api_prod_media`.

## Accepted stages

### Stage 01

Foundation: monorepo, Next public shell, Vite admin shell, FastAPI, async SQLAlchemy/Alembic/PostgreSQL, database-backed opaque admin sessions, HttpOnly cookies, CSRF, guarded test database reset, Docker Compose, Makefile and base site settings.

### Stage 02

Catalog: categories, desserts, variants, ordered images/media, publication/availability/archive rules, stable slugs, integer minor-unit prices, safe local media storage, public catalog/detail APIs, authenticated admin CRUD/reorder and shared typed client.

### Stage 03

Inquiry workflow: public submission, explicit consent, normalized contact data, opaque references, duplicate suppression, bounded rate limiting, status transitions/history, internal notes, notification adapter boundary, public form and admin workflow.

### Stage 04

Reviews/promotions: admin-managed reviews, public review filtering, promotions with canonical slugs and UTC-aware scheduling, SQL public eligibility, typed client and functional public/admin surfaces.

### Stage 05

Global content and overview: singleton site settings completed with about-master content, contact URL/email validation, database-backed public business content, authenticated settings editor, SQL-backed admin overview with bounded minimal inquiry data.

### Stage 06

Order-request contract completion: optional selected active dessert variant, immutable server-derived weight snapshot, pickup/delivery fulfillment, recipe/decor preferences, availability-aware order eligibility, extended duplicate fingerprint, public form and admin detail updates. No separate Order domain was introduced.

### Stage 07

SEO/discoverability: validated canonical public origin, native Next.js route metadata, canonical/Open Graph output, robots.txt, fully paginated public sitemap, safe Bakery/Product JSON-LD, existing dessert-media reuse for Open Graph, and optional disabled-by-default GA/Yandex Metrica hooks.

### Stage 08

Public visual integration: customer-approved Lovable editorial patisserie concept integrated into the existing Next.js public application without replacing the production architecture. Real API-backed content and the production inquiry workflow were preserved. Public lint, typecheck and production build passed. Merged in `0d3f851`.

### Stage 09

Production readiness and launch: dedicated production Compose topology, hardened production environment contract, persistent PostgreSQL/media storage, Nginx routing, real production domains, Let's Encrypt TLS, HTTP-to-HTTPS redirects, production health checks, migration sequencing, administrator access, production data restore, production browser/API smoke, Certbot renewal validation, and daily PostgreSQL/media backups with SHA256 manifests.

Production HTTPS baseline commit: `2567c6a` (`feat: enable production HTTPS`).

Stage 09 production launch was accepted on 2026-08-10.

## Production operations

Primary runbook: `docs/PRODUCTION_RUNBOOK.md`.

Production acceptance record: `docs/STAGE_09_ACCEPTANCE.md`.

Mandatory operating sequence for significant deployments:

```text
fresh production backup
-> approved Git revision
-> Compose validation
-> migration/build/recreate
-> container health verification
-> HTTPS/API/browser smoke
-> rollback decision if required
```

Production database/media are authoritative after launch. Never restore the original local/pre-production snapshot over live production data during a normal release.

Never use `docker compose down -v` in production.

## Backups

Current on-host production backup:

- script: `/usr/local/sbin/cakeshape-backup`;
- destination: `/var/backups/cakeshape`;
- contents: PostgreSQL custom-format dump, media archive, SHA256 manifest;
- schedule: daily through `cakeshape-backup.timer` at 02:30 UTC with up to 10 minutes randomized delay;
- on-host retention: 14 days.

The first post-launch infrastructure priority is encrypted off-site backup storage. Current on-host backups protect against deployment/data incidents but do not protect against total VPS loss.

## TLS operations

Certbot manages the production certificate for:

- `cakeshape.ru`;
- `www.cakeshape.ru`;
- `admin.cakeshape.ru`.

The certificate is mounted read-only into the Docker Nginx container. Certbot uses standalone validation with pre/post hooks that stop only the production Nginx container for validation and start that container again afterward. Renewal dry-run passed during launch.

## Security invariants

- Session token is stored only in an HttpOnly cookie; only its hash is persisted.
- No authentication tokens in localStorage.
- Mutating admin endpoints require CSRF protection.
- Test schema reset requires a guarded test database and explicit opt-in.
- Uploaded filenames never control storage paths.
- Public APIs never expose absolute media filesystem paths.
- Public inquiries never expose sequential database identifiers or administrator-only notes.
- Customer contact data and inquiry messages are not logged.
- Client-supplied forwarding headers are not trusted outside the controlled production proxy boundary.
- Site-setting contact URLs reject unsafe schemes at the API boundary.
- Inquiry variant snapshots are server-derived.
- Canonical public URLs are derived from controlled configuration.
- JSON-LD contains only public data and is serialized safely for script embedding.
- Secrets, certificates/private keys and real customer data never enter Git.
- PostgreSQL is not publicly exposed.
- Production data volumes are never removed as a routine operation.
- Production writes/deployments require explicit owner approval.

## Current operational risks / deferred items

- Current automatic backups still live on the production VPS until off-site replication is implemented.
- The in-memory login and inquiry rate limiters are single-instance only; revisit before horizontal API scaling.
- Notification integration remains behind the accepted adapter boundary and may require a dedicated production delivery provider if business operations demand it.
- Promotion/review/global media remain limited by the dessert-oriented media subsystem.
- Alembic has a low-priority `path_separator` deprecation warning.
- Additional monitoring/alerting should be driven by observed production needs rather than architectural speculation.

## Next phase

The MVP is launched. The next phase is controlled post-launch operations rather than a new product stage.

Immediate priority: implement encrypted off-site backups and verify recovery from an off-site copy.

After that, changes should be driven by production observations, owner/client requests, analytics, operational needs and explicitly approved product backlog items.
