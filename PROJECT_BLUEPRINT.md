# Project Blueprint — Cake & Shape

## Identity

- Owner: stalar78
- Current stage: Stage 01 fully accepted and runtime-verified; Stage 02 ready to start
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

## Security invariants

- Session token is stored only in an HttpOnly cookie; only its hash is persisted.
- No authentication tokens in localStorage.
- Mutating admin endpoints require CSRF protection.
- Test schema reset requires a guarded test database and explicit `ALLOW_TEST_DATABASE_RESET=yes` opt-in.
- Production API images exclude test tooling.
- Secrets and real customer data never enter Git.
- Production writes and deployment require explicit approval.

## Current risks

- The in-memory login limiter is single-instance only and must be replaced before horizontal API scaling.
- Alembic has a low-priority `path_separator` deprecation warning.
- Public and admin interfaces remain foundation shells pending the design and domain stages.

## Next stage

Stage 02: category, dessert, variant, and ordered-image domain implementation with public catalog read APIs and admin CRUD.

Stage 02 does not include final Lovable-based visual design, customer requests, reviews, promotions, notifications, or production media infrastructure beyond the agreed local storage abstraction.
