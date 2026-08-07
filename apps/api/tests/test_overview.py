from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.inquiries.services import inquiry_rate_limiter
from tests.conftest import create_admin


async def _login(client: AsyncClient, db: AsyncSession) -> str:
    await create_admin(db)
    response = await client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "Password12345"},
    )
    assert response.status_code == 200
    csrf = await client.get("/api/admin/auth/csrf")
    return str(csrf.json()["csrf_token"])


async def _category(client: AsyncClient, csrf: str, slug: str) -> dict[str, Any]:
    response = await client.post(
        "/api/admin/categories",
        json={"name": slug.title(), "slug": slug},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 201
    return response.json()


async def _dessert(
    client: AsyncClient,
    csrf: str,
    category_id: int,
    slug: str,
    *,
    published: bool,
) -> dict[str, Any]:
    response = await client.post(
        "/api/admin/desserts",
        json={"category_id": category_id, "name": slug.title(), "slug": slug},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 201
    dessert = response.json()
    variant = await client.post(
        f"/api/admin/desserts/{dessert['id']}/variants",
        json={"weight_value": "1.00", "weight_unit": "kg", "price": 2500},
        headers={"x-csrf-token": csrf},
    )
    assert variant.status_code == 201
    if published:
        patched = await client.patch(
            f"/api/admin/desserts/{dessert['id']}",
            json={"is_published": True},
            headers={"x-csrf-token": csrf},
        )
        assert patched.status_code == 200
        return patched.json()
    return dessert


async def _inquiry(client: AsyncClient, index: int) -> dict[str, Any]:
    inquiry_rate_limiter.clear()
    response = await client.post(
        "/api/public/inquiries",
        json={
            "customer_name": f"Customer {index}",
            "phone": f"+15550000{index:03d}",
            "email": f"customer{index}@example.com",
            "preferred_contact_channel": "email",
            "requested_date": (datetime.now(UTC).date() + timedelta(days=index + 1)).isoformat(),
            "quantity": 1,
            "message": f"Sensitive message {index}",
            "consent_personal_data": True,
        },
    )
    assert response.status_code == 201
    return response.json()


def _iso(delta: timedelta) -> str:
    return (datetime.now(UTC) + delta).isoformat()


async def test_admin_overview_requires_auth_and_returns_safe_sql_backed_summary(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    assert (await client.get("/api/admin/overview")).status_code == 401
    csrf = await _login(client, db_session)

    category = await _category(client, csrf, "overview-cakes")
    await _dessert(client, csrf, int(category["id"]), "published-one", published=True)
    await _dessert(client, csrf, int(category["id"]), "published-two", published=True)
    await _dessert(client, csrf, int(category["id"]), "draft-one", published=False)

    for index in range(7):
        await _inquiry(client, index)

    active_one = await client.post(
        "/api/admin/promotions",
        json={"slug": "active-one", "title": "Active One", "is_published": True, "sort_order": 1},
        headers={"x-csrf-token": csrf},
    )
    assert active_one.status_code == 201
    active_two = await client.post(
        "/api/admin/promotions",
        json={
            "slug": "active-two",
            "title": "Active Two",
            "is_published": True,
            "starts_at": _iso(timedelta(days=-1)),
            "ends_at": _iso(timedelta(days=1)),
            "sort_order": 0,
        },
        headers={"x-csrf-token": csrf},
    )
    assert active_two.status_code == 201
    for payload in [
        {"slug": "future", "title": "Future", "is_published": True, "starts_at": _iso(timedelta(days=1))},
        {"slug": "expired", "title": "Expired", "is_published": True, "ends_at": _iso(timedelta(days=-1))},
        {"slug": "draft", "title": "Draft", "is_published": False},
    ]:
        response = await client.post("/api/admin/promotions", json=payload, headers={"x-csrf-token": csrf})
        assert response.status_code == 201

    overview = await client.get("/api/admin/overview")
    assert overview.status_code == 200
    body = overview.json()
    assert body["published_dessert_count"] == 2
    assert body["hidden_unpublished_dessert_count"] == 1
    assert body["new_inquiry_count"] == 7
    assert len(body["recent_inquiries"]) == 5
    recent_ids = [item["id"] for item in body["recent_inquiries"]]
    assert recent_ids == sorted(recent_ids, reverse=True)
    assert body["active_promotion_count"] == 2
    assert [item["slug"] for item in body["active_promotions"]] == ["active-two", "active-one"]

    inquiry_payload = body["recent_inquiries"][0]
    for forbidden in [
        "customer_name",
        "phone",
        "email",
        "message",
        "internal_notes",
        "consent_personal_data",
    ]:
        assert forbidden not in inquiry_payload
