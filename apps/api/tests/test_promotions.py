from __future__ import annotations

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

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


async def _dessert(client: AsyncClient, csrf: str) -> dict[str, object]:
    category = await client.post(
        "/api/admin/categories",
        json={"name": "Cakes", "slug": "cakes"},
        headers={"x-csrf-token": csrf},
    )
    assert category.status_code == 201
    dessert = await client.post(
        "/api/admin/desserts",
        json={"category_id": category.json()["id"], "name": "Honey Cake", "slug": "honey-cake"},
        headers={"x-csrf-token": csrf},
    )
    assert dessert.status_code == 201
    return dessert.json()


async def _promotion(
    client: AsyncClient,
    csrf: str,
    *,
    slug: str = "summer-special",
    title: str = "Summer Special",
    summary: str = "Fresh cakes",
    body: str = "Order a seasonal dessert.",
    is_published: bool = False,
    starts_at: str | None = None,
    ends_at: str | None = None,
    dessert_id: int | None = None,
    sort_order: int = 0,
) -> dict[str, object]:
    response = await client.post(
        "/api/admin/promotions",
        json={
            "slug": slug,
            "title": title,
            "summary": summary,
            "body": body,
            "is_published": is_published,
            "starts_at": starts_at,
            "ends_at": ends_at,
            "dessert_id": dessert_id,
            "sort_order": sort_order,
        },
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 201
    return response.json()


def _iso(delta: timedelta) -> str:
    return (datetime.now(UTC) + delta).isoformat()


async def test_promotion_validation_slug_conflict_auth_csrf_and_public_read_only(
    client: AsyncClient,
    db_session: AsyncSession,
    ) -> None:
    assert (await client.get("/api/admin/promotions")).status_code == 401
    await create_admin(db_session)
    assert (
        await client.post(
            "/api/admin/auth/login",
            json={"email": "admin@example.com", "password": "Password12345"},
        )
    ).status_code == 200
    assert (
        await client.post(
            "/api/admin/promotions",
            json={"slug": "sale", "title": "Sale"},
        )
    ).status_code == 403
    csrf = str((await client.get("/api/admin/auth/csrf")).json()["csrf_token"])

    created = await _promotion(client, csrf, slug=" Summer  Sale ", title=" Sale ")
    assert created["slug"] == "summer-sale"
    assert created["title"] == "Sale"

    duplicate = await client.post(
        "/api/admin/promotions",
        json={"slug": "summer-sale", "title": "Duplicate"},
        headers={"x-csrf-token": csrf},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Promotion slug already exists"

    for payload in [
        {"slug": "bad/slug", "title": "Bad"},
        {"slug": "blank", "title": "   "},
        {"slug": "window", "title": "Window", "starts_at": _iso(timedelta(days=1)), "ends_at": _iso(timedelta(days=-1))},
    ]:
        response = await client.post("/api/admin/promotions", json=payload, headers={"x-csrf-token": csrf})
        assert response.status_code == 422

    for field in ["slug", "title", "summary", "body", "is_published", "sort_order"]:
        response = await client.patch(
            f"/api/admin/promotions/{created['id']}",
            json={field: None},
            headers={"x-csrf-token": csrf},
        )
        assert response.status_code == 422

    assert (await client.post("/api/public/promotions", json={})).status_code == 405
    assert (await client.patch("/api/public/promotions/summer-sale", json={})).status_code == 405
    assert (await client.delete("/api/public/promotions/summer-sale")).status_code == 405


async def test_promotion_schedule_visibility_detail_payload_and_pagination(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    active = await _promotion(client, csrf, slug="active", is_published=True, sort_order=2)
    past_start = await _promotion(
        client,
        csrf,
        slug="past-start",
        is_published=True,
        starts_at=_iso(timedelta(days=-1)),
        sort_order=1,
    )
    window = await _promotion(
        client,
        csrf,
        slug="window",
        is_published=True,
        starts_at=_iso(timedelta(days=-1)),
        ends_at=_iso(timedelta(days=1)),
        sort_order=3,
    )
    future = await _promotion(client, csrf, slug="future", is_published=True, starts_at=_iso(timedelta(days=1)))
    expired = await _promotion(client, csrf, slug="expired", is_published=True, ends_at=_iso(timedelta(days=-1)))
    unpublished = await _promotion(client, csrf, slug="draft", is_published=False)
    archived = await _promotion(client, csrf, slug="archived", is_published=True)
    assert (
        await client.post(
            f"/api/admin/promotions/{archived['id']}/archive",
            headers={"x-csrf-token": csrf},
        )
    ).status_code == 200

    public = await client.get("/api/public/promotions?limit=2&offset=1")
    assert public.status_code == 200
    body = public.json()
    assert body["total"] == 3
    assert [item["slug"] for item in body["items"]] == ["active", "window"]
    assert "archived_at" not in body["items"][0]
    assert "created_at" not in body["items"][0]

    detail = await client.get("/api/public/promotions/active")
    assert detail.status_code == 200
    assert detail.json()["id"] == active["id"]
    for promo in [future, expired, unpublished, archived]:
        assert (await client.get(f"/api/public/promotions/{promo['slug']}")).status_code == 404
    assert (await client.get("/api/public/promotions/unknown")).status_code == 404
    assert past_start["slug"] == "past-start"
    assert window["slug"] == "window"


async def test_promotion_schedule_requires_timezone_and_normalizes_to_utc(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    naive_start = await client.post(
        "/api/admin/promotions",
        json={"slug": "naive-start", "title": "Naive Start", "starts_at": "2026-08-10T12:00:00"},
        headers={"x-csrf-token": csrf},
    )
    assert naive_start.status_code == 422
    naive_end = await client.post(
        "/api/admin/promotions",
        json={"slug": "naive-end", "title": "Naive End", "ends_at": "2026-08-10T12:00:00"},
        headers={"x-csrf-token": csrf},
    )
    assert naive_end.status_code == 422

    utc_z = await _promotion(
        client,
        csrf,
        slug="utc-z",
        starts_at="2026-08-10T12:00:00Z",
        ends_at="2026-08-11T12:00:00Z",
    )
    assert utc_z["starts_at"] == "2026-08-10T12:00:00Z"

    offset = await _promotion(
        client,
        csrf,
        slug="offset",
        starts_at="2026-08-10T12:00:00+03:00",
        ends_at="2026-08-11T12:00:00+03:00",
    )
    assert offset["starts_at"] == "2026-08-10T09:00:00Z"
    assert offset["ends_at"] == "2026-08-11T09:00:00Z"

    naive_patch = await client.patch(
        f"/api/admin/promotions/{offset['id']}",
        json={"starts_at": "2026-08-12T12:00:00"},
        headers={"x-csrf-token": csrf},
    )
    assert naive_patch.status_code == 422

    partial_window_rejected = await client.patch(
        f"/api/admin/promotions/{offset['id']}",
        json={"starts_at": "2026-08-12T09:00:00Z"},
        headers={"x-csrf-token": csrf},
    )
    assert partial_window_rejected.status_code == 422

    cleared = await client.patch(
        f"/api/admin/promotions/{offset['id']}",
        json={"starts_at": None, "ends_at": None},
        headers={"x-csrf-token": csrf},
    )
    assert cleared.status_code == 200
    assert cleared.json()["starts_at"] is None
    assert cleared.json()["ends_at"] is None


async def test_promotion_dessert_relation_reorder_publish_archive_and_archived_dessert(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    dessert = await _dessert(client, csrf)
    unknown = await client.post(
        "/api/admin/promotions",
        json={"slug": "bad-dessert", "title": "Bad", "dessert_id": 99999},
        headers={"x-csrf-token": csrf},
    )
    assert unknown.status_code == 404

    linked = await _promotion(client, csrf, slug="linked", dessert_id=int(dessert["id"]))
    other = await _promotion(client, csrf, slug="other")
    assert linked["dessert"]["slug"] == "honey-cake"

    assert (
        await client.post(
            f"/api/admin/promotions/{linked['id']}/publish",
            headers={"x-csrf-token": csrf},
        )
    ).json()["is_published"] is True
    assert (
        await client.post(
            f"/api/admin/promotions/{linked['id']}/unpublish",
            headers={"x-csrf-token": csrf},
        )
    ).json()["is_published"] is False

    reordered = await client.post(
        "/api/admin/promotions/reorder",
        json=[{"id": other["id"], "sort_order": 0}, {"id": linked["id"], "sort_order": 1}],
        headers={"x-csrf-token": csrf},
    )
    assert reordered.status_code == 200
    assert [item["id"] for item in reordered.json()[:2]] == [other["id"], linked["id"]]

    duplicate = await client.post(
        "/api/admin/promotions/reorder",
        json=[{"id": linked["id"], "sort_order": 0}, {"id": linked["id"], "sort_order": 1}],
        headers={"x-csrf-token": csrf},
    )
    assert duplicate.status_code == 422

    await client.post(f"/api/admin/desserts/{dessert['id']}/archive", headers={"x-csrf-token": csrf})
    published = await client.post(
        f"/api/admin/promotions/{linked['id']}/publish",
        headers={"x-csrf-token": csrf},
    )
    assert published.status_code == 200
    detail = await client.get("/api/public/promotions/linked")
    assert detail.status_code == 200
    assert detail.json()["dessert"]["slug"] == "honey-cake"

    archived = await client.post(
        f"/api/admin/promotions/{linked['id']}/archive",
        headers={"x-csrf-token": csrf},
    )
    assert archived.status_code == 200
    assert archived.json()["archived_at"] is not None
    assert archived.json()["is_published"] is False
