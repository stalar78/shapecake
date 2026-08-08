# Cake & Shape

Custom production website and administration application for a small dessert business.

## Current stage

Stage 01 foundation, Stage 02 catalog domain, Stage 03 customer inquiry workflow, Stage 04 reviews/promotions, Stage 05 site content/settings/operational overview, Stage 06 order-request contract completion, Stage 07 SEO/public discoverability, and Stage 08 Lovable-based public design integration are accepted and committed. The next stage is Stage 09: production readiness and deployment.

## Approved MVP

- public responsive website;
- dynamic dessert catalog and detail pages;
- custom administration application;
- dessert, category, price variant, review, promotion and site-settings management;
- customer inquiry/order-request workflow with status handling;
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
- the public visual system now uses a warm editorial patisserie direction with Cormorant Garamond and Manrope, restrained radii, image-led cards, editorial spacing and accessible focus states;
- reusable public header, footer and dessert-card components were introduced;
- homepage, dessert detail, promotion detail and inquiry presentation were redesigned around real API-backed data only;
- customer-facing copy was cleaned of implementation/developer language and no Lovable mock business facts were imported;
- the real inquiry API flow, validation, variant availability filtering, rate/duplicate error handling and public-reference success state were preserved;
- Stage 07 metadata, canonical URLs, Open Graph, JSON-LD, analytics, robots and sitemap behavior remain intact;
- public lint, typecheck and production build passed before acceptance;
- merge commit: `0d3f851`.

## Working model

GPT acts as project architect and maintains project documentation and GitHub history. Codex handles complex implementation tasks. Lovable provides the visual design reference for the public application.

Implementation workflow for substantial stages: feature branch -> agent implementation -> push -> GPT GitHub review -> fixes in the same branch -> acceptance -> merge to `master`.

## Local project path

`C:\Users\stala\OneDrive\Рабочий стол\Dev\shapecake`
