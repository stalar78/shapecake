# Project Blueprint — Cake & Shape

## Identity

- Owner: stalar78
- Current stage: Stage 08 fully accepted; Stage 09 ready to start
- Repository: `stalar78/shapecake`
- Local path: `C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake`

## Purpose

A custom public dessert catalog and a purpose-built administration application for daily catalog, content, and customer-request management.

## MVP scope

Included: public storefront, catalog and dessert pages, custom admin, categories, products, variants, media, customer requests, reviews, promotions, site settings, notifications, SEO foundation, final public visual integration, Docker/VPS deployment.

Excluded: online payments, customer accounts, delivery integrations, warehouse accounting, loyalty program, full CRM, mobile applications.

## Architecture

```text
Public Next.js app ─┐
                    ├─> FastAPI modular monolith ─> PostgreSQL
Admin Vite app ─────┘              │
                                   ├─> media storage adapter
                                   └─> notification adapter
```

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

Public visual integration: customer-approved Lovable editorial patisserie concept integrated into the existing Next.js public application without replacing the production architecture. The stage introduced the final warm editorial palette, Cormorant Garamond + Manrope typography, reusable public header/footer/dessert-card components, redesigned homepage/detail/promotion/inquiry surfaces, responsive navigation and accessible focus/reduced-motion behavior. Real API-backed content and the production inquiry workflow were preserved, no Lovable mock business data was imported, and Stage 07 SEO/analytics contracts remained intact. Public lint, typecheck and production build passed. Merged in `0d3f851`.

## Security invariants

- Session token is stored only in an HttpOnly cookie; only its hash is persisted.
- No authentication tokens in localStorage.
- Mutating admin endpoints require CSRF protection.
- Test schema reset requires a guarded test database and explicit `ALLOW_TEST_DATABASE_RESET=yes` opt-in.
- Production API images exclude test tooling.
- Uploaded filenames never control storage paths.
- Public APIs never expose absolute media filesystem paths.
- Public inquiries never expose sequential database identifiers or administrator-only notes.
- Customer contact data and inquiry messages are not logged.
- Client-supplied `X-Forwarded-For` is not trusted for rate-limit identity without an explicit trusted-proxy design.
- Public reviews/promotions have no mutation endpoints and expose only explicitly public fields.
- Promotion schedule timestamps accepted by the API are timezone-aware and normalized to UTC.
- Site-setting contact URLs are empty or absolute HTTPS URLs; unsafe schemes are rejected at the API boundary.
- Admin overview is authenticated, read-only, SQL-backed and intentionally excludes unnecessary inquiry PII.
- Inquiry variant snapshots are server-derived; client-supplied snapshot data is not trusted.
- Public order requests require an available public dessert, and selected variants must belong to that dessert and be active/available.
- Canonical public URLs are derived only from controlled configuration, not arbitrary request Host/forwarded headers.
- JSON-LD contains only public data and is serialized safely for script embedding.
- Secrets and real customer data never enter Git.
- Production writes and deployment require explicit approval.

## Current risks

- The in-memory login and inquiry rate limiters are single-instance only and must be replaced before horizontal API scaling.
- Alembic has a low-priority `path_separator` deprecation warning.
- Local media storage is development-oriented and requires a production persistence/backup decision.
- Promotion/review/global media remain limited by the dessert-specific media subsystem.
- Notification integration currently uses a development-safe adapter; production provider integration remains a deployment decision.
- Customer-facing currency is not yet explicitly established in repository contracts, so Stage 08 intentionally avoided inventing a currency symbol.
- Production Nginx/HTTPS/backups/deployment configuration is incomplete; `infra/nginx` currently has no production configuration.
- Stage 08 automated frontend checks passed, but full manual browser/runtime smoke should be repeated against the production-like Stage 09 environment before launch acceptance.

## Next stage

Stage 09: production readiness and deployment.

The application now has accepted domain functionality, public SEO/discoverability and the final customer-approved public visual system. Stage 09 prepares a reproducible Ubuntu VPS deployment without changing the accepted product model.

Primary goals: production Docker Compose/runtime configuration, Nginx reverse proxy, domain and HTTPS/TLS setup, environment hardening, persistent PostgreSQL/media storage, backup and restore procedure, trusted-proxy/rate-limit decisions, production notification-provider decision, deployment/runbook documentation, and final end-to-end smoke of public/admin/inquiry/SEO behavior.

Stage 09 must not introduce unrelated product features. Any remaining non-launch-critical product gaps stay in the post-MVP backlog unless they block safe production operation.
