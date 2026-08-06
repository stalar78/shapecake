# Stage 02 Acceptance

## Status

Accepted on 2026-08-06.

Implementation commit: `62d34dc424bf35dfb0499987b3c45e98a3b35e58`.

## Accepted scope

- categories with visibility, archive and deterministic ordering;
- desserts with publication, availability, nutrition fields and fixed MVP flags;
- stable canonical slugs;
- ordered active price/weight variants using integer minor currency units;
- ordered dessert images with one active primary image;
- safe local media storage abstraction;
- public category, catalog and dessert-detail APIs;
- authenticated and CSRF-protected admin CRUD and reorder operations;
- shared typed API client;
- functional public catalog/detail pages;
- minimal operational admin catalog UI;
- Stage 02 Alembic migration and PostgreSQL integration tests.

## Review corrections completed

The accepted implementation includes focused corrections for:

- SQL eligibility before public count and pagination;
- publication only with an active variant;
- protection against archiving the last active variant of a published dessert;
- dessert, variant and image reorder operations;
- constraint-safe primary-image switching;
- archived-parent and cross-dessert mutation protection;
- upload path, size, MIME and signature validation;
- strict PATCH null semantics;
- required-string validation after trimming;
- canonical slug validation;
- controlled PostgreSQL integrity-error mapping.

## Verification

Verified checks include:

- Ruff, mypy and Python compile checks;
- frontend lint, typecheck and production builds;
- full guarded PostgreSQL test suite;
- Stage 02 migration smoke tests;
- API production and test Docker builds;
- live public category, catalog and detail checks;
- authenticated admin CRUD, reorder and media-upload smoke checks.

## Remaining non-blocking risks

- Alembic emits the existing low-priority `path_separator` deprecation warning.
- Local media storage is intended for development and initial deployment only.
- Final Lovable-based public visual design remains deferred.

## Next stage

Stage 03 implements the customer inquiry workflow: public submission, lifecycle statuses, internal notes, admin handling and a notification-adapter boundary.
