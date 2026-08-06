from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import AdminUser
from app.auth.passwords import hash_password, verify_password
from app.site_settings.models import SiteSettings
from tests.conftest import create_admin, expire_sessions


async def _login(client: AsyncClient, email: str = "admin@example.com", password: str = "Password12345"):
    return await client.post("/api/admin/auth/login", json={"email": email, "password": password})


async def _csrf(client: AsyncClient) -> str:
    response = await client.get("/api/admin/auth/csrf")
    return response.json()["csrf_token"]


async def test_health_endpoint(client: AsyncClient) -> None:
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_ready_endpoint(client: AsyncClient) -> None:
    response = await client.get("/api/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_password_hashing_and_verification() -> None:
    password_hash = hash_password("Password12345")
    assert "Password12345" not in password_hash
    assert verify_password(password_hash, "Password12345")
    assert not verify_password(password_hash, "wrong")
    assert not verify_password("not-a-valid-argon2-hash", "Password12345")


async def test_login_with_malformed_stored_hash_fails(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user = AdminUser(email="broken@example.com", password_hash="bad-hash", is_active=True)
    db_session.add(user)
    await db_session.commit()
    response = await _login(client, email="broken@example.com")
    assert response.status_code == 401


async def test_login_success(client: AsyncClient, db_session: AsyncSession) -> None:
    await create_admin(db_session)
    response = await _login(client)
    assert response.status_code == 200
    assert response.json()["email"] == "admin@example.com"
    assert "shape_cake_session" in response.cookies


async def test_login_failure(client: AsyncClient, db_session: AsyncSession) -> None:
    await create_admin(db_session)
    response = await _login(client, password="wrong")
    assert response.status_code == 401


async def test_protected_endpoint_rejection(client: AsyncClient) -> None:
    response = await client.get("/api/admin/auth/me")
    assert response.status_code == 401


async def test_authenticated_me(client: AsyncClient, db_session: AsyncSession) -> None:
    await create_admin(db_session)
    await _login(client)
    response = await client.get("/api/admin/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "admin@example.com"


async def test_logout_revokes_session(client: AsyncClient, db_session: AsyncSession) -> None:
    await create_admin(db_session)
    await _login(client)
    csrf = await _csrf(client)
    response = await client.post("/api/admin/auth/logout", headers={"x-csrf-token": csrf})
    assert response.status_code == 200
    assert (await client.get("/api/admin/auth/me")).status_code == 401


async def test_expired_session_rejection(client: AsyncClient, db_session: AsyncSession) -> None:
    await create_admin(db_session)
    await _login(client)
    await expire_sessions(db_session)
    response = await client.get("/api/admin/auth/me")
    assert response.status_code == 401


async def test_csrf_rejection(client: AsyncClient, db_session: AsyncSession) -> None:
    await create_admin(db_session)
    await _login(client)
    response = await client.patch("/api/admin/site-settings", json={"hero_title": "Updated"})
    assert response.status_code == 403


async def test_site_settings_patch_rejects_explicit_null(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await create_admin(db_session)
    await _login(client)
    csrf = await _csrf(client)
    response = await client.patch(
        "/api/admin/site-settings",
        json={"hero_title": None},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 422


async def test_public_site_settings_response(client: AsyncClient) -> None:
    response = await client.get("/api/public/site-settings")
    assert response.status_code == 200
    assert response.json()["hero_title"] == "Cake & Shape"


async def test_public_site_settings_missing_singleton_returns_configuration_error(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    settings = await db_session.get(SiteSettings, 1)
    assert settings is not None
    await db_session.delete(settings)
    await db_session.commit()
    response = await client.get("/api/public/site-settings")
    assert response.status_code == 503


async def test_authenticated_site_settings_update(client: AsyncClient, db_session: AsyncSession) -> None:
    await create_admin(db_session)
    await _login(client)
    csrf = await _csrf(client)
    response = await client.patch(
        "/api/admin/site-settings",
        json={"hero_title": "New title"},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200
    assert response.json()["hero_title"] == "New title"


async def test_singleton_site_settings(db_session: AsyncSession) -> None:
    try:
        await db_session.execute(
            insert(SiteSettings).values(
                id=2,
                hero_title="x",
                hero_text="x",
                phone="",
                email="",
                whatsapp_url="",
                telegram_url="",
                social_url="",
                address_text="",
                delivery_text="",
                pickup_text="",
                prepayment_text="",
                order_terms_text="",
                working_hours_text="",
            )
        )
        await db_session.commit()
    except IntegrityError:
        await db_session.rollback()
    else:
        raise AssertionError("site_settings allowed a second row")
