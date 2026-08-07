# Stage 04 Acceptance

## Status

Accepted on 2026-08-07.

Implementation commit: `d3a4e7e88b019294025435d7ad1f5768fca1eead`.

## Accepted scope

- administrator-managed reviews with optional dessert relation;
- integer rating validation in the `1..5` range;
- publish, featured, deterministic ordering and archive workflow for reviews;
- public review list/filter surfaces with safe payloads;
- administrator-managed promotions with canonical unique slugs;
- optional single-dessert promotion relation;
- publish, deterministic ordering and archive workflow for promotions;
- optional start/end promotion schedules;
- public active-promotion list and detail APIs;
- authenticated and CSRF-protected administration;
- shared typed API client;
- functional public review/promotion presentation;
- functional review/promotion administration;
- Stage 04 Alembic migration and PostgreSQL integration tests.

## Important implementation decisions

- Promotion media was intentionally deferred because the accepted media subsystem is dessert-image-specific and broadening it would expand Stage 04 beyond its focused scope.
- Promotion targeting is limited to an optional single dessert rather than a many-to-many campaign model.
- Public promotion eligibility is filtered in SQL before count/pagination and detail retrieval.
- Publication and schedule validity are separate concepts.
- Promotion schedule values must be timezone-aware at the API boundary and are normalized to UTC.
- Reviews and promotions have no public mutation routes.

## Review corrections completed

Final review included a focused correction for promotion schedule timestamps:

- timezone-naive `starts_at` / `ends_at` values are rejected with validation errors;
- `Z` and explicit timezone offsets are accepted;
- accepted timestamps are normalized to UTC;
- nullable PATCH semantics remain intact;
- partial schedule updates continue to validate against the persisted opposite bound.

## Verification

Verified checks include:

- Ruff;
- mypy;
- Python compile checks;
- frontend lint, typecheck and production builds;
- focused Stage 04 PostgreSQL tests;
- full guarded PostgreSQL API suite (`74 passed, 2 skipped` before the final focused timezone regression addition);
- Stage 04 migration smoke;
- API/public/admin production Docker builds;
- live Compose health/readiness;
- live review publish/feature/archive/public-visibility workflow;
- live promotion publication, schedule, detail, reorder and archive workflow;
- absence of public review/promotion mutation routes.

The final timezone regression suite for promotions passed after the focused correction.

## Remaining non-blocking risks

- promotion images remain deferred;
- admin/public interfaces are functional placeholders pending the final Lovable-based visual pass;
- local media storage remains development-oriented;
- existing Alembic `path_separator` warning remains low priority.

## Next stage

Stage 05 completes site-level content/settings and adds a compact operational admin overview without introducing a generic CMS or analytics dashboard.
