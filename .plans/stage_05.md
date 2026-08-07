# Stage 05 Plan — Site Content, Settings, and Operational Overview

## Goal

Complete the remaining site-level business content required by the MVP and add a compact administrator overview, building on the existing singleton `site_settings` model and accepted Stage 01-04 domains.

This stage must not become a generic CMS or analytics dashboard.

## Why this stage now

The catalog, inquiries, reviews, and promotions are already implemented. The remaining public site still needs business-controlled global content such as contacts, ordering/delivery/prepayment information, hero/about-master content, and an operational admin overview that surfaces existing domain state.

## In scope

### Site settings completion

Extend the existing singleton settings model/API only where needed for MVP content.

Existing fields already cover:

- hero title/text;
- phone/email;
- WhatsApp/Telegram/social link;
- address;
- delivery/pickup/prepayment/order terms;
- working hours.

Add only the missing focused fields required for public presentation, preferably:

- `about_master_title`;
- `about_master_text`;
- optional `delivery_area_text` if it is not already expressible cleanly;
- optional short `order_lead_time_text` if not already covered by order terms.

Do not add arbitrary page sections, JSON blocks, rich text, or dynamic schemas.

Hero/master images are deferred unless the existing media subsystem can be reused without redesign. Do not broaden dessert-specific media in this stage merely to support global images.

### Public settings API

Keep/extend the existing public settings read endpoint so the public Next.js app can render global business content from the database.

Public payload must contain only intended business-facing content.

### Admin settings UI/API

Use the existing authenticated settings administration.

Requirements:

- authenticated read;
- CSRF-protected update;
- trimmed/validated content;
- controlled URL/email validation where appropriate;
- omitted PATCH fields unchanged;
- explicit null rejected for non-nullable fields;
- singleton invariant preserved.

Add a practical settings editor to the current admin UI if it does not already expose all fields.

### Public homepage/information integration

Wire site settings into the existing public site for:

- hero title/text;
- contact block;
- address/working hours;
- ordering terms;
- delivery/pickup/prepayment information;
- about-master section.

Keep the visual treatment functional and minimal. Final Lovable design remains deferred.

Do not hardcode business content in React when it belongs to site settings.

### Compact admin overview

Add one focused authenticated overview endpoint and panel using existing domains.

Suggested API:

`GET /api/admin/overview`

Suggested response:

- published dessert count;
- hidden/unpublished dessert count;
- new inquiry count;
- a small list of recent inquiries;
- active promotion count;
- a small list of active/current promotions.

Requirements:

- use SQL aggregates/limited queries;
- do not fetch full tables and count in Python;
- recent inquiry payload must be minimal and administrator-safe;
- no new reporting tables;
- no charts;
- no historical analytics;
- no financial metrics.

The admin homepage/panel should present these operational values and quick navigation/action affordances only.

## Out of scope

- generic CMS/page builder;
- arbitrary homepage sections;
- rich text editor;
- site analytics/dashboard charts;
- sales/revenue metrics;
- customer accounts;
- payments;
- delivery integrations;
- coupon engine;
- production notification provider;
- global media redesign;
- final Lovable visual pass;
- SEO/deployment work beyond keeping current behavior intact.

## Data and API rules

- Preserve the `site_settings` singleton row (`id = 1`).
- Do not create a second settings table for the same global content.
- Required strings must be trimmed and non-blank where semantically required.
- Optional URLs must be either empty/nullable according to existing conventions or valid supported URLs; do not invent permissive unsafe schemes.
- Public settings must not expose timestamps or administration-only metadata unless already intentionally part of the public contract.
- Admin overview is authenticated and read-only; it does not require CSRF because it performs no mutation.

## Migration

Create the next Alembic migration after Stage 04 only if new settings columns are required.

Do not rewrite prior migrations.

Migration smoke must still reach head from the accepted chain.

## Shared API client

Extend the existing typed client rather than adding raw fetch calls.

Add/update types and methods for:

- public site settings;
- admin site settings update/read if missing;
- admin overview.

Reuse credentials and CSRF handling.

## Tests

Add focused PostgreSQL-backed coverage for:

### Settings

- singleton remains exactly one logical settings record;
- admin auth/CSRF;
- public read;
- update persists;
- required-string trimming/blank rejection;
- PATCH/null semantics;
- public payload safety;
- any new URL/email validation;
- migration columns if added.

### Overview

- unauthenticated request rejected;
- counts reflect published/hidden desserts;
- new inquiry count is correct;
- recent inquiries are limited and deterministic;
- active promotion count/list respects publication/archive/schedule eligibility;
- no inquiry message/internal notes/contact data beyond the minimal fields intentionally needed for the overview;
- SQL-backed behavior, not Python full-table counting.

### Regression

Existing Stage 01-04 tests must remain green.

## Executor strategy

Codex is used only for implementation and critical automated verification.

Codex should not spend tokens on:

- Git operations;
- README/blueprint/acceptance docs;
- archive creation;
- production Docker builds;
- manual live Compose smoke;
- verbose progress reports.

GPT-Architect handles project docs/GitHub/review. The user runs local Docker/runtime/Git commands after code review.

## Codex checks

Codex should run only the useful implementation checks:

- `ruff check app tests`;
- `mypy app`;
- focused Stage 05 PostgreSQL tests;
- full API suite if practical.

Frontend lint/typecheck/build may be run if the admin/public changes are substantial, but production Docker builds and live smoke are left to GPT-Architect/user verification.

## Acceptance criteria

- business-facing global content is editable from admin and rendered publicly;
- no generic CMS abstraction is introduced;
- existing singleton settings architecture remains intact;
- compact admin overview accurately reflects accepted catalog/inquiry/promotion state;
- overview queries are bounded and SQL-driven;
- public/admin data boundaries remain safe;
- typed client is the frontend integration boundary;
- critical tests pass and existing stages remain intact.
