from __future__ import annotations

from pathlib import Path

from httpx import AsyncClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.categories.models import Category
from app.categories.schemas import CategoryCreate, CategoryUpdate
from app.categories.services import _map_category_integrity_error
from app.core.config import Settings, get_settings
from app.desserts.models import Dessert, DessertVariant
from app.desserts.schemas import DessertCreate, DessertUpdate, DessertVariantUpdate
from app.desserts.services import _map_catalog_integrity_error
from tests.conftest import create_admin

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPEG_BYTES = b"\xff\xd8\xff" + b"\x00" * 32
SVG_BYTES = b"<svg xmlns='http://www.w3.org/2000/svg'></svg>"


class _FakeOrig:
    def __init__(self, message: str) -> None:
        self.message = message
        self.sqlstate = "23505"

    def __str__(self) -> str:
        return self.message


def _integrity_error(message: str) -> IntegrityError:
    return IntegrityError("statement", {}, _FakeOrig(message))


async def _login(client: AsyncClient, db: AsyncSession) -> str:
    await create_admin(db)
    response = await client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "Password12345"},
    )
    assert response.status_code == 200
    csrf = await client.get("/api/admin/auth/csrf")
    return csrf.json()["csrf_token"]


async def _category(client: AsyncClient, csrf: str, slug: str = "cakes") -> dict[str, object]:
    response = await client.post(
        "/api/admin/categories",
        json={"name": " Cakes ", "slug": slug, "description": "Layered"},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 201
    return response.json()


async def _dessert(
    client: AsyncClient,
    csrf: str,
    category_id: int,
    slug: str = "honey-cake",
    published: bool = True,
) -> dict[str, object]:
    response = await client.post(
        "/api/admin/desserts",
        json={
            "category_id": category_id,
            "name": "Honey cake",
            "slug": slug,
            "short_description": "Soft layers",
            "is_published": published,
            "is_popular": True,
        },
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 201
    return response.json()


async def _draft(client: AsyncClient, csrf: str, category_id: int, slug: str) -> dict[str, object]:
    return await _dessert(client, csrf, category_id, slug=slug, published=False)


async def _variant(client: AsyncClient, csrf: str, dessert_id: int) -> dict[str, object]:
    response = await client.post(
        f"/api/admin/desserts/{dessert_id}/variants",
        json={"weight_value": "1.00", "weight_unit": "kg", "price": 2500, "old_price": 3000},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 201
    return response.json()["variants"][0]


async def test_admin_catalog_requires_auth_and_csrf(client: AsyncClient, db_session: AsyncSession) -> None:
    unauthenticated = await client.get("/api/admin/categories")
    assert unauthenticated.status_code == 401
    await create_admin(db_session)
    assert (await client.post("/api/admin/auth/login", json={"email": "admin@example.com", "password": "Password12345"})).status_code == 200
    missing_csrf = await client.post("/api/admin/categories", json={"name": "Cakes", "slug": "cakes"})
    assert missing_csrf.status_code == 403


async def test_public_catalog_filters_hidden_unpublished_and_archived_data(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    dessert = await _draft(client, csrf, int(category["id"]), "honey-cake")
    await _variant(client, csrf, int(dessert["id"]))
    await client.patch(
        f"/api/admin/desserts/{dessert['id']}",
        json={"is_published": True},
        headers={"x-csrf-token": csrf},
    )

    hidden_category = await _category(client, csrf, "hidden")
    hidden = await _draft(client, csrf, int(hidden_category["id"]), "hidden-cake")
    await _variant(client, csrf, int(hidden["id"]))
    await client.patch(
        f"/api/admin/desserts/{hidden['id']}",
        json={"is_published": True},
        headers={"x-csrf-token": csrf},
    )
    await client.patch(
        f"/api/admin/categories/{hidden_category['id']}",
        json={"is_visible": False},
        headers={"x-csrf-token": csrf},
    )

    unpublished = await _dessert(client, csrf, int(category["id"]), "draft", published=False)
    await _variant(client, csrf, int(unpublished["id"]))

    response = await client.get("/api/public/catalog")
    assert response.status_code == 200
    slugs = [item["slug"] for item in response.json()["items"]]
    assert slugs == ["honey-cake"]
    assert (await client.get("/api/public/desserts/draft")).status_code == 404
    assert (await client.get("/api/public/desserts/hidden-cake")).status_code == 404


async def test_category_archive_rejects_active_desserts(client: AsyncClient, db_session: AsyncSession) -> None:
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    await _dessert(client, csrf, int(category["id"]), published=False)
    response = await client.post(
        f"/api/admin/categories/{category['id']}/archive",
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 409


async def test_variant_validation_and_active_uniqueness(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    dessert = await _draft(client, csrf, int(category["id"]), "honey-cake")
    invalid = await client.post(
        f"/api/admin/desserts/{dessert['id']}/variants",
        json={"weight_value": "0", "weight_unit": "kg", "price": 2500},
        headers={"x-csrf-token": csrf},
    )
    assert invalid.status_code == 422
    await _variant(client, csrf, int(dessert["id"]))
    duplicate = await client.post(
        f"/api/admin/desserts/{dessert['id']}/variants",
        json={"weight_value": "1.00", "weight_unit": "kg", "price": 2600},
        headers={"x-csrf-token": csrf},
    )
    assert duplicate.status_code == 409


async def test_image_lifecycle_uses_safe_public_url_and_primary_switching(
    client: AsyncClient,
    db_session: AsyncSession,
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("MEDIA_ROOT", str(tmp_path))
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    dessert = await _draft(client, csrf, int(category["id"]), "honey-cake")
    await _variant(client, csrf, int(dessert["id"]))
    await client.patch(
        f"/api/admin/desserts/{dessert['id']}",
        json={"is_published": True},
        headers={"x-csrf-token": csrf},
    )

    first = await client.post(
        f"/api/admin/desserts/{dessert['id']}/images",
        files={"file": ("first.png", PNG_BYTES, "image/png")},
        data={"alt_text": "First", "is_primary": "true"},
        headers={"x-csrf-token": csrf},
    )
    assert first.status_code == 201
    second = await client.post(
        f"/api/admin/desserts/{dessert['id']}/images",
        files={"file": ("../second.png", PNG_BYTES, "image/png")},
        data={"alt_text": "Second", "is_primary": "true"},
        headers={"x-csrf-token": csrf},
    )
    assert second.status_code == 201
    images = second.json()["images"]
    assert sum(1 for image in images if image["is_primary"]) == 1
    assert images[1]["original_filename"] == "second.png"

    detail = await client.get("/api/public/desserts/honey-cake")
    assert detail.status_code == 200
    image = detail.json()["primary_image"]
    assert image["url"].startswith("/api/media/desserts/")
    assert str(tmp_path) not in image["url"]

    deleted = await client.delete(
        f"/api/admin/desserts/{dessert['id']}/images/{images[1]['id']}",
        headers={"x-csrf-token": csrf},
    )
    assert deleted.status_code == 200
    assert sum(1 for image in deleted.json()["images"] if image["is_primary"]) == 1


async def test_public_catalog_total_and_pagination_ignore_variantless_desserts(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    for index in range(4):
        draft = await _draft(client, csrf, int(category["id"]), f"cake-{index}")
        if index != 1:
            await _variant(client, csrf, int(draft["id"]))
        if index != 1:
            response = await client.patch(
                f"/api/admin/desserts/{draft['id']}",
                json={"is_published": True, "sort_order": index},
                headers={"x-csrf-token": csrf},
            )
            assert response.status_code == 200

    page = await client.get("/api/public/catalog?limit=2&offset=1")
    assert page.status_code == 200
    body = page.json()
    assert body["total"] == 3
    assert [item["slug"] for item in body["items"]] == ["cake-2", "cake-3"]


async def test_publish_requires_active_variant_and_last_variant_archive_is_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    create_published = await client.post(
        "/api/admin/desserts",
        json={
            "category_id": category["id"],
            "name": "No Variant",
            "slug": "no-variant",
            "is_published": True,
        },
        headers={"x-csrf-token": csrf},
    )
    assert create_published.status_code == 422
    dessert = await _draft(client, csrf, int(category["id"]), "draft")
    publish_without_variant = await client.patch(
        f"/api/admin/desserts/{dessert['id']}",
        json={"is_published": True},
        headers={"x-csrf-token": csrf},
    )
    assert publish_without_variant.status_code == 422
    variant = await _variant(client, csrf, int(dessert["id"]))
    assert (
        await client.patch(
            f"/api/admin/desserts/{dessert['id']}",
            json={"is_published": True},
            headers={"x-csrf-token": csrf},
        )
    ).status_code == 200
    archive_last = await client.post(
        f"/api/admin/desserts/{dessert['id']}/variants/{variant['id']}/archive",
        headers={"x-csrf-token": csrf},
    )
    assert archive_last.status_code == 409


async def test_reorder_desserts_variants_and_images(
    client: AsyncClient,
    db_session: AsyncSession,
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("MEDIA_ROOT", str(tmp_path))
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    first = await _draft(client, csrf, int(category["id"]), "first")
    second = await _draft(client, csrf, int(category["id"]), "second")
    reordered = await client.post(
        "/api/admin/desserts/reorder",
        json=[{"id": second["id"], "sort_order": 0}, {"id": first["id"], "sort_order": 1}],
        headers={"x-csrf-token": csrf},
    )
    assert reordered.status_code == 200
    assert [item["slug"] for item in reordered.json()[:2]] == ["second", "first"]
    duplicate = await client.post(
        "/api/admin/desserts/reorder",
        json=[{"id": second["id"], "sort_order": 0}, {"id": second["id"], "sort_order": 1}],
        headers={"x-csrf-token": csrf},
    )
    assert duplicate.status_code == 422

    await _variant(client, csrf, int(first["id"]))
    variant_two = await client.post(
        f"/api/admin/desserts/{first['id']}/variants",
        json={"weight_value": "2.00", "weight_unit": "kg", "price": 4500},
        headers={"x-csrf-token": csrf},
    )
    assert variant_two.status_code == 201
    variants = variant_two.json()["variants"]
    variant_order = await client.post(
        f"/api/admin/desserts/{first['id']}/variants/reorder",
        json=[{"id": variants[1]["id"], "sort_order": 0}, {"id": variants[0]["id"], "sort_order": 1}],
        headers={"x-csrf-token": csrf},
    )
    assert variant_order.status_code == 200
    assert [item["id"] for item in variant_order.json()["variants"]] == [variants[1]["id"], variants[0]["id"]]

    image_one = await client.post(
        f"/api/admin/desserts/{first['id']}/images",
        files={"file": ("one.png", PNG_BYTES, "image/png")},
        headers={"x-csrf-token": csrf},
    )
    image_two = await client.post(
        f"/api/admin/desserts/{first['id']}/images",
        files={"file": ("two.jpg", JPEG_BYTES, "image/jpeg")},
        headers={"x-csrf-token": csrf},
    )
    images = image_two.json()["images"]
    image_order = await client.post(
        f"/api/admin/desserts/{first['id']}/images/reorder",
        json=[{"id": images[1]["id"], "sort_order": 0}, {"id": images[0]["id"], "sort_order": 1}],
        headers={"x-csrf-token": csrf},
    )
    assert image_one.status_code == 201
    assert image_two.status_code == 201
    assert image_order.status_code == 200
    assert [item["id"] for item in image_order.json()["images"]] == [images[1]["id"], images[0]["id"]]


async def test_primary_switching_both_directions_keeps_exactly_one_primary(
    client: AsyncClient,
    db_session: AsyncSession,
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("MEDIA_ROOT", str(tmp_path))
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    dessert = await _draft(client, csrf, int(category["id"]), "primary")
    first = await client.post(
        f"/api/admin/desserts/{dessert['id']}/images",
        files={"file": ("one.png", PNG_BYTES, "image/png")},
        headers={"x-csrf-token": csrf},
    )
    second = await client.post(
        f"/api/admin/desserts/{dessert['id']}/images",
        files={"file": ("two.jpg", JPEG_BYTES, "image/jpeg")},
        headers={"x-csrf-token": csrf},
    )
    first_id = first.json()["images"][0]["id"]
    second_id = second.json()["images"][1]["id"]
    for image_id in [second_id, first_id]:
        switched = await client.post(
            f"/api/admin/desserts/{dessert['id']}/images/{image_id}/primary",
            headers={"x-csrf-token": csrf},
        )
        assert switched.status_code == 200
        images = switched.json()["images"]
        assert sum(1 for image in images if image["is_primary"]) == 1
        assert next(image for image in images if image["is_primary"])["id"] == image_id


async def test_archived_parent_and_cross_dessert_nested_mutations_are_rejected(
    client: AsyncClient,
    db_session: AsyncSession,
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("MEDIA_ROOT", str(tmp_path))
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    dessert = await _draft(client, csrf, int(category["id"]), "archived")
    other = await _draft(client, csrf, int(category["id"]), "other")
    variant = await _variant(client, csrf, int(dessert["id"]))
    image = await client.post(
        f"/api/admin/desserts/{dessert['id']}/images",
        files={"file": ("one.png", PNG_BYTES, "image/png")},
        headers={"x-csrf-token": csrf},
    )
    image_id = image.json()["images"][0]["id"]
    assert (
        await client.patch(
            f"/api/admin/desserts/{other['id']}/variants/{variant['id']}",
            json={"price": 100},
            headers={"x-csrf-token": csrf},
        )
    ).status_code == 404
    assert (
        await client.post(
            f"/api/admin/desserts/{other['id']}/images/{image_id}/primary",
            headers={"x-csrf-token": csrf},
        )
    ).status_code == 404
    assert (
        await client.post(f"/api/admin/desserts/{dessert['id']}/archive", headers={"x-csrf-token": csrf})
    ).status_code == 200
    assert (
        await client.post(
            f"/api/admin/desserts/{dessert['id']}/variants",
            json={"weight_value": "2.00", "weight_unit": "kg", "price": 100},
            headers={"x-csrf-token": csrf},
        )
    ).status_code == 409
    assert (
        await client.post(
            f"/api/admin/desserts/{dessert['id']}/images/{image_id}/primary",
            headers={"x-csrf-token": csrf},
        )
    ).status_code == 409


async def test_media_security_rejects_bad_inputs_and_cleans_failed_db_write(
    client: AsyncClient,
    db_session: AsyncSession,
    tmp_path: Path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("MEDIA_ROOT", str(tmp_path))
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    dessert = await _draft(client, csrf, int(category["id"]), "media")

    original_override = client._transport.app.dependency_overrides.get(get_settings)
    client._transport.app.dependency_overrides[get_settings] = lambda: Settings(
        media_root=str(tmp_path),
        max_upload_bytes=16,
    )
    try:
        oversize = await client.post(
            f"/api/admin/desserts/{dessert['id']}/images",
            files={"file": ("big.png", PNG_BYTES, "image/png")},
            headers={"x-csrf-token": csrf},
        )
        assert oversize.status_code == 413
    finally:
        if original_override is None:
            client._transport.app.dependency_overrides.pop(get_settings, None)
        else:
            client._transport.app.dependency_overrides[get_settings] = original_override
    invalid_mime = await client.post(
        f"/api/admin/desserts/{dessert['id']}/images",
        files={"file": ("bad.gif", b"GIF89a", "image/gif")},
        headers={"x-csrf-token": csrf},
    )
    mismatch = await client.post(
        f"/api/admin/desserts/{dessert['id']}/images",
        files={"file": ("bad.png", JPEG_BYTES, "image/png")},
        headers={"x-csrf-token": csrf},
    )
    svg = await client.post(
        f"/api/admin/desserts/{dessert['id']}/images",
        files={"file": ("bad.svg", SVG_BYTES, "image/svg+xml")},
        headers={"x-csrf-token": csrf},
    )
    assert invalid_mime.status_code == 400
    assert mismatch.status_code == 400
    assert svg.status_code == 400
    assert not list(tmp_path.rglob("*.*"))


async def test_db_constraints_protect_core_catalog_invariants(db_session: AsyncSession) -> None:
    category = Category(name="Cakes", slug="cakes")
    db_session.add(category)
    await db_session.commit()
    category_id = category.id
    dessert = Dessert(category_id=category_id, name="Cake", slug="cake")
    db_session.add(dessert)
    await db_session.commit()
    dessert_id = dessert.id

    db_session.add(DessertVariant(dessert_id=dessert_id, weight_value=-1, weight_unit="kg", price=100))
    try:
        await db_session.commit()
    except IntegrityError:
        await db_session.rollback()
    else:
        raise AssertionError("negative weight was accepted")

    db_session.add(DessertVariant(dessert_id=dessert_id, weight_value=1, weight_unit="kg", price=100, old_price=50))
    try:
        await db_session.commit()
    except IntegrityError:
        await db_session.rollback()
    else:
        raise AssertionError("old_price below price was accepted")


async def test_patch_explicit_null_validation(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    dessert = await _draft(client, csrf, int(category["id"]), "nullable")
    variant = await _variant(client, csrf, int(dessert["id"]))

    for field in ["name", "slug", "description", "sort_order", "is_visible"]:
        response = await client.patch(
            f"/api/admin/categories/{category['id']}",
            json={field: None},
            headers={"x-csrf-token": csrf},
        )
        assert response.status_code == 422

    for field in [
        "category_id",
        "name",
        "slug",
        "short_description",
        "full_description",
        "ingredients",
        "allergens",
        "warnings",
        "preparation_time_text",
        "is_published",
        "is_available",
        "is_sugar_free",
        "is_gluten_free",
        "is_low_calorie",
        "is_bento",
        "is_new",
        "is_popular",
        "is_seasonal",
        "sort_order",
    ]:
        response = await client.patch(
            f"/api/admin/desserts/{dessert['id']}",
            json={field: None},
            headers={"x-csrf-token": csrf},
        )
        assert response.status_code == 422

    clear_nutrition = await client.patch(
        f"/api/admin/desserts/{dessert['id']}",
        json={"calories": None, "proteins": None, "fats": None, "carbohydrates": None},
        headers={"x-csrf-token": csrf},
    )
    assert clear_nutrition.status_code == 200

    for field in ["weight_value", "weight_unit", "price", "is_available", "sort_order"]:
        response = await client.patch(
            f"/api/admin/desserts/{dessert['id']}/variants/{variant['id']}",
            json={field: None},
            headers={"x-csrf-token": csrf},
        )
        assert response.status_code == 422
    clear_old_price = await client.patch(
        f"/api/admin/desserts/{dessert['id']}/variants/{variant['id']}",
        json={"old_price": None},
        headers={"x-csrf-token": csrf},
    )
    assert clear_old_price.status_code == 200
    assert clear_old_price.json()["variants"][0]["old_price"] is None


def test_required_strings_and_slug_validation() -> None:
    for schema, payload in [
        (CategoryCreate, {"name": "   ", "slug": "cakes"}),
        (DessertCreate, {"category_id": 1, "name": "   ", "slug": "cake"}),
        (CategoryUpdate, {"name": "   "}),
        (DessertUpdate, {"name": "   "}),
    ]:
        try:
            schema.model_validate(payload)
        except ValueError:
            pass
        else:
            raise AssertionError(f"{schema.__name__} accepted blank name")

    assert CategoryCreate(name="Cakes", slug=" Layer Cake ").slug == "layer-cake"
    assert CategoryCreate(name="Cakes", slug="Layer   Cake").slug == "layer-cake"
    assert DessertCreate(category_id=1, name="Cake", slug="BENTO CAKE").slug == "bento-cake"
    assert DessertUpdate(slug="  Sugar   Free  ").slug == "sugar-free"

    for slug in ["?", "#", "%", "cake/box", "cake\\box", "cake.box", "cake_box", "   "]:
        for schema, payload in [
            (CategoryCreate, {"name": "Cakes", "slug": slug}),
            (DessertCreate, {"category_id": 1, "name": "Cake", "slug": slug}),
            (CategoryUpdate, {"slug": slug}),
            (DessertUpdate, {"slug": slug}),
        ]:
            try:
                schema.model_validate(payload)
            except ValueError:
                pass
            else:
                raise AssertionError(f"{schema.__name__} accepted invalid slug {slug!r}")

    assert CategoryCreate(name="Cakes", slug="cake---box").slug == "cake-box"


def test_update_schema_null_policy_directly() -> None:
    assert DessertUpdate(calories=None).calories is None
    assert DessertVariantUpdate(old_price=None).old_price is None
    for schema, payload in [
        (CategoryUpdate, {"sort_order": None}),
        (DessertUpdate, {"sort_order": None}),
        (DessertVariantUpdate, {"price": None}),
    ]:
        try:
            schema.model_validate(payload)
        except ValueError:
            pass
        else:
            raise AssertionError(f"{schema.__name__} accepted explicit null")


async def test_duplicate_slug_and_variant_conflicts_are_specific(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    category = await _category(client, csrf)
    duplicate_category = await client.post(
        "/api/admin/categories",
        json={"name": "Other", "slug": "cakes"},
        headers={"x-csrf-token": csrf},
    )
    assert duplicate_category.status_code == 409
    assert duplicate_category.json()["detail"] == "Category slug already exists"

    first = await _draft(client, csrf, int(category["id"]), "duplicate")
    duplicate_dessert = await client.post(
        "/api/admin/desserts",
        json={"category_id": category["id"], "name": "Other", "slug": "duplicate"},
        headers={"x-csrf-token": csrf},
    )
    assert duplicate_dessert.status_code == 409
    assert duplicate_dessert.json()["detail"] == "Dessert slug already exists"

    await _variant(client, csrf, int(first["id"]))
    duplicate_variant = await client.post(
        f"/api/admin/desserts/{first['id']}/variants",
        json={"weight_value": "1.00", "weight_unit": "kg", "price": 2600},
        headers={"x-csrf-token": csrf},
    )
    assert duplicate_variant.status_code == 409
    assert duplicate_variant.json()["detail"] == "Variant already exists"


def test_unknown_integrity_conflict_uses_neutral_message() -> None:
    category_error = _map_category_integrity_error(_integrity_error("some_other_constraint"))
    dessert_error = _map_catalog_integrity_error(_integrity_error("some_other_constraint"))
    assert category_error.status_code == 409
    assert category_error.detail == "Catalog integrity conflict"
    assert dessert_error.status_code == 409
    assert dessert_error.detail == "Catalog integrity conflict"
