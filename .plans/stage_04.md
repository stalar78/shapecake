# Stage 04 Plan — Reviews and Promotions

## Goal

Add focused review and promotion domains with public read surfaces and authenticated administration, building on the accepted Stage 01-03 architecture without introducing a generic CMS.

## In scope

### Reviews

- Review model, migration, validation and ordering.
- Review author/display name, rating, text and optional dessert relation.
- Explicit publication/visibility state controlled by administrators.
- Optional featured flag for homepage/public highlighting.
- Public review list/read surface containing only published, non-archived reviews.
- Authenticated and CSRF-protected admin CRUD/archive/publish/feature/reorder operations.
- Public review presentation integrated into the existing Next.js application.
- Minimal operational review administration in the existing admin application.

### Promotions

- Promotion model, migration, validation and ordering.
- Stable slug and title.
- Summary/body content appropriate to MVP promotional cards/pages.
- Optional start/end dates with explicit active-window rules.
- Publication/visibility state independent from time-window validity.
- Optional image/media reference using the existing safe media-storage boundary where cleanly reusable.
- Optional relation to one or more desserts only if it remains simple and bounded; otherwise use a focused single-dessert relation or no relation for Stage 04.
- Public active-promotion list and detail/read surface.
- Authenticated and CSRF-protected admin CRUD/archive/publish/reorder operations.
- Public promotion presentation integrated into the existing Next.js application.
- Minimal operational promotion administration in the existing admin application.

### Shared delivery

- Shared typed API client extensions for public and admin operations.
- Alembic migration(s) after Stage 03.
- PostgreSQL-backed integration tests.
- Frontend lint/typecheck/build verification.
- Docker/runtime smoke verification.

## Out of scope

- public customer self-service review submission;
- review moderation queues from anonymous users;
- user accounts;
- coupon-code redemption engine;
- cart or checkout discounts;
- dynamic pricing engine;
- loyalty program;
- generic banners/blocks/page-builder CMS;
- rich-text editor framework;
- analytics platform integration;
- production object storage/CDN redesign;
- final Lovable-based visual design;
- deployment or CI/CD changes.

## Domain invariants

### Reviews

- Reviews are administrator-managed content in Stage 04; there is no anonymous public write endpoint.
- Rating is finite and validated, recommended integer range `1..5`.
- Published and archived states are explicit.
- Archived reviews never appear publicly.
- Unpublished reviews never appear publicly.
- Optional dessert reference must preserve referential integrity and must not permit cross-domain orphaning.
- Public payloads contain only fields intended for site presentation and never administration metadata.
- Ordering is deterministic.

### Promotions

- Stable canonical slug is unique.
- Publication and schedule validity are separate concepts.
- Archived promotions never appear publicly.
- Public promotions must be published and inside their active time window when dates are present.
- `starts_at` may be null for immediate availability.
- `ends_at` may be null for no scheduled end.
- When both are present, `ends_at` must be greater than `starts_at`.
- Time-window filtering must happen in SQL before count/pagination.
- Public APIs must not expose storage filesystem paths or internal administration fields.
- Ordering is deterministic.

## Suggested models

### Review

Suggested fields:

- `id`
- `dessert_id` nullable
- `author_name`
- `rating`
- `text`
- `is_published`
- `is_featured`
- `sort_order`
- `created_at`
- `updated_at`
- `archived_at`

Keep fields focused. Do not add customer accounts, verified-purchase logic or moderation workflows.

### Promotion

Suggested fields:

- `id`
- `slug`
- `title`
- `summary`
- `body`
- optional safe image/media metadata/reference
- `is_published`
- `sort_order`
- `starts_at` nullable
- `ends_at` nullable
- `created_at`
- `updated_at`
- `archived_at`

If a dessert relation is implemented, keep it deliberately small and explain the choice in the final report.

## Public API

Suggested endpoints:

- `GET /api/public/reviews`
- `GET /api/public/promotions`
- `GET /api/public/promotions/{slug}`

Optional public dessert-review filter:

- `GET /api/public/reviews?dessert_id=...`

Requirements:

- SQL-level eligibility/filtering before pagination;
- deterministic ordering;
- accurate totals when pagination is exposed;
- archived/unpublished content excluded;
- scheduled promotions shown only when currently active;
- controlled `404` for promotion detail;
- no public review/promotions mutation endpoints.

## Admin API

All admin endpoints require an authenticated session. All mutations require CSRF.

### Reviews

Suggested operations:

- list/filter;
- get;
- create;
- update;
- publish/unpublish;
- feature/unfeature;
- reorder;
- archive;
- optional restore only if it follows existing archive conventions cleanly.

### Promotions

Suggested operations:

- list/filter;
- get;
- create;
- update;
- publish/unpublish;
- reorder;
- archive;
- optional restore only if consistent with existing conventions.

Do not create generic content endpoints or a universal CMS abstraction.

## Public frontend

Integrate functional placeholder presentation into the existing Next.js site:

- review section/list;
- featured reviews where appropriate;
- promotions list/cards;
- promotion detail page if implemented by API;
- loading/error/empty states;
- SSR/SEO-compatible fetching.

Do not perform the final Lovable visual-design pass in Stage 04.

## Admin frontend

Add minimal operational controls to the existing admin application:

- review list/create/edit/archive;
- publication and featured controls;
- rating/text/dessert relation management;
- review ordering;
- promotion list/create/edit/archive;
- publication and schedule controls;
- promotion ordering;
- image/media controls only if the existing media adapter can be reused without broad redesign;
- clear loading/success/validation/error states.

Avoid dashboard analytics, drag-and-drop builders and generalized CMS tooling.

## Security and privacy

Preserve all accepted Stage 01-03 invariants:

- opaque HttpOnly admin sessions;
- CSRF on mutations;
- no auth tokens in localStorage;
- guarded test-database reset;
- safe media storage paths and file validation;
- no customer inquiry PII in logs;
- no public inquiry enumeration;
- no trust in client-supplied `X-Forwarded-For` without a trusted-proxy design.

Review/promotional content is public only when explicitly eligible.

## Tests

Add PostgreSQL-backed coverage for at least:

### Reviews

- rating bounds;
- required-string validation;
- publication/archive visibility;
- optional dessert relation;
- deterministic ordering/reorder;
- admin auth/CSRF;
- public filtering;
- public payload does not expose admin-only fields.

### Promotions

- canonical unique slug;
- blank/invalid title/slug rejection;
- start/end validation;
- published vs scheduled eligibility;
- expired/future promotions excluded publicly;
- archive exclusion;
- deterministic ordering and accurate pagination/count;
- controlled public detail `404`;
- admin auth/CSRF;
- media safety if images are included.

### Regression

- Stage 01 auth/session checks remain green;
- Stage 02 catalog/media checks remain green;
- Stage 03 inquiry/rate-limit/status-history checks remain green;
- migration upgrade reaches new head from prior migrations.

## Acceptance criteria

- administrators can create, edit, publish, order and archive reviews and promotions;
- only eligible reviews/promotions appear publicly;
- promotion schedule logic is SQL-correct and deterministic;
- public review/promotional payloads contain no administration-only fields;
- existing catalog, inquiry, authentication, CSRF and media behavior remains intact;
- shared API client supports the new public/admin flows;
- public/admin interfaces provide functional operational flows;
- Ruff, mypy, Python compile checks, frontend lint/typecheck/build, guarded PostgreSQL suite, migration smoke, Docker builds and live smoke checks pass.

## Executor

Codex for the multi-file backend/frontend implementation. GPT-Architect owns review, documentation, GitHub history and stage acceptance.
