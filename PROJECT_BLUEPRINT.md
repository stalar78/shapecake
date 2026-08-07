# Project Blueprint — Cake & Shape

## Identity

- Owner: stalar78
- Current stage: Stage 03 fully accepted and runtime-verified; Stage 04 ready to start
- Repository: `stalar78/shapecake`
- Local path: `C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake`

## Purpose

A custom public dessert catalog and a purpose-built administration application for daily catalog, content, and customer-request management.

## MVP scope

Included: public storefront, catalog and dessert pages, custom admin, categories, products, variants, media, customer requests, reviews, promotions, site settings, notifications, SEO foundation, Docker/VPS deployment.

Excluded: online payments, customer accounts, delivery integrations, warehouse accounting, loyalty program, full CRM, mobile applications.

## Architecture

```text
Public Next.js app ─┐
                    ├─> FastAPI modular monolith ─> PostgreSQL
Admin Vite app ─────┘              │
                                   ├─> media storage adapter
                                   └─> notification adapter
```

## Stage 01 result

- npm-workspace monorepo;
- public Next.js shell;
- admin Vite/React shell;
- FastAPI API;
- async SQLAlchemy and Alembic;
- database-backed opaque admin sessions;
- CSRF protection;
- singleton site settings;
- guarded PostgreSQL integration and migration tests;
- separate production and test API Docker targets;
- explicit destructive-test opt-in;
- Docker Compose development topology;
- Makefile command interface;
- successful full Docker, PostgreSQL, migration, test-suite, administrator-creation, and live endpoint verification.

## Stage 02 result

- category, dessert, variant and ordered-image domain;
- archive, visibility, publication and availability invariants;
- stable canonical slugs and controlled integrity-error mapping;
- SQL-correct public eligibility, counting and pagination;
- integer minor-unit prices and guarded variant uniqueness;
- transactional one-primary-image behavior;
- local media adapter with size, MIME, signature and path-safety controls;
- authenticated and CSRF-protected admin CRUD and reorder operations;
- public catalog and dessert-detail APIs and pages;
- shared typed API client;
- migration and comprehensive PostgreSQL integration tests;
- successful Docker and live catalog/media smoke verification.

## Stage 03 result

- public customer inquiry submission with opaque public references;
- explicit consent and normalized contact validation;
- optional references to currently public desserts;
- requested-date and quantity validation;
- duplicate suppression with hashed request fingerprints;
- bounded single-process public rate limiter using hashed peer identities;
- explicit inquiry lifecycle transitions with status history and terminal timestamps;
- authenticated, CSRF-protected admin list/detail/filter/notes/transition workflow;
- notification adapter invoked only after successful inquiry persistence;
- public inquiry form and operational admin inquiry UI;
- no public inquiry enumeration or detail retrieval;
- comprehensive PostgreSQL integration and migration tests;
- successful production Docker builds and live submission/runtime verification.

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
- Secrets and real customer data never enter Git.
- Production writes and deployment require explicit approval.

## Current risks

- The in-memory login and inquiry rate limiters are single-instance only and must be replaced before horizontal API scaling.
- Alembic has a low-priority `path_separator` deprecation warning.
- Local media storage is development-oriented; production object storage is deferred.
- Notification integration currently uses a development-safe adapter; production provider integration is deferred.
- Public and admin interfaces are functional but final Lovable-based visual design remains deferred.

## Next stage

Stage 04: reviews and promotions, adding public marketing/content surfaces and focused authenticated administration on top of the accepted catalog and inquiry foundation.

Stage 04 does not include final Lovable-based visual design, production deployment, customer accounts, payments, delivery integrations, or a general CMS.
