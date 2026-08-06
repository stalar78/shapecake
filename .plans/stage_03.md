# Stage 03 Plan — Customer Inquiry Workflow

## Goal

Implement a focused customer inquiry workflow from public submission through authenticated administration, lifecycle status handling, internal notes and a notification-adapter boundary.

## In scope

- Public inquiry form and API submission.
- Contact details, preferred contact channel and consent fields.
- Optional dessert reference, requested date, quantity/servings and free-form message.
- Inquiry lifecycle statuses with controlled transitions.
- Internal administrator notes and assignment-ready metadata without building a full CRM.
- Authenticated and CSRF-protected admin list, detail, filter, status and notes operations.
- Duplicate and spam-resistance controls appropriate to the MVP.
- Notification adapter interface with a development-safe implementation.
- Public success/error states and minimal accessible admin workflow.
- Alembic migration, PostgreSQL integration tests, frontend checks and live smoke verification.

## Out of scope

- online payments;
- customer accounts;
- delivery calculation or courier integration;
- warehouse accounting;
- loyalty program;
- full CRM, sales pipeline or automation engine;
- production email/SMS provider integration;
- reviews and promotions;
- final Lovable-based visual design;
- analytics platform integration;
- file attachments from customers.

## Domain invariants

- Public users can create inquiries but cannot read or modify them.
- Every inquiry has an immutable creation timestamp and a controlled current status.
- Status transitions are explicit and auditable through timestamps or a compact history model.
- Internal notes are never returned by public APIs.
- Optional dessert references must point to an existing non-archived dessert at submission time.
- Contact data is normalized and validated without requiring a customer account.
- Consent for personal-data processing is explicit and required.
- Public endpoints do not expose sequential inquiry lookup.
- Mutating admin endpoints require authentication and CSRF protection.
- Notification failure must not lose an accepted inquiry.
- Secrets and personal data must not be logged.

## Suggested status flow

- `new`
- `in_progress`
- `waiting_customer`
- `confirmed`
- `completed`
- `cancelled`
- `spam`

Transitions must be constrained and tested rather than accepting arbitrary strings.

## Expected delivery sequence

1. Inquiry model, migration, schemas and status-transition service.
2. Public submission endpoint with validation, throttling and idempotency/duplicate controls.
3. Admin list/detail/status/notes API.
4. Notification adapter and development implementation.
5. Public inquiry form and admin workflow UI.
6. Tests, Docker/runtime checks, review and documentation update.

## Acceptance criteria

- public submission stores a valid inquiry and returns a non-sensitive acknowledgement;
- invalid contact, consent, requested date and dessert references are rejected predictably;
- public users cannot enumerate or retrieve inquiries;
- admin can filter, inspect and update inquiry status and internal notes;
- invalid status transitions are rejected;
- internal notes and personal data are absent from public responses and logs;
- notification failures are isolated from inquiry persistence and reported safely;
- authentication and CSRF remain enforced for all admin mutations;
- migration, guarded PostgreSQL tests, lint, typecheck, builds and live smoke checks pass.

## Executor

Codex for the multi-file backend and frontend implementation. GPT-Architect owns review, documentation, GitHub history and stage acceptance.
