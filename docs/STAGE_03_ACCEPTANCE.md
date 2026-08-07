# Stage 03 Acceptance

## Status

Accepted on 2026-08-07.

Implementation commit: `826cfd4805ad8f8b16a34a06be510ccea18346e4`.

## Accepted scope

- public customer inquiry submission;
- opaque public inquiry references with no public enumeration/read API;
- explicit personal-data consent;
- normalized phone/email contact validation and preferred contact channel;
- optional relation to an active, published dessert in a visible, non-archived category;
- requested-date and bounded positive quantity validation;
- duplicate suppression through hashed normalized fingerprints;
- bounded single-process public inquiry throttling;
- explicit lifecycle status transitions;
- compact status history with administrator attribution;
- administrator-only internal notes;
- authenticated and CSRF-protected admin inquiry list/detail/filter/notes/transition operations;
- notification adapter boundary invoked after persistence;
- public inquiry form and operational admin inquiry UI;
- shared typed API client support;
- Stage 03 Alembic migration and PostgreSQL-backed tests.

## Review corrections completed

The accepted implementation includes focused corrections for:

- explicit SQL `Dessert -> Category` validation for public dessert references;
- correct ORM serialization of nested dessert references;
- persisted and freshly reloaded status-history responses;
- deterministic transition tests using stable public-reference lookup;
- preservation of the intended status-transition map without weakening forbidden transitions;
- rejection of client-supplied `X-Forwarded-For` as a rate-limit identity source;
- bounded rate-limiter memory with stale-entry pruning and deterministic eviction;
- regression coverage for X-Forwarded-For rotation, limiter threshold, stale pruning and key-cap behavior.

## Verification

Verified checks include:

- Ruff, mypy and Python compile checks;
- frontend lint, typecheck and production builds;
- focused inquiry suite: `14 passed`;
- full guarded PostgreSQL suite: `68 passed, 2 skipped, 1 warning`;
- Stage 03 migration smoke tests;
- API test-image build;
- API, public and admin production Docker builds;
- successful Compose startup with PostgreSQL and API healthy;
- `/api/health` and `/api/ready` live checks;
- public and admin frontend HTTP `200` checks;
- live public inquiry submission returning only acknowledgement, public reference and creation time;
- public inquiry collection read returning `405` and public detail read returning `404`;
- live API logs without customer contact data or inquiry-message contents.

## Remaining non-blocking risks

- The login and inquiry rate limiters remain in-memory and single-instance; distributed limiting is required before horizontal API scaling.
- Alembic emits the existing low-priority `path_separator` deprecation warning.
- The notification adapter is development-safe only; production provider integration remains deferred.
- Final Lovable-based visual design remains deferred.

## Next stage

Stage 04 implements reviews and promotions with public read surfaces and focused authenticated administration while preserving the accepted catalog, inquiry and security foundations.
