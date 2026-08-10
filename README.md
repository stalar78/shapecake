# Cake & Shape

Custom production website and administration application for a small dessert business.

## Current stage

Stages 01-10 are accepted. The MVP is live in production and the project is in controlled post-launch operations.

Production endpoints:

- public canonical host: `https://cakeshape.ru`;
- `https://www.cakeshape.ru` redirects canonically to `https://cakeshape.ru`;
- admin: `https://admin.cakeshape.ru`;
- API health: `https://cakeshape.ru/api/health`.

Stage 10 converted the public ordering UX from an on-site personal-data inquiry form to direct contact through configured business channels. The accepted inquiry backend/admin subsystem remains in the codebase but is dormant from the public website.

Off-site backup replication is currently deferred by owner decision. Daily PostgreSQL/media backups remain on the production VPS with 14-day retention; total VPS loss therefore remains an explicitly accepted operational risk until an off-site layer is added.

## Approved MVP

- public responsive website;
- dynamic dessert catalog and detail pages;
- direct-contact ordering flow using configured phone/email/messenger/social settings;
- custom administration application;
- dessert, category, price variant, review, promotion and site-settings management;
- retained inquiry/order-request backend and admin workflow for possible future reuse;
- secure media uploads;
- PostgreSQL-backed FastAPI API;
- Next.js public frontend;
- Vite React admin frontend;
- production Docker Compose deployment behind Nginx and HTTPS.

Online payments, customer accounts, delivery integrations, warehouse accounting, loyalty features and a full CRM are outside the MVP.

## Stage 01 foundation

- npm-workspace monorepo;
- Next.js public shell;
- Vite/React admin shell;
- FastAPI modular monolith;
- async SQLAlchemy and Alembic;
- PostgreSQL-backed opaque sessions;
- HttpOnly cookies and CSRF protection;
- singleton site settings;
- guarded PostgreSQL integration and migration tests;
- separate production and test API images;
- explicit opt-in for destructive test schema reset;
- Docker Compose and Makefile interfaces;
- successful live health, readiness, site-settings, migration, administrator creation, and full test-suite checks.

## Stage 02 catalog domain

- categories with visibility, ordering and archive rules;
- desserts with publication, availability, fixed MVP flags and stable slugs;
- ordered weight and price variants using integer minor currency units;
- ordered dessert images with one active primary image;
- safe local media storage with server-generated keys and signature validation;
- public category, catalog and dessert-detail APIs;
- authenticated and CSRF-protected catalog administration;
- typed shared API client;
- functional public catalog/detail pages and minimal admin catalog workflows;
- PostgreSQL migration, integration, media-security and runtime verification.

## Stage 03 customer inquiry workflow

- public inquiry submission with explicit personal-data consent;
- validated phone/email contact data and preferred contact channel;
- optional public dessert reference, requested date and quantity;
- opaque public references with no public inquiry enumeration;
- duplicate suppression and bounded in-memory public throttling;
- explicit lifecycle status transitions with compact status history;
- administrator-only internal notes and authenticated workflow;
- notification adapter boundary whose failure cannot lose accepted inquiries;
- shared typed API client, public inquiry form and admin inquiry interface;
- Stage 03 PostgreSQL migration, comprehensive integration tests, Docker builds and live runtime verification.

Stage 10 superseded only the public inquiry UX: the public form was removed, while the Stage 03 backend/admin domain remains retained and dormant for possible future reuse.

## Stage 04 reviews and promotions

- administrator-managed reviews with rating, optional dessert relation, publication, featured state, ordering and archive workflow;
- public review filtering with SQL-correct eligibility and deterministic pagination;
- administrator-managed promotions with canonical slugs, optional dessert relation and UTC-aware scheduling;
- public promotion list/detail surfaces that exclude draft, archived, future and expired promotions in SQL;
- authenticated and CSRF-protected review/promotion administration;
- shared typed API client plus functional public/admin interfaces;
- Stage 04 PostgreSQL migration, comprehensive integration tests, production Docker builds and live runtime verification.

## Stage 05 site content and operational overview

- singleton site settings extended only with focused about-master content;
- public business content for hero, contacts, ordering, delivery, pickup, prepayment, working hours and about-master is database-backed;
- optional contact email and social/messenger URLs have controlled API-boundary validation;
- authenticated, CSRF-protected site-settings administration is exposed in the existing admin app;
- compact authenticated operational overview uses SQL counts and bounded recent-query lists;
- overview exposes published/draft dessert counts, new inquiry count, recent inquiries and currently active promotions without unnecessary customer PII;
- typed API client remains the integration boundary for both frontends;
- Stage 05 migration and PostgreSQL regression coverage are accepted.

## Stage 06 order-request contract completion

- existing inquiry domain extended without creating a separate order/checkout subsystem;
- optional active dessert variant selection with server-derived immutable weight snapshot;
- explicit pickup/delivery fulfillment method;
- focused recipe and decor preferences;
- public inquiry dessert eligibility now includes dessert availability and variant availability;
- duplicate fingerprint includes the new order-request fields;
- public acknowledgement remains minimal and non-enumerable;
- admin inquiry detail and public form expose the new fields through the typed API client;
- Stage 06 migration and PostgreSQL regression coverage are accepted.

## Stage 07 SEO and public discoverability

- one validated public origin drives metadata, canonical URLs, Open Graph and sitemap URLs;
- native Next.js metadata is used for the public root and detail routes;
- robots.txt and paginated sitemap.xml are generated intentionally;
- sitemap includes only available public desserts and active public promotions exposed by the accepted public APIs;
- Bakery and Product JSON-LD use only existing public business/catalog data;
- dessert Open Graph reuses existing public media when available;
- Google Analytics and Yandex Metrica hooks emit no scripts without valid explicit configuration;
- public lint, typecheck and production build are accepted.

## Stage 08 public visual integration

- the customer-approved Lovable concept was integrated into the existing Next.js public application rather than replacing its architecture;
- the public visual system uses a warm editorial patisserie direction with Cormorant Garamond and Manrope, restrained radii, image-led cards, editorial spacing and accessible focus states;
- reusable public header, footer and dessert-card components were introduced;
- homepage, dessert detail, promotion detail and inquiry presentation were redesigned around real API-backed data only;
- customer-facing copy was cleaned of implementation/developer language and no Lovable mock business facts were imported;
- the real inquiry API flow, validation, variant availability filtering, rate/duplicate error handling and public-reference success state were preserved at that stage;
- Stage 07 metadata, canonical URLs, Open Graph, JSON-LD, analytics, robots and sitemap behavior remain intact;
- public lint, typecheck and production build passed before acceptance;
- merge commit: `0d3f851`.

## Stage 09 production readiness and launch

- dedicated `docker-compose.prod.yml` production topology with persistent PostgreSQL and media volumes;
- production-only environment configuration with secrets kept outside Git;
- Nginx reverse proxy for public, admin and API traffic;
- real production domains `cakeshape.ru`, `www.cakeshape.ru` and `admin.cakeshape.ru`;
- HTTPS on ports 80/443 with HTTP -> HTTPS redirects;
- Let's Encrypt certificate provisioning and automatic Certbot renewal with tested standalone renewal hooks;
- health checks for PostgreSQL, API, public and admin services;
- production database/media snapshot restored and verified before launch;
- administrator login verified over HTTPS;
- public site, admin site and API health routes verified in production;
- daily systemd-driven PostgreSQL + media backup with SHA256 manifests and 14-day on-host retention;
- production launch accepted on 2026-08-10;
- production HTTPS baseline commit: `2567c6a`.

## Stage 10 post-launch UX and privacy minimization

- public inquiry form removed from homepage and dessert detail pages;
- ordering now routes visitors to direct business contacts from `SiteSettings` without collecting inquiry form data on the public site;
- retained inquiry API/database/admin/history were intentionally not deleted;
- branded favicon plus branded 404 and runtime error surfaces added;
- footer phone/email made actionable and `www.cakeshape.ru` made a canonical redirect to the apex host;
- admin expired-session UX now clears stale authenticated state on `401` without weakening HttpOnly/CSRF/session-timeout security;
- Telegram settings accept `@username` and normalize it to `https://t.me/username`, while backend HTTPS validation remains strict;
- Site Settings image previews were constrained for usable 100% browser zoom without changing dessert image cards;
- public contact CTA/footer were unified into premium icon contact cards;
- WhatsApp/Telegram/social links open externally, phone remains semantic `tel:`, email remains `mailto:`;
- `social_url` is rendered as Instagram when it points to `instagram.com`, otherwise as a generic social profile;
- production visual/behavior acceptance completed on 2026-08-10;
- final contact presentation merge commit: `2caf9ea`.

See `docs/STAGE_09_ACCEPTANCE.md`, `docs/STAGE_10_ACCEPTANCE.md` and `docs/PRODUCTION_RUNBOOK.md` for the production acceptance records and operating procedure.

## Working model

GPT acts as project architect and maintains project documentation and GitHub history. Codex handles complex/security-sensitive implementation tasks. SourceCraft/Copilot handle narrow frontend or documentation tasks. Lovable provides the visual design reference for the public application.

Implementation workflow for substantial stages: feature branch -> agent implementation -> push -> GPT GitHub review -> fixes in the same branch -> acceptance -> merge to `master`.

Production operations follow a stricter sequence: production backup -> approved revision -> configuration validation -> narrowest safe build/recreate -> health checks -> browser smoke -> rollback decision if required.

## Local project path

`C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake`
