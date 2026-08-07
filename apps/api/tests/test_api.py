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


async def test_site_settings_stage_05_fields_trim_persist_and_public_payload_is_safe(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    await create_admin(db_session)
    assert (await client.get("/api/admin/site-settings")).status_code == 401
    await _login(client)
    missing_csrf = await client.patch(
        "/api/admin/site-settings",
        json={"about_master_title": "Master"},
    )
    assert missing_csrf.status_code == 403

    csrf = await _csrf(client)
    updated = await client.patch(
        "/api/admin/site-settings",
        json={
            "hero_title": "  Custom cakes  ",
            "about_master_title": "  Meet the baker  ",
            "about_master_text": "  Small-batch desserts  ",
            "delivery_text": "  Delivery by agreement  ",
        },
        headers={"x-csrf-token": csrf},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["hero_title"] == "Custom cakes"
    assert body["about_master_title"] == "Meet the baker"
    assert body["about_master_text"] == "Small-batch desserts"
    assert body["delivery_text"] == "Delivery by agreement"

    persisted = await client.get("/api/admin/site-settings")
    assert persisted.status_code == 200
    assert persisted.json()["about_master_title"] == "Meet the baker"

    public = await client.get("/api/public/site-settings")
    assert public.status_code == 200
    public_body = public.json()
    assert public_body["about_master_text"] == "Small-batch desserts"
    assert "created_at" not in public_body
    assert "updated_at" not in public_body
    assert "id" not in public_body

    blank_required = await client.patch(
        "/api/admin/site-settings",
        json={"hero_title": "   "},
        headers={"x-csrf-token": csrf},
    )
    assert blank_required.status_code == 422
    null_field = await client.patch(
        "/api/admin/site-settings",
        json={"about_master_text": None},
        headers={"x-csrf-token": csrf},
    )
    assert null_field.status_code == 422


async def test_site_settings_contact_validation(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    await create_admin(db_session)
    await _login(client)
    csrf = await _csrf(client)

    empty_optional = await client.patch(
        "/api/admin/site-settings",
        json={"email": "  ", "whatsapp_url": "", "telegram_url": "  ", "social_url": ""},
        headers={"x-csrf-token": csrf},
    )
    assert empty_optional.status_code == 200
    assert empty_optional.json()["email"] == ""
    assert empty_optional.json()["telegram_url"] == ""

    valid = await client.patch(
        "/api/admin/site-settings",
        json={
            "email": "  baker@example.com  ",
            "whatsapp_url": "https://wa.me/15551234567",
            "telegram_url": "https://t.me/cake_shape",
            "social_url": "https://example.com/cake-shape",
        },
        headers={"x-csrf-token": csrf},
    )
    assert valid.status_code == 200
    assert valid.json()["email"] == "baker@example.com"

    malformed_email = await client.patch(
        "/api/admin/site-settings",
        json={"email": "not-an-email"},
        headers={"x-csrf-token": csrf},
    )
    assert malformed_email.status_code == 422

    for bad_url in [
        "http://example.com",
        "javascript:alert(1)",
        "data:text/plain,hello",
        "/relative/path",
        "example.com/path",
    ]:
        response = await client.patch(
            "/api/admin/site-settings",
            json={"social_url": bad_url},
            headers={"x-csrf-token": csrf},
        )
        assert response.status_code == 422, bad_url

    patch_same_validation = await client.patch(
        "/api/admin/site-settings",
        json={"whatsapp_url": "ftp://example.com/contact"},
        headers={"x-csrf-token": csrf},
    )
    assert patch_same_validation.status_code == 422


async def test_public_site_settings_response(client: AsyncClient) -> None:
    response = await client.get("/api/public/site-settings")
    assert response.status_code == 200
    assert response.json()["hero_title"] == "Cake & Shape"
    assert response.json()["about_master_title"] == "About the master"


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
                about_master_title="x",
                about_master_text="x",
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
