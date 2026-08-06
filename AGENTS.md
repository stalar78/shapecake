# AGENTS.md

## Project
Cake & Shape is a modular monolith with three applications:

- `apps/public` — public Next.js storefront;
- `apps/admin` — internal Vite/React administration UI;
- `apps/api` — FastAPI backend and PostgreSQL persistence.

## Commands
Use the root `Makefile` as the stable command interface:

- `make install`
- `make dev`
- `make test`
- `make test-migrations`
- `make lint`
- `make typecheck`
- `make build`

## Scope rules

- Do not add WordPress, hosted CMS products, no-code backends, Firebase, or Supabase.
- Preserve the modular-monolith architecture.
- Do not introduce generic abstractions without a current use.
- Do not access, deploy to, or modify production without explicit approval.
- Never commit secrets, real customer data, uploaded production media, or `.env` files.
- Complex changes require a plan before implementation.
- Update tests with behavior changes.
- GPT-Architect owns project-wide documentation and GitHub history.
