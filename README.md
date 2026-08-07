# Cake & Shape

Custom production website and administration application for a small dessert business.

## Current stage

Stage 01 foundation, Stage 02 catalog domain, Stage 03 customer inquiry workflow, and Stage 04 reviews/promotions are fully accepted, runtime-verified, and committed. The next implementation stage is Stage 05: site content, settings, and operational overview.

## Approved MVP

- public responsive website;
- dynamic dessert catalog and detail pages;
- custom administration application;
- dessert, category, price variant, review, promotion and site-settings management;
- customer inquiry workflow with status handling;
- secure media uploads;
- PostgreSQL-backed FastAPI API;
- Next.js public frontend;
- Vite React admin frontend;
- Docker Compose deployment foundation.

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

## Stage 04 reviews and promotions

- administrator-managed reviews with rating, optional dessert relation, publication, featured state, ordering and archive workflow;
- public review filtering with SQL-correct eligibility and deterministic pagination;
- administrator-managed promotions with canonical slugs, optional dessert relation and UTC-aware scheduling;
- public promotion list/detail surfaces that exclude draft, archived, future and expired promotions in SQL;
- authenticated and CSRF-protected review/promotion administration;
- shared typed API client plus functional public/admin interfaces;
- Stage 04 PostgreSQL migration, comprehensive integration tests, production Docker builds and live runtime verification.

## Working model

GPT acts as project architect and maintains project documentation and GitHub history. Codex handles complex implementation tasks. Lovable provides the visual design reference for the public application.

## Local project path

`C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake`
