# Stage 05 Acceptance — Site Content, Settings, and Operational Overview

## Status

Accepted.

Implementation commit: `5c2cde48bf77227cf9482ba8d08ef862f6ed5b30`.

## Accepted scope

- existing singleton `site_settings` architecture preserved;
- added focused `about_master_title` and `about_master_text` fields only;
- public homepage wired to database-backed hero, about-master, contact, address, working-hours, order, delivery, pickup and prepayment content;
- authenticated settings administration added to the existing admin application;
- site-setting email and contact URLs trimmed and validated at the API boundary;
- optional contact URLs accept only empty values or absolute HTTPS URLs;
- compact authenticated read-only admin overview added;
- overview uses SQL aggregates and bounded deterministic queries;
- overview includes published/draft dessert counts, new-inquiry count, recent inquiries and active promotions;
- recent inquiry overview payload excludes message, internal notes, phone, email and customer name;
- active promotions respect publication/archive/schedule eligibility;
- typed API client remains the frontend integration boundary;
- Alembic Stage 05 migration extends the existing settings table only.

## Verification

Accepted implementation verification included:

- Ruff: passed;
- mypy: passed;
- frontend lint/build/typecheck: passed;
- focused Stage 05 PostgreSQL tests: passed;
- full guarded API suite: 77 passed, 2 skipped;
- final site-settings validation micro-fix: focused PostgreSQL tests 4 passed.

The existing Alembic `path_separator` deprecation warning remains low priority and is not a Stage 05 blocker.

## Security/data-boundary review

Accepted invariants:

- singleton `id = 1` remains enforced;
- admin settings mutation remains CSRF-protected;
- public settings do not expose administration timestamps/IDs;
- unsafe contact URL schemes are rejected;
- admin overview requires authentication and performs no mutation;
- overview avoids unnecessary customer PII;
- no generic CMS, analytics tables, financial metrics or reporting subsystem was introduced.

## Deferred items

- final Lovable visual pass;
- global media redesign / master image;
- production notification provider;
- deployment/production hardening;
- horizontal-scaling replacement for in-memory rate limiters.

## Next stage

Stage 06 — Order Request Contract Completion.
