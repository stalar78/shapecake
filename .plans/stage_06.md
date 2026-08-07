# Stage 06 Plan — Order Request Contract Completion

## Goal

Complete the business-facing order-request data contract on top of the accepted Stage 03 inquiry workflow without introducing cart, checkout, payment, CRM, delivery integration, or a new order subsystem.

The approved specification requires an order request to capture the selected dessert/weight, desired date, fulfillment method and focused customer preferences. The current inquiry model already handles identity/contact/consent/date/quantity/message/status safely, but it does not yet represent selected variant/weight or fulfillment method explicitly.

## In scope

### Inquiry/order-request data

Extend the existing `Inquiry` domain rather than creating an `orders` domain.

Add focused fields:

- optional `variant_id` relation to an existing dessert variant;
- immutable variant/weight snapshot sufficient for admin review if the catalog later changes;
- `fulfillment_method` with a small explicit enum, preferably `pickup` / `delivery`;
- optional `recipe_preferences` text;
- optional `decor_preferences` text.

Do not add monetary calculations, cart lines, checkout totals or payment state.

### Variant integrity

When a public request includes `variant_id`:

- the variant must exist;
- it must belong to the selected dessert;
- the selected dessert must be currently eligible for public ordering under the accepted catalog rules;
- the selected variant must be active/available according to the existing Stage 02 variant model;
- store a compact snapshot needed to understand the request later even if the catalog changes.

Do not trust client-supplied price/weight labels when authoritative catalog data exists.

If a dessert has variants and a variant is selected, derive the snapshot server-side.

### Existing inquiry invariants

Preserve without weakening:

- opaque public reference;
- no public inquiry enumeration/detail;
- explicit personal-data consent;
- normalized contact validation;
- duplicate suppression;
- bounded public rate limiting;
- notification only after successful persistence;
- notification failure cannot lose an accepted inquiry;
- authenticated/CSRF-protected admin mutation;
- status transition map/history;
- no customer contact/message logging.

Update duplicate fingerprint inputs if the new order fields materially distinguish requests.

### Public API and form

Extend the existing public inquiry POST contract and typed client.

Public form should support:

- selected dessert;
- selected available weight/variant when applicable;
- requested date;
- quantity;
- pickup/delivery selection;
- recipe preferences;
- decor preferences;
- existing contact fields, main message and consent.

Dessert detail should continue to be able to open/prepopulate the inquiry flow for that dessert.

Do not add public inquiry GET endpoints.

### Admin inquiry workflow

Expose the new order-request fields in the existing admin inquiry detail/workflow.

Admin should be able to see:

- selected dessert snapshot/reference;
- selected variant/weight snapshot;
- fulfillment method;
- recipe preferences;
- decor preferences;
- existing contact/request/status information.

Do not build CRM, invoicing, fulfillment automation or editable order-line management.

### Migration

Create the next Alembic migration after `202608060005`.

Use database constraints for bounded enum/invariant fields where appropriate.

Do not rewrite earlier migrations.

### Typed client

Extend existing inquiry types/methods only. Do not add raw frontend fetches.

## Deliberately deferred

- order example image/file attachment;
- promo-code field/engine;
- automatic price calculation;
- delivery address/routing integration;
- payment/prepayment processing;
- cart;
- online checkout;
- customer account/order history;
- generic CRM;
- production notification provider;
- final Lovable design.

The optional example-image requirement should be handled in a later focused media/attachment stage because the current media subsystem is dessert-image-specific and public uploads require their own abuse/security boundary.

## Tests

Add focused PostgreSQL-backed coverage for:

- migration columns/constraints;
- valid variant belonging to selected dessert;
- unknown variant rejected;
- cross-dessert variant rejected;
- inactive/unavailable variant rejected for public submission;
- server-derived snapshot rather than client authority;
- fulfillment-method validation;
- trimming/max lengths for recipe/decor preferences;
- public acknowledgement remains minimal and does not expose internal/sequential IDs;
- admin detail contains the new intended fields;
- no new public read/mutation surface beyond POST;
- duplicate suppression accounts for materially different new request fields where appropriate;
- existing auth/CSRF/status workflow remains green.

Existing Stage 01-05 tests must remain green.

## Executor strategy

Codex handles implementation and critical automated verification only.

Codex should not spend tokens on:

- Git operations;
- README/blueprint/acceptance docs;
- archive creation;
- production Docker builds;
- manual live Compose smoke;
- verbose reports.

GPT-Architect handles architecture, review and documentation. The user handles local runtime/Git operations after acceptance.

## Codex checks

Run only useful checks:

- `ruff check app tests`;
- `mypy app`;
- focused Stage 06 PostgreSQL tests;
- full API suite if practical;
- frontend lint/typecheck/build only as required by changed public/admin code.

## Acceptance criteria

- existing inquiry domain remains the single order-request workflow;
- selected variant/weight is server-validated and snapshotted;
- fulfillment method and focused recipe/decor preferences persist and appear in admin;
- public form/client support the new contract;
- no cart/payment/CRM architecture is introduced;
- all Stage 03 security and privacy invariants remain intact;
- migration/test chain reaches head and prior stages remain green.
