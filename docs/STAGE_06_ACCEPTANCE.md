# Stage 06 Acceptance — Order Request Contract Completion

## Status

Accepted and committed in `1979e85465fa1b35976dccd3c6bca5c47c4541a0`.

## Accepted scope

- Extended the existing inquiry domain without introducing a separate Order/checkout subsystem.
- Added optional `variant_id` linked to `dessert_variants` with `ON DELETE SET NULL`.
- Added immutable server-derived variant weight value/unit snapshots for historical readability.
- Added explicit `pickup` / `delivery` fulfillment method.
- Added bounded, trimmed recipe and decor preference fields.
- Variant validation rejects unknown, cross-dessert, archived or unavailable variants.
- Public inquiry dessert eligibility now requires the dessert itself to be available as well as published and category-visible.
- Duplicate fingerprint incorporates variant, fulfillment and preference fields.
- Public acknowledgement remains minimal and public inquiry read/enumeration routes remain absent.
- Admin inquiry detail and public inquiry form expose the new fields through the shared typed API client.
- Public variant selector offers only available variants and resets stale selection on dessert change.

## Verification

- Ruff passed.
- mypy passed.
- Python compileall passed during implementation verification.
- Focused Stage 06 PostgreSQL/migration suite passed.
- Full guarded API suite passed with only the existing Alembic deprecation warning.
- Public frontend lint/typecheck/build passed.
- Final focused inquiry regression suite passed after availability hardening.

## Deferred by design

- price snapshot/calculation;
- cart/checkout/payment;
- delivery integration;
- promo-code engine;
- customer accounts;
- public example-image upload;
- general CRM.

## Acceptance decision

`ACCEPTED`
