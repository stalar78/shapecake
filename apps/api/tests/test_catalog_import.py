from __future__ import annotations

from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog_import import (
    CATALOG,
    CATEGORY_SLUG,
    import_initial_catalog,
    recover_initial_catalog_media,
)
from app.categories.models import Category
from app.core.config import Settings
from app.desserts.models import Dessert, DessertImage, DessertVariant

PNG_BYTES = b"\x89PNG\r\n\x1a\nstage10-test-png"


def _settings(media_root: Path) -> Settings:
    return Settings(media_root=str(media_root), media_public_base_url="/api/media")


def _write_assets(root: Path, *, missing_cover_slug: str | None = None) -> None:
    for spec in CATALOG:
        folder = root / spec.slug
        folder.mkdir(parents=True, exist_ok=True)
        if spec.slug != missing_cover_slug:
            (folder / f"{spec.slug}-cover.png").write_bytes(PNG_BYTES)
        if spec.slug != "krasnyy-barkhat":
            (folder / f"{spec.slug}-detail.png").write_bytes(PNG_BYTES)


async def test_dry_run_performs_no_db_writes(
    db_session: AsyncSession,
    tmp_path: Path,
) -> None:
    assets = tmp_path / "assets"
    _write_assets(assets)

    summary = await import_initial_catalog(
        db_session,
        assets_root=assets,
        settings=_settings(tmp_path / "media"),
        dry_run=True,
    )

    assert summary.ok
    assert len(summary.created) == len(CATALOG)
    assert await db_session.scalar(select(func.count()).select_from(Dessert)) == 0
    assert await db_session.scalar(select(func.count()).select_from(Category).where(Category.slug == CATEGORY_SLUG)) == 0


async def test_first_run_creates_expected_unpublished_catalog_and_images(
    db_session: AsyncSession,
    tmp_path: Path,
) -> None:
    assets = tmp_path / "assets"
    media = tmp_path / "media"
    _write_assets(assets)

    summary = await import_initial_catalog(
        db_session,
        assets_root=assets,
        settings=_settings(media),
    )

    assert summary.ok
    assert len(summary.created) == len(CATALOG)
    desserts = (await db_session.scalars(select(Dessert).order_by(Dessert.slug))).all()
    assert len(desserts) == len(CATALOG)
    assert {dessert.slug for dessert in desserts} == {spec.slug for spec in CATALOG}
    assert all(not dessert.is_published for dessert in desserts)
    assert all(dessert.is_available for dessert in desserts)
    assert all(not dessert.is_sugar_free for dessert in desserts)
    assert all(dessert.allergens == "" for dessert in desserts)
    assert all(dessert.preparation_time_text == "" for dessert in desserts)

    bounty = await db_session.scalar(select(Dessert).where(Dessert.slug == "shokoladno-kokosovyy-bounty"))
    assert bounty is not None
    variants = (
        await db_session.scalars(
            select(DessertVariant)
            .where(DessertVariant.dessert_id == bounty.id)
            .order_by(DessertVariant.sort_order)
        )
    ).all()
    assert [(str(item.weight_value.normalize()), item.weight_unit, item.price) for item in variants] == [
        ("1.2", "kg", 280000),
        ("1.6", "kg", 350000),
    ]

    vishnya = await db_session.scalar(select(Dessert).where(Dessert.slug == "vishnya-apelsin"))
    assert vishnya is not None
    variant = await db_session.scalar(select(DessertVariant).where(DessertVariant.dessert_id == vishnya.id))
    assert variant is not None
    assert variant.price == 250000

    images = (
        await db_session.scalars(
            select(DessertImage).where(DessertImage.dessert_id == bounty.id).order_by(DessertImage.sort_order)
        )
    ).all()
    assert [(image.is_primary, image.sort_order, image.alt_text) for image in images] == [
        (True, 0, "Шоколадно-кокосовый баунти — общий вид"),
        (False, 1, "Шоколадно-кокосовый баунти — разрез"),
    ]
    assert all((media / image.storage_key).exists() for image in images)

    red_velvet = await db_session.scalar(select(Dessert).where(Dessert.slug == "krasnyy-barkhat"))
    assert red_velvet is not None
    red_velvet_images = (
        await db_session.scalars(select(DessertImage).where(DessertImage.dessert_id == red_velvet.id))
    ).all()
    assert len(red_velvet_images) == 1
    assert red_velvet_images[0].is_primary is True


async def test_repeated_run_skips_existing_without_duplicates_or_category_duplication(
    db_session: AsyncSession,
    tmp_path: Path,
) -> None:
    assets = tmp_path / "assets"
    _write_assets(assets)
    settings = _settings(tmp_path / "media")

    first = await import_initial_catalog(db_session, assets_root=assets, settings=settings)
    second = await import_initial_catalog(db_session, assets_root=assets, settings=settings)

    assert first.ok
    assert second.ok
    assert second.created == []
    assert set(second.skipped) == {spec.slug for spec in CATALOG}
    assert await db_session.scalar(select(func.count()).select_from(Dessert)) == len(CATALOG)
    assert await db_session.scalar(select(func.count()).select_from(Category).where(Category.slug == CATEGORY_SLUG)) == 1


async def test_missing_cover_warns_but_imports_unpublished_product(
    db_session: AsyncSession,
    tmp_path: Path,
) -> None:
    assets = tmp_path / "assets"
    _write_assets(assets, missing_cover_slug="medovik")

    summary = await import_initial_catalog(
        db_session,
        assets_root=assets,
        settings=_settings(tmp_path / "media"),
    )

    assert summary.ok
    assert any("medovik: missing cover image" in warning for warning in summary.warnings)
    medovik = await db_session.scalar(select(Dessert).where(Dessert.slug == "medovik"))
    assert medovik is not None
    assert medovik.is_published is False
    images = (
        await db_session.scalars(
            select(DessertImage).where(DessertImage.dessert_id == medovik.id).order_by(DessertImage.sort_order)
        )
    ).all()
    assert len(images) == 1
    assert images[0].is_primary is False
    assert images[0].sort_order == 1


async def test_no_unrelated_records_are_modified(
    db_session: AsyncSession,
    tmp_path: Path,
) -> None:
    unrelated_category = Category(name="Existing", slug="existing", description="keep", sort_order=77)
    db_session.add(unrelated_category)
    await db_session.flush()
    unrelated = Dessert(
        category_id=unrelated_category.id,
        name="Keep Me",
        slug="keep-me",
        ingredients="original",
        is_published=True,
        is_available=False,
        sort_order=33,
    )
    db_session.add(unrelated)
    await db_session.commit()

    assets = tmp_path / "assets"
    _write_assets(assets)
    summary = await import_initial_catalog(
        db_session,
        assets_root=assets,
        settings=_settings(tmp_path / "media"),
    )

    assert summary.ok
    await db_session.refresh(unrelated)
    assert unrelated.name == "Keep Me"
    assert unrelated.ingredients == "original"
    assert unrelated.is_published is True
    assert unrelated.is_available is False
    assert unrelated.sort_order == 33


async def test_recovery_restores_missing_physical_file_without_duplicate_rows(
    db_session: AsyncSession,
    tmp_path: Path,
) -> None:
    assets = tmp_path / "assets"
    media = tmp_path / "media"
    settings = _settings(media)
    _write_assets(assets)

    initial = await import_initial_catalog(db_session, assets_root=assets, settings=settings)
    assert initial.ok

    dessert = await db_session.scalar(select(Dessert).where(Dessert.slug == "shokoladno-kokosovyy-bounty"))
    assert dessert is not None
    image = await db_session.scalar(
        select(DessertImage)
        .where(DessertImage.dessert_id == dessert.id, DessertImage.original_filename == "shokoladno-kokosovyy-bounty-cover.png")
    )
    assert image is not None
    image_path = media / image.storage_key
    image_path.unlink()
    assert not image_path.exists()

    before_count = await db_session.scalar(select(func.count()).select_from(DessertImage))
    summary = await recover_initial_catalog_media(db_session, assets_root=assets, settings=settings)

    assert summary.ok
    assert f"{dessert.slug}:{image.original_filename}" in summary.restored
    assert image_path.exists()
    after_count = await db_session.scalar(select(func.count()).select_from(DessertImage))
    assert before_count == after_count


async def test_recovery_skips_present_files_and_is_idempotent(
    db_session: AsyncSession,
    tmp_path: Path,
) -> None:
    assets = tmp_path / "assets"
    media = tmp_path / "media"
    settings = _settings(media)
    _write_assets(assets)

    initial = await import_initial_catalog(db_session, assets_root=assets, settings=settings)
    assert initial.ok

    dessert = await db_session.scalar(select(Dessert).where(Dessert.slug == "medovik"))
    assert dessert is not None
    image = await db_session.scalar(
        select(DessertImage)
        .where(DessertImage.dessert_id == dessert.id, DessertImage.original_filename == "medovik-cover.png")
    )
    assert image is not None

    first = await recover_initial_catalog_media(db_session, assets_root=assets, settings=settings)
    second = await recover_initial_catalog_media(db_session, assets_root=assets, settings=settings)

    label = f"{dessert.slug}:{image.original_filename} present"
    assert first.ok
    assert second.ok
    assert label in first.skipped
    assert label in second.skipped
    assert await db_session.scalar(select(func.count()).select_from(DessertImage)) == sum(
        2 if spec.slug != "krasnyy-barkhat" else 1 for spec in CATALOG
    )


async def test_recovery_dry_run_and_optional_missing_detail_warn_only(
    db_session: AsyncSession,
    tmp_path: Path,
) -> None:
    assets = tmp_path / "assets"
    media = tmp_path / "media"
    settings = _settings(media)
    _write_assets(assets)

    initial = await import_initial_catalog(db_session, assets_root=assets, settings=settings)
    assert initial.ok

    dessert = await db_session.scalar(select(Dessert).where(Dessert.slug == "krasnyy-barkhat"))
    assert dessert is not None
    image = await db_session.scalar(select(DessertImage).where(DessertImage.dessert_id == dessert.id))
    assert image is not None
    image_path = media / image.storage_key
    image_path.unlink()

    summary = await recover_initial_catalog_media(db_session, assets_root=assets, settings=settings, dry_run=True)

    assert summary.ok
    assert f"{dessert.slug}:{image.original_filename}" in summary.restored
    assert not image_path.exists()
    assert any("krasnyy-barkhat: missing optional detail image" in warning for warning in summary.warnings)
