# Stage 01 Acceptance

## Status

Accepted on 2026-08-06.

Implementation commits:

- `9a8e0f5bbc76f5fbf40ba50feb9270f4efc02028` — Stage 01 foundation;
- `3bb237a15c6bfdbe077ee154a290d2f78d41e9d8` — runtime and test-workflow completion.

## Accepted scope

- monorepo workspace foundation;
- Next.js public application shell;
- Vite/React administration shell;
- FastAPI modular monolith;
- PostgreSQL, SQLAlchemy 2, and Alembic foundation;
- administrator model and Argon2id password handling;
- database-backed opaque sessions;
- HttpOnly cookies, CSRF protection, idle and absolute expiry;
- singleton site settings and public/admin endpoints;
- guarded PostgreSQL test database policy;
- explicit `ALLOW_TEST_DATABASE_RESET=yes` opt-in;
- migration smoke test;
- separate production and test API Docker targets;
- Docker Compose development topology;
- Makefile command interface;
- root and API Docker build-context exclusions.

## Review outcome

The initial implementation passed architectural and security review after focused corrections to Docker dependency installation, test-database safety, site-settings PATCH validation, password verification, read-only public settings access, Alembic test targeting, runtime configuration parsing, Docker test isolation, build contexts, and explicit destructive-test opt-in.

## Runtime verification

Completed successfully on 2026-08-06:

- API production and test Docker images built;
- public and admin Docker images built;
- Alembic upgraded a PostgreSQL database to `head`;
- migration smoke tests passed;
- full guarded API suite passed with `37 passed, 2 skipped`;
- production API image confirmed without pytest;
- test API image confirmed with pytest;
- first administrator creation succeeded;
- `/api/health` returned `ok`;
- `/api/ready` returned `ready`;
- `/api/public/site-settings` returned the default singleton;
- PostgreSQL and API health checks passed;
- public and admin services started successfully.

## Remaining low-priority notes

- Alembic reports a deprecation warning for missing `path_separator` configuration.
- A stale local `.next` directory can temporarily affect standalone type checking until the public app is rebuilt.
- The in-memory login limiter remains suitable only for the current single-instance development/runtime topology.

## Next stage

Stage 02 implements categories, desserts, variants, ordered images, public catalog read APIs, and custom admin CRUD without adding reviews, promotions, customer requests, or final visual design.
