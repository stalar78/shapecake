from __future__ import annotations

import asyncio
import os
from collections.abc import Iterator
from contextlib import contextmanager

import pytest
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import command
from app.core.config import get_settings
from tests.db_safety import guarded_test_database_url


@contextmanager
def migration_test_environment(database_url: str) -> Iterator[Config]:
    previous_database_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = database_url
    get_settings.cache_clear()
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", database_url)
    try:
        yield config
    finally:
        if previous_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous_database_url
        get_settings.cache_clear()


async def _clean_stage_01_tables(database_url: str) -> None:
    engine = create_async_engine(database_url)
    try:
        async with engine.begin() as connection:
            await connection.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE"))
            await connection.execute(text("DROP TABLE IF EXISTS admin_sessions CASCADE"))
            await connection.execute(text("DROP TABLE IF EXISTS admin_users CASCADE"))
            await connection.execute(text("DROP TABLE IF EXISTS site_settings CASCADE"))
    finally:
        await engine.dispose()


async def _inspect_stage_01_schema(database_url: str) -> tuple[set[str], int]:
    engine = create_async_engine(database_url)
    try:
        async with engine.connect() as connection:
            tables = {
                row[0]
                for row in (
                    await connection.execute(
                        text(
                            """
                            SELECT table_name
                            FROM information_schema.tables
                            WHERE table_schema = 'public'
                            """
                        )
                    )
                )
            }
            singleton_count = await connection.scalar(
                text("SELECT count(*) FROM site_settings WHERE id = 1")
            )
            return tables, int(singleton_count or 0)
    finally:
        await engine.dispose()


def run_migration_smoke_test() -> None:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        pass
    else:
        raise RuntimeError("migration smoke test must run outside an active asyncio event loop")

    database_url = guarded_test_database_url()
    asyncio.run(_clean_stage_01_tables(database_url))

    with migration_test_environment(database_url) as config:
        command.upgrade(config, "head")

    tables, singleton_count = asyncio.run(_inspect_stage_01_schema(database_url))
    assert {"admin_users", "admin_sessions", "site_settings", "alembic_version"} <= tables
    assert singleton_count == 1


def test_migration_environment_forces_guarded_url_and_restores_cache(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    guarded_url = "postgresql+asyncpg://u:p@localhost:5432/shape_cake_test"
    normal_url = "postgresql+asyncpg://u:p@localhost:5432/shape_cake"
    monkeypatch.setenv("DATABASE_URL", normal_url)
    get_settings.cache_clear()
    assert get_settings().database_url == normal_url

    with migration_test_environment(guarded_url) as config:
        assert os.environ["DATABASE_URL"] == guarded_url
        assert get_settings().database_url == guarded_url
        assert config.get_main_option("sqlalchemy.url") == guarded_url

    assert os.environ["DATABASE_URL"] == normal_url
    get_settings.cache_clear()
    assert get_settings().database_url == normal_url


def test_migration_smoke_wrapper_rejects_running_event_loop() -> None:
    async def call_wrapper_inside_loop() -> None:
        with pytest.raises(RuntimeError, match="outside an active asyncio event loop"):
            run_migration_smoke_test()

    asyncio.run(call_wrapper_inside_loop())


def test_alembic_upgrade_head_creates_stage_01_schema() -> None:
    run_migration_smoke_test()
