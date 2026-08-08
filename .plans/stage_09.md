# Stage 09 Plan — Production Readiness and Deployment

## Goal

Prepare Cake & Shape for a reproducible, secure and recoverable first production deployment on an Ubuntu VPS without reopening accepted product/domain/design work from Stages 01-08.

Stage 09 is an infrastructure and launch-readiness stage.

## Current deployment baseline

The repository already has a development-oriented Docker Compose stack for PostgreSQL, API, public Next.js and Vite admin services.

The current baseline is not a production deployment definition:

- PostgreSQL, API, public and admin ports are published directly;
- development fallback credentials such as `change-me` exist in the development compose/example environment;
- the API compose build currently targets the base image;
- public/admin API URLs use localhost-oriented development defaults;
- no production Nginx reverse-proxy configuration exists yet;
- TLS/domain handling is not implemented;
- production backup/restore procedure is not implemented;
- local media persistence needs an explicit production mount and backup policy.

Do not weaken the useful development compose workflow while adding production deployment support.

## Delivery strategy

Prefer additive production infrastructure rather than turning the existing development stack into a mixed development/production file.

Expected direction:

- preserve `docker-compose.yml` for local development/test behavior;
- introduce an explicit production compose/configuration layer, for example `docker-compose.prod.yml` or an equivalent clearly separated deployment definition;
- add actual Nginx configuration under `infra/nginx/`;
- add production environment documentation/example values without committing secrets;
- add operational scripts/docs only when they materially simplify safe deployment, backup or restore.

Exact filenames may adapt to the repository after implementation review.

## Production topology

Target first-launch topology:

```text
Internet
   |
   v
Nginx :80/:443
   |----------------------|
   v                      v
Public Next.js        Admin frontend
   |                      |
   |-----------> FastAPI <|
                  |
                  v
              PostgreSQL
                  |
                  +--> persistent media storage
```

Only Nginx should normally be internet-facing.

PostgreSQL must not be exposed publicly.

API/public/admin service ports should remain internal to the Docker network unless an explicit localhost-only operational reason is documented.

## Nginx and routing

Implement a real reverse-proxy configuration.

The final routing model must be explicit and documented.

At minimum establish:

- public site host/domain routing;
- API routing;
- admin routing;
- static/media routing if required by the accepted media architecture;
- forwarded headers controlled by Nginx;
- request-body limits compatible with accepted media uploads;
- sensible proxy timeouts;
- security-oriented baseline response headers where appropriate;
- HTTP -> HTTPS redirect after certificate provisioning.

Do not blindly trust arbitrary inbound `X-Forwarded-For` or related headers from the public internet.

Nginx must overwrite/set forwarded headers at the trusted proxy boundary.

If the API is updated to trust a proxy-derived client identity for rate limiting, that trust must be narrow and explicitly tied to the production reverse proxy.

## HTTPS and domain

Production launch requires a real domain and HTTPS.

The stage must document and support:

- DNS prerequisites;
- certificate provisioning/renewal strategy, preferably Let's Encrypt/Certbot or another clearly documented mechanism;
- production `PUBLIC_SITE_ORIGIN` / equivalent canonical origin;
- secure session-cookie configuration;
- allowed frontend origins;
- public/admin/API URLs;
- HTTPS redirects.

Do not commit private keys, certificates, credentials or provider tokens.

## Production environment hardening

Create a production environment checklist/example containing names only or safe placeholders.

At minimum resolve:

- `APP_ENV`;
- strong PostgreSQL credentials;
- `DATABASE_URL`;
- `SESSION_HASH_PEPPER`;
- `SESSION_COOKIE_SECURE=true`;
- appropriate SameSite/domain behavior;
- allowed frontend origins;
- public canonical origin;
- public/API/admin URLs;
- optional analytics IDs;
- notification-provider settings if a provider is selected;
- any media/storage paths required by the final deployment.

Production startup must not silently rely on development passwords such as `change-me`.

A production configuration should fail clearly or require explicit values for security-sensitive secrets rather than normalizing unsafe defaults into deployment practice.

## Docker production behavior

Review existing Dockerfiles and use production/runtime targets where available.

Production containers should:

- use production builds;
- avoid installing test-only tooling into runtime images where already supported by the repository;
- restart predictably after VPS reboot;
- expose only required internal ports;
- have health checks where useful;
- use persistent named/bind volumes intentionally;
- preserve migration safety.

Do not run destructive test reset tooling in production.

Never use `docker compose down -v` as an operational instruction.

## Database migrations

Define a deterministic deployment migration procedure.

Required properties:

- migrations run before serving the new application version or through another explicitly safe sequencing mechanism;
- migration failure stops deployment rather than silently starting an incompatible app;
- rollback limitations are documented honestly;
- production database credentials are not embedded in repository files.

Do not auto-run destructive schema reset logic.

## PostgreSQL persistence and backups

Production PostgreSQL must use durable storage.

Implement/document:

- where PostgreSQL data lives;
- backup command/procedure;
- backup destination;
- retention recommendation;
- encrypted/off-host backup recommendation;
- restore command/procedure;
- a restore verification step.

A backup is not considered complete until the restore procedure is documented and tested in a non-production target where practical.

## Media persistence and backups

The accepted application currently uses local media storage.

For first production launch, either:

1. keep local media storage with an explicit durable host/volume mount and backup procedure; or
2. move to object storage only if the existing adapter boundary makes this a contained, justified production change.

Do not introduce a large storage redesign unless required.

If local media remains:

- media must survive container recreation;
- the storage path must not be inside an ephemeral container layer;
- media backup/restore must be documented alongside database backups.

## Notification provider decision

The current notification boundary is development-safe but production delivery is deferred.

During Stage 09 make an explicit launch decision:

- integrate one production notification channel through the existing adapter boundary; or
- formally launch without automatic notification only if the owner accepts that operational limitation and inquiries remain reliably visible in admin.

Do not let notification failure cause accepted inquiries to be lost.

## Rate limiting and proxy identity

The accepted login/inquiry rate limiters are currently single-instance in-memory mechanisms.

For a single API instance, this can remain acceptable for the first launch if documented.

Before trusting proxy client IPs:

- Nginx must be the controlled trusted boundary;
- forwarded headers must be overwritten/set by Nginx;
- API behavior must not trust arbitrary user-supplied forwarded headers.

Do not introduce Redis solely for Stage 09 unless horizontal scaling is actually required.

## Currency launch decision

Stage 08 intentionally did not invent a currency because the repository contract does not currently establish one explicitly.

Before public launch, resolve the customer-facing currency as a product/configuration decision.

If the business operates in rubles, encode that decision explicitly in the appropriate presentation/config contract and show `₽` consistently.

Do not infer currency from locale alone.

This is a small launch-blocking content/configuration decision, not a new commerce subsystem.

## Operational documentation

Stage 09 must produce a concise deployment/runbook covering:

- VPS prerequisites;
- initial clone/setup;
- production environment creation;
- build/start procedure;
- database migration procedure;
- administrator bootstrap procedure only if an existing verified repository command/process is available;
- Nginx/domain/TLS setup;
- health/readiness verification;
- viewing logs;
- restarting services;
- deploying a new revision;
- PostgreSQL backup/restore;
- media backup/restore;
- rollback/recovery guidance;
- common failure checks.

Do not document an administrator-creation command unless it is verified from the actual repository.

## Final runtime smoke

Stage 09 acceptance requires production-like browser/runtime verification, not only static checks.

Verify at minimum:

### Public

- homepage loads over HTTPS;
- responsive header/mobile navigation;
- category filtering;
- dessert detail;
- dessert images/media;
- promotion detail;
- reviews;
- settings-driven about/terms/contacts;
- inquiry validation;
- successful inquiry submission;
- returned public reference;
- unavailable/empty states;
- no obvious horizontal overflow on mobile.

### Admin

- secure login cookie behavior;
- authenticated admin access;
- CSRF-protected mutations;
- catalog editing;
- inquiry visibility/status workflow;
- reviews/promotions/settings access;
- media upload.

### SEO/discoverability

- canonical production origin;
- metadata/OG output;
- `/robots.txt`;
- `/sitemap.xml`;
- dessert JSON-LD;
- noindex behavior for unavailable dessert;
- analytics scripts only when configured.

### Infrastructure

- only intended ports are publicly exposed;
- HTTPS redirect works;
- API health/readiness works through intended routing;
- database survives service/container recreation;
- media survives service/container recreation;
- backup procedure produces an artifact;
- restore procedure is validated in a safe target where practical.

## Automated verification

Run the existing accepted test/build surface relevant to changed infrastructure/code.

At minimum before final acceptance:

- API regression tests if API/proxy identity/runtime configuration code changes;
- public lint/typecheck/build;
- admin lint/typecheck/build where production build/deployment configuration changes;
- Docker production image builds;
- production Compose config validation.

Do not re-run unrelated expensive suites without reason, but do not skip regression tests for code that changed.

## Security invariants

Stage 09 must preserve all accepted security invariants, especially:

- HttpOnly session cookie;
- no tokens in localStorage;
- CSRF on mutating admin endpoints;
- no test-schema reset in production;
- no secrets/customer data in Git;
- no arbitrary forwarded-header trust;
- no public PostgreSQL exposure;
- no `docker compose down -v` operational workflow;
- no production write/deploy action without explicit owner approval.

## Out of scope

Unless required for safe launch, do not add:

- online payments;
- customer accounts;
- delivery integrations;
- warehouse/loyalty/full CRM;
- broad admin redesign;
- arbitrary public feature additions;
- horizontal cluster architecture;
- Kubernetes;
- Redis solely for architectural sophistication;
- major object-storage migration without operational need.

## Branch workflow

Use the accepted repository workflow for implementation:

1. update local `master`;
2. create a dedicated Stage 09 feature branch;
3. Codex implements only the approved Stage 09 slice;
4. push branch to GitHub;
5. GPT reviews actual GitHub diff/files;
6. fixes stay in the same branch;
7. merge only after explicit acceptance.

Because Stage 09 contains multiple infrastructure concerns, it may be split into narrow sub-passes within one feature branch or into explicitly scoped sub-branches if reviewability improves.

## Acceptance criteria

Stage 09 is complete when:

- production deployment configuration is reproducible;
- Nginx reverse proxy is implemented;
- real domain/HTTPS procedure is complete;
- secrets/security-sensitive production values are externalized;
- PostgreSQL and media persistence are intentional;
- backup and restore are documented and validated;
- migration/deployment/update procedures are documented;
- notification launch behavior is explicitly decided;
- customer-facing currency is explicitly resolved;
- production-like public/admin/inquiry/SEO smoke passes;
- production images/builds/config validation pass;
- no accepted Stage 01-08 functionality/security is regressed.

## Expected next phase

After Stage 09 acceptance, the MVP is launch-ready. Further work should move to a controlled post-launch backlog: operational observations, content completion, analytics-driven UX polish, deferred media enhancements, optional notification/storage improvements and explicitly approved new product features.
