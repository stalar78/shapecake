.PHONY: install dev up down migrate migration create-admin test test-migrations test-docker test-migrations-docker lint typecheck build

install:
	npm install
	python -m pip install -e "apps/api[dev]"

dev:
	docker compose up postgres api public admin

up:
	docker compose up -d

down:
	docker compose down

migrate:
	cd apps/api && alembic upgrade head

migration:
	cd apps/api && alembic revision --autogenerate -m "$(m)"

create-admin:
	cd apps/api && python -m app.auth.create_admin

test:
	cd apps/api && pytest

test-migrations:
	cd apps/api && pytest tests/test_migrations.py

test-docker:
	docker compose run --rm api-test

test-migrations-docker:
	docker compose run --rm api-test pytest tests/test_migrations.py

lint:
	npm run lint --workspaces --if-present
	cd apps/api && ruff check app tests

typecheck:
	npm run typecheck --workspaces --if-present
	cd apps/api && mypy app

build:
	npm run build --workspaces --if-present
	cd apps/api && python -m compileall app
