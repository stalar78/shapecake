# Stage 02 Plan — Catalog Domain

## Goal

Implement the catalog domain end to end: categories, desserts, price/weight variants, ordered dessert images, public read APIs, and custom admin CRUD.

## In scope

- Category model, migration, validation, archive/visibility rules, and admin CRUD.
- Dessert model with one category, publication and availability separated, nutritional fields, ingredients, allergens, warnings, ordering, and fixed MVP flags.
- Dessert variants with weight, unit, current price, optional old price, availability, ordering, and archive behavior.
- Dessert images with metadata, one primary image, ordering, alt text, and safe lifecycle boundaries.
- Public category, catalog, and dessert-detail read APIs.
- Admin CRUD for categories, desserts, variants, and image metadata/lifecycle.
- Minimal accessible admin screens needed to exercise the domain.
- Public placeholder catalog/detail screens connected to the API; final Lovable design remains separate.
- Alembic migration, domain tests, API integration tests, and relevant frontend checks.

## Out of scope

- customer requests and internal notes;
- reviews;
- promotions;
- email notifications;
- final visual design;
- payment, delivery, customer accounts, loyalty, CRM;
- production deployment and backups;
- universal tags or CMS abstractions.

## Domain invariants

- A dessert belongs to exactly one category.
- Publication and order availability are independent states.
- Archived records do not appear in public responses.
- A dessert can have multiple ordered variants, unique by weight and unit among active records.
- A dessert can have multiple ordered images and at most one active primary image.
- Prices use integer minor units or a precise decimal strategy; floats are prohibited.
- Category deletion is restricted while active desserts reference it; archive is preferred.
- Public detail lookup uses a unique stable slug.
- Fixed MVP flags remain explicit dessert fields rather than a generic label subsystem.

## Expected delivery sequence

1. Database models, migration, schemas, and domain services.
2. Public and admin API endpoints with authorization and validation.
3. Image storage adapter and safe upload lifecycle limited to dessert images.
4. Admin category and dessert workflows.
5. Public catalog and dessert-detail integration.
6. Tests, checks, review, and documentation update.

## Acceptance criteria

- migrations apply cleanly to an empty guarded PostgreSQL test database;
- admin can create, edit, archive, reorder, publish, and mark availability for categories and desserts;
- admin can manage multiple variants and ordered images with one primary image;
- public APIs expose only visible, published, non-archived data;
- public catalog and detail routes render API data and handle missing/failed states;
- invalid price, weight, slug, category, primary-image, and archive operations are rejected predictably;
- authentication and CSRF protections remain enforced for mutating admin operations;
- lint, typecheck, build, API tests, and migration smoke tests pass or infrastructure blockers are reported exactly.

## Executor

Codex for the multi-file backend and frontend implementation. GPT-Architect owns review, documentation, GitHub history, and stage acceptance.
