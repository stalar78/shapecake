from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from tests.db_safety import guarded_test_database_url

os.environ.setdefault("SESSION_HASH_PEPPER", "test-pepper")

from app.auth.models import AdminSession, AdminUser
from app.auth.passwords import hash_password
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db_session
from app.main import create_app
from app.site_settings.services import get_or_create_site_settings


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture()
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    test_database_url = guarded_test_database_url()
    os.environ["DATABASE_URL"] = test_database_url
    get_settings.cache_clear()
    engine = create_async_engine(test_database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()

    engine = create_async_engine(test_database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        await get_or_create_site_settings(session)
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture()
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    get_settings.cache_clear()
    app = create_app()

    async def override_session() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db_session] = override_session
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as async_client:
        yield async_client


async def create_admin(db: AsyncSession, email: str = "admin@example.com", password: str = "Password12345") -> AdminUser:
    user = AdminUser(email=email, password_hash=hash_password(password), is_active=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def expire_sessions(db: AsyncSession) -> None:
    sessions = await db.execute(AdminSession.__table__.select())
    for row in sessions:
        session = await db.get(AdminSession, row.id)
        if session is not None:
            session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db.commit()
