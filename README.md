# Cake & Shape

Custom production website and administration application for a small dessert business.

## Current stage

Stage 01 foundation and Stage 02 catalog domain are fully accepted, runtime-verified, and committed. The next implementation stage is Stage 03: customer inquiry workflow and administration handling.

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

## Working model

GPT acts as project architect and maintains project documentation and GitHub history. Codex handles complex implementation tasks. Lovable provides the visual design reference for the public application.

## Local project path

`C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake`
