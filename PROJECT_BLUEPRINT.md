# Project Blueprint — Cake & Shape

## Identity

- Owner: stalar78
- Current stage: Stage 10 accepted; production is live
- Repository: `stalar78/shapecake`
- Local path: `C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake`
- Production VPS hostname: `cakeshape-prod`
- Production VPS IPv4: `159.194.228.151`
- Public canonical site: `https://cakeshape.ru`
- Public `www` host: canonical redirect to `https://cakeshape.ru`
- Admin site: `https://admin.cakeshape.ru`

## Purpose

A custom public dessert catalog and a purpose-built administration application for daily catalog/content management. The current public ordering UX is privacy-minimized: visitors browse the catalog and contact the owner directly through configured business channels rather than submitting an on-site inquiry form.

## MVP scope

Included: public storefront, catalog and dessert pages, custom admin, categories, products, variants, media, reviews, promotions, site settings, direct-contact ordering UX, retained inquiry/order-request backend and admin domain for possible future reuse, SEO foundation, final public visual integration, Docker/VPS deployment, HTTPS and production backup operations.

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

Stage 10 later removed only the public inquiry form/entry flow. The backend, database history and admin inquiry workflow remain retained and dormant from the public site.

### Stage 04

Reviews/promotions: admin-managed reviews, public review filtering, promotions with canonical slugs and UTC-aware scheduling, SQL public eligibility, typed client and functional public/admin surfaces.

### Stage 05

Global content and overview: singleton site settings completed with about-master content, contact URL/email validation, database-backed public business content, authenticated settings editor, SQL-backed admin overview with bounded minimal inquiry data.

### Stage 06

Order-request contract completion: optional selected active dessert variant, immutable server-derived weight snapshot, pickup/delivery fulfillment, recipe/decor preferences, availability-aware order eligibility, extended duplicate fingerprint, public form and admin detail updates. No separate Order domain was introduced.

### Stage 07

SEO/discoverability: validated canonical public origin, native Next.js route metadata, canonical/Open Graph output, robots.txt, fully paginated public sitemap, safe Bakery/Product JSON-LD, existing dessert-media reuse for Open Graph, and optional disabled-by-default GA/Yandex Metrica hooks.

### Stage 08

Public visual integration: customer-approved Lovable editorial patisserie concept integrated into the existing Next.js public application without replacing the production architecture. Real API-backed content and the then-current production inquiry workflow were preserved. Public lint, typecheck and production build passed. Merged in `0d3f851`.

### Stage 09

Production readiness and launch: dedicated production Compose topology, hardened production environment contract, persistent PostgreSQL/media storage, Nginx routing, real production domains, Let's Encrypt TLS, HTTP-to-HTTPS redirects, production health checks, migration sequencing, administrator access, production data restore, production browser/API smoke, Certbot renewal validation, and daily PostgreSQL/media backups with SHA256 manifests.

Production HTTPS baseline commit: `2567c6a` (`feat: enable production HTTPS`).

Stage 09 production launch was accepted on 2026-08-10.

### Stage 10

Post-launch UX/privacy minimization and contact polish:

- public inquiry form removed from homepage and dessert detail pages;
- public ordering flow now uses direct configured contacts only;
- inquiry backend/admin/history retained intentionally without schema rollback or destructive migration;
- branded favicon, 404 page and runtime error surface;
- clickable footer phone/email and canonical `www` -> apex redirect;
- expired admin sessions now clear stale UI on API `401` while preserving HttpOnly cookies, CSRF and existing timeout values;
- Telegram admin input accepts `@username` and normalizes it before strict backend validation;
- Site Settings Craft/About media previews constrained without changing catalog image-card behavior;
- shared restrained contact icon language for direct-order CTA and footer;
- external messenger/social links open in a new tab; phone/email keep semantic `tel:`/`mailto:` behavior;
- `social_url` automatically presents as Instagram when the configured hostname is `instagram.com`;
- production acceptance completed on 2026-08-10.

Key Stage 10 merge commits:

- `c2db8e6` — replace public inquiry with direct contact;
- `405a0f4` — branded favicon;
- `7c16558` — branded public error pages;
- `7ecce75` — public contact/footer polish and canonical host;
- `3b3a871` — admin settings/session operational UX;
- `2caf9ea` — premium public contact presentation.

## Production operations

Primary runbook: `docs/PRODUCTION_RUNBOOK.md`.

Production acceptance records:

- `docs/STAGE_09_ACCEPTANCE.md`;
- `docs/STAGE_10_ACCEPTANCE.md`.

Mandatory operating sequence for significant deployments:

```text
fresh production backup
-> approved Git revision
-> Compose validation
-> narrowest safe migration/build/recreate
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

Encrypted off-site replication is not currently implemented. The owner explicitly deferred adding a separate object-storage backup layer at this time. This is an accepted operational risk: on-host backups protect against application/deployment/data incidents but not against total VPS loss.

## TLS operations

Certbot manages the production certificate for:

- `cakeshape.ru`;
- `www.cakeshape.ru`;
- `admin.cakeshape.ru`.

The certificate is mounted read-only into the Docker Nginx container. Certbot uses standalone validation with pre/post hooks that stop only the production Nginx container for validation and start that container again afterward. Renewal dry-run passed during launch.

Canonical host behavior is intentional:

- HTTP apex -> HTTPS apex;
- HTTP `www` -> HTTPS apex;
- HTTPS `www` -> HTTPS apex;
- admin HTTP -> admin HTTPS.

## Security invariants

- Session token is stored only in an HttpOnly cookie; only its hash is persisted.
- No authentication tokens in localStorage.
- Mutating admin endpoints require CSRF protection.
- Admin API `401` in an authenticated workspace clears stale local authenticated state and returns to login; `403` is not treated as session expiry.
- Test schema reset requires a guarded test database and explicit opt-in.
- Uploaded filenames never control storage paths.
- Public APIs never expose absolute media filesystem paths.
- Public inquiry routes do not expose sequential database identifiers or administrator-only notes.
- Customer contact data and inquiry messages are not logged by application logic.
- Client-supplied forwarding headers are not trusted outside the controlled production proxy boundary.
- Site-setting contact URLs reject unsafe schemes at the API boundary.
- Telegram `@username` normalization is admin-UI convenience only; backend URL validation remains strict.
- Inquiry variant snapshots are server-derived.
- Canonical public URLs are derived from controlled configuration.
- JSON-LD contains only public data and is serialized safely for script embedding.
- Secrets, certificates/private keys and real customer data never enter Git.
- PostgreSQL is not publicly exposed.
- Production data volumes are never removed as a routine operation.
- Production writes/deployments require explicit owner approval.

## Current operational risks / deferred items

- Automatic backups remain only on the production VPS; off-site replication is deferred and total VPS loss remains an accepted risk.
- The in-memory login and inquiry rate limiters are single-instance only; revisit before horizontal API scaling.
- Notification integration remains behind the retained inquiry adapter boundary and is dormant from the current public direct-contact flow.
- Promotion/review/global media remain limited by the dessert-oriented media subsystem.
- Original uploaded media are stored without a normalization/resizing pipeline; admin preview sizing is only a UI concern.
- Alembic has a low-priority `path_separator` deprecation warning.
- Additional monitoring/alerting should be driven by observed production needs rather than architectural speculation.
- Removing the public inquiry form minimizes public PII collection but does not imply that all personal-data obligations disappear; infrastructure/access logs and future integrations still require normal operational care.

## Next phase

Stage 10 is accepted. The project remains in controlled post-launch operations.

Near-term work should be driven by real client content/configuration needs and observed production behavior. The client can manage actual phone/email/messenger/social values through Site Settings; the application should not hardcode or invent those values.

Off-site backup replication remains a deferred hardening item rather than the active next stage. Revisit it when the owner chooses an external storage/provider approach.
