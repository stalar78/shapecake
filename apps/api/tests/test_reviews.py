from __future__ import annotations

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


async def _category(client: AsyncClient, csrf: str) -> dict[str, object]:
    response = await client.post(
        "/api/admin/categories",
        json={"name": "Cakes", "slug": "cakes"},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 201
    return response.json()


async def _dessert(client: AsyncClient, csrf: str) -> dict[str, object]:
    category = await _category(client, csrf)
    response = await client.post(
        "/api/admin/desserts",
        json={"category_id": category["id"], "name": "Honey Cake", "slug": "honey-cake"},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 201
    return response.json()


async def _review(
    client: AsyncClient,
    csrf: str,
    *,
    author_name: str = " Ada ",
    text: str = " Loved it ",
    rating: int = 5,
    is_published: bool = False,
    is_featured: bool = False,
    dessert_id: int | None = None,
    sort_order: int = 0,
) -> dict[str, object]:
    response = await client.post(
        "/api/admin/reviews",
        json={
            "author_name": author_name,
            "text": text,
            "rating": rating,
            "is_published": is_published,
            "is_featured": is_featured,
            "dessert_id": dessert_id,
            "sort_order": sort_order,
        },
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 201
    return response.json()


async def test_review_validation_auth_csrf_and_public_read_only(
    client: AsyncClient,
    db_session: AsyncSession,
    ) -> None:
    assert (await client.get("/api/admin/reviews")).status_code == 401
    await create_admin(db_session)
    login = await client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "Password12345"},
    )
    assert login.status_code == 200
    assert (
        await client.post(
            "/api/admin/reviews",
            json={"author_name": "Ada", "text": "Nice", "rating": 5},
        )
    ).status_code == 403
    csrf_token = str((await client.get("/api/admin/auth/csrf")).json()["csrf_token"])

    for payload in [
        {"author_name": "   ", "text": "Nice", "rating": 5},
        {"author_name": "Ada", "text": "   ", "rating": 5},
        {"author_name": "Ada", "text": "Nice", "rating": 0},
        {"author_name": "Ada", "text": "Nice", "rating": 6},
    ]:
        response = await client.post(
            "/api/admin/reviews",
            json=payload,
            headers={"x-csrf-token": csrf_token},
        )
        assert response.status_code == 422

    created = await _review(client, csrf_token, rating=1)
    assert created["author_name"] == "Ada"
    assert created["text"] == "Loved it"
    assert created["rating"] == 1

    assert (await client.post("/api/public/reviews", json={})).status_code == 405
    assert (await client.patch("/api/public/reviews", json={})).status_code == 405
    assert (await client.delete("/api/public/reviews")).status_code == 405


async def test_review_dessert_relation_visibility_filters_and_payload(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    dessert = await _dessert(client, csrf)
    unknown = await client.post(
        "/api/admin/reviews",
        json={"author_name": "Ada", "text": "Nice", "rating": 5, "dessert_id": 99999},
        headers={"x-csrf-token": csrf},
    )
    assert unknown.status_code == 404

    hidden = await _review(client, csrf, author_name="Hidden", is_published=False)
    first = await _review(
        client,
        csrf,
        author_name="First",
        is_published=True,
        is_featured=True,
        dessert_id=int(dessert["id"]),
        sort_order=2,
    )
    await _review(client, csrf, author_name="Second", is_published=True, sort_order=1)
    archived = await _review(client, csrf, author_name="Archived", is_published=True)
    assert (
        await client.post(
            f"/api/admin/reviews/{archived['id']}/archive",
            headers={"x-csrf-token": csrf},
        )
    ).status_code == 200

    public = await client.get("/api/public/reviews")
    assert public.status_code == 200
    body = public.json()
    assert body["total"] == 2
    assert [item["author_name"] for item in body["items"]] == ["Second", "First"]
    assert "archived_at" not in body["items"][0]
    assert "created_at" not in body["items"][0]
    assert {item["author_name"] for item in body["items"]}.isdisjoint({"Hidden", "Archived"})

    featured = await client.get("/api/public/reviews?featured=true")
    assert featured.status_code == 200
    assert [item["id"] for item in featured.json()["items"]] == [first["id"]]

    linked = await client.get(f"/api/public/reviews?dessert_id={dessert['id']}")
    assert linked.status_code == 200
    assert linked.json()["items"][0]["dessert"]["slug"] == "honey-cake"

    paged = await client.get("/api/public/reviews?limit=1&offset=1")
    assert paged.status_code == 200
    assert paged.json()["total"] == 2
    assert [item["id"] for item in paged.json()["items"]] == [first["id"]]

    assert hidden["is_published"] is False


async def test_review_publish_feature_reorder_archive_and_patch_nulls(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    first = await _review(client, csrf, author_name="One", rating=5)
    second = await _review(client, csrf, author_name="Two", rating=5)

    for field in ["author_name", "rating", "text", "is_published", "is_featured", "sort_order"]:
        response = await client.patch(
            f"/api/admin/reviews/{first['id']}",
            json={field: None},
            headers={"x-csrf-token": csrf},
        )
        assert response.status_code == 422

    assert (
        await client.post(
            f"/api/admin/reviews/{first['id']}/publish",
            headers={"x-csrf-token": csrf},
        )
    ).json()["is_published"] is True
    assert (
        await client.post(
            f"/api/admin/reviews/{first['id']}/feature",
            headers={"x-csrf-token": csrf},
        )
    ).json()["is_featured"] is True
    assert (
        await client.post(
            f"/api/admin/reviews/{first['id']}/unfeature",
            headers={"x-csrf-token": csrf},
        )
    ).json()["is_featured"] is False
    assert (
        await client.post(
            f"/api/admin/reviews/{first['id']}/unpublish",
            headers={"x-csrf-token": csrf},
        )
    ).json()["is_published"] is False

    reordered = await client.post(
        "/api/admin/reviews/reorder",
        json=[{"id": second["id"], "sort_order": 0}, {"id": first["id"], "sort_order": 1}],
        headers={"x-csrf-token": csrf},
    )
    assert reordered.status_code == 200
    assert [item["id"] for item in reordered.json()[:2]] == [second["id"], first["id"]]
    duplicate = await client.post(
        "/api/admin/reviews/reorder",
        json=[{"id": first["id"], "sort_order": 0}, {"id": first["id"], "sort_order": 1}],
        headers={"x-csrf-token": csrf},
    )
    assert duplicate.status_code == 422

    archived = await client.post(
        f"/api/admin/reviews/{first['id']}/archive",
        headers={"x-csrf-token": csrf},
    )
    assert archived.status_code == 200
    assert archived.json()["archived_at"] is not None
    assert archived.json()["is_published"] is False
