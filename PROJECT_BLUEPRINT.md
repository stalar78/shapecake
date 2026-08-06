# Project Blueprint — Cake & Shape

## Identity

- Owner: stalar78
- Current stage: Stage 01 foundation accepted, runtime verification pending local PostgreSQL/Docker availability
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
- Docker Compose development topology;
- Makefile command interface.

## Security invariants

- Session token is stored only in an HttpOnly cookie; only its hash is persisted.
- No authentication tokens in localStorage.
- Mutating admin endpoints require CSRF protection.
- Test schema reset requires a guarded test database and explicit opt-in.
- Secrets and real customer data never enter Git.
- Production writes and deployment require explicit approval.

## Current risks

- Full PostgreSQL, migration, Docker, and browser smoke verification still depends on local Docker availability.
- The in-memory login limiter is single-instance only and must be replaced before horizontal API scaling.
- Public and admin interfaces are foundation shells pending the design and domain stages.

## Next stage

Stage 02: category, dessert, variant, and ordered-image domain implementation with public catalog read APIs and admin CRUD.
