from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import Select, exists, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.base import ExecutableOption

from app.categories.models import Category
from app.categories.services import ensure_active_category
from app.core.config import Settings
from app.desserts.models import Dessert, DessertImage, DessertVariant
from app.desserts.schemas import (
    DessertCreate,
    DessertImageResponse,
    DessertResponse,
    DessertUpdate,
    DessertVariantCreate,
    DessertVariantResponse,
    DessertVariantUpdate,
    PublicCatalogResponse,
    PublicDessertDetail,
    PublicDessertSummary,
    ReorderItem,
)
from app.media.storage import LocalMediaStorage


def _now() -> datetime:
    return datetime.now(UTC)


def _constraint_name(exc: IntegrityError) -> str:
    original = getattr(exc, "orig", None)
    return f"{original} {exc}"


def _map_catalog_integrity_error(exc: IntegrityError) -> HTTPException:
    message = _constraint_name(exc)
    if "uq_desserts_slug" in message or "desserts_slug_key" in message:
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dessert slug already exists")
    if "uq_dessert_variants_active_weight" in message:
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Variant already exists")
    if any(
        constraint in message
        for constraint in (
            "ck_dessert_variants_weight_positive",
            "ck_dessert_variants_weight_unit",
            "ck_dessert_variants_price_non_negative",
            "ck_dessert_variants_old_price_gt_price",
            "ck_desserts_calories_non_negative",
            "ck_desserts_proteins_non_negative",
            "ck_desserts_fats_non_negative",
            "ck_desserts_carbohydrates_non_negative",
        )
    ):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Catalog validation failed")
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Catalog integrity conflict")


def _dessert_options() -> tuple[ExecutableOption, ...]:
    return (
        selectinload(Dessert.category),
        selectinload(Dessert.variants),
        selectinload(Dessert.images),
    )


def _storage(settings: Settings) -> LocalMediaStorage:
    return LocalMediaStorage(
        settings.media_root,
        settings.media_public_base_url,
        settings.max_upload_bytes,
    )


def _active_variants(dessert: Dessert) -> list[DessertVariant]:
    return sorted(
        [variant for variant in dessert.variants if variant.archived_at is None],
        key=lambda item: (item.sort_order, item.id),
    )


def _active_images(dessert: Dessert) -> list[DessertImage]:
    return sorted(
        [image for image in dessert.images if image.deleted_at is None],
        key=lambda item: (item.sort_order, item.id),
    )


def _image_response(image: DessertImage, settings: Settings) -> DessertImageResponse:
    data = {
        "id": image.id,
        "dessert_id": image.dessert_id,
        "url": _storage(settings).media_url(image.storage_key),
        "original_filename": image.original_filename,
        "mime_type": image.mime_type,
        "width": image.width,
        "height": image.height,
        "file_size": image.file_size,
        "alt_text": image.alt_text,
        "is_primary": image.is_primary,
        "sort_order": image.sort_order,
        "created_at": image.created_at,
        "deleted_at": image.deleted_at,
    }
    return DessertImageResponse.model_validate(data)


def _variant_response(variant: DessertVariant) -> DessertVariantResponse:
    return DessertVariantResponse.model_validate(variant)


def dessert_response(dessert: Dessert, settings: Settings) -> DessertResponse:
    return DessertResponse(
        id=dessert.id,
        category_id=dessert.category_id,
        name=dessert.name,
        slug=dessert.slug,
        short_description=dessert.short_description,
        full_description=dessert.full_description,
        ingredients=dessert.ingredients,
        allergens=dessert.allergens,
        warnings=dessert.warnings,
        calories=dessert.calories,
        proteins=dessert.proteins,
        fats=dessert.fats,
        carbohydrates=dessert.carbohydrates,
        preparation_time_text=dessert.preparation_time_text,
        is_published=dessert.is_published,
        is_available=dessert.is_available,
        is_sugar_free=dessert.is_sugar_free,
        is_gluten_free=dessert.is_gluten_free,
        is_low_calorie=dessert.is_low_calorie,
        is_bento=dessert.is_bento,
        is_new=dessert.is_new,
        is_popular=dessert.is_popular,
        is_seasonal=dessert.is_seasonal,
        sort_order=dessert.sort_order,
        created_at=dessert.created_at,
        updated_at=dessert.updated_at,
        archived_at=dessert.archived_at,
        variants=[_variant_response(variant) for variant in _active_variants(dessert)],
        images=[_image_response(image, settings) for image in _active_images(dessert)],
    )


def _public_summary(dessert: Dessert, settings: Settings) -> PublicDessertSummary:
    images = _active_images(dessert)
    primary = next((image for image in images if image.is_primary), images[0] if images else None)
    return PublicDessertSummary(
        id=dessert.id,
        category_id=dessert.category_id,
        category_slug=dessert.category.slug,
        name=dessert.name,
        slug=dessert.slug,
        short_description=dessert.short_description,
        is_available=dessert.is_available,
        is_sugar_free=dessert.is_sugar_free,
        is_gluten_free=dessert.is_gluten_free,
        is_low_calorie=dessert.is_low_calorie,
        is_bento=dessert.is_bento,
        is_new=dessert.is_new,
        is_popular=dessert.is_popular,
        is_seasonal=dessert.is_seasonal,
        primary_image=_image_response(primary, settings) if primary else None,
        variants=[_variant_response(variant) for variant in _active_variants(dessert)],
    )


def _public_detail(dessert: Dessert, settings: Settings) -> PublicDessertDetail:
    summary = _public_summary(dessert, settings).model_dump()
    summary.update(
        {
            "full_description": dessert.full_description,
            "ingredients": dessert.ingredients,
            "allergens": dessert.allergens,
            "warnings": dessert.warnings,
            "calories": dessert.calories,
            "proteins": dessert.proteins,
            "fats": dessert.fats,
            "carbohydrates": dessert.carbohydrates,
            "preparation_time_text": dessert.preparation_time_text,
            "images": [_image_response(image, settings) for image in _active_images(dessert)],
        }
    )
    return PublicDessertDetail.model_validate(summary)


def _public_base_query() -> Select[tuple[Dessert]]:
    active_variant_exists = (
        select(DessertVariant.id)
        .where(DessertVariant.dessert_id == Dessert.id, DessertVariant.archived_at.is_(None))
        .exists()
    )
    return (
        select(Dessert)
        .join(Dessert.category)
        .options(*_dessert_options())
        .where(
            Dessert.archived_at.is_(None),
            Dessert.is_published.is_(True),
            Category.archived_at.is_(None),
            Category.is_visible.is_(True),
            active_variant_exists,
        )
    )


async def list_public_catalog(
    db: AsyncSession,
    settings: Settings,
    category_slug: str | None = None,
    is_available: bool | None = None,
    is_new: bool | None = None,
    is_popular: bool | None = None,
    is_seasonal: bool | None = None,
    limit: int = 24,
    offset: int = 0,
) -> PublicCatalogResponse:
    query = _public_base_query()
    if category_slug:
        query = query.where(Category.slug == category_slug)
    if is_available is not None:
        query = query.where(Dessert.is_available.is_(is_available))
    if is_new is not None:
        query = query.where(Dessert.is_new.is_(is_new))
    if is_popular is not None:
        query = query.where(Dessert.is_popular.is_(is_popular))
    if is_seasonal is not None:
        query = query.where(Dessert.is_seasonal.is_(is_seasonal))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.order_by(Dessert.sort_order, Dessert.id).limit(limit).offset(offset))
    desserts = list(result.scalars())
    return PublicCatalogResponse(
        items=[_public_summary(dessert, settings) for dessert in desserts],
        total=int(total or 0),
        limit=limit,
        offset=offset,
    )


async def get_public_dessert(db: AsyncSession, slug: str, settings: Settings) -> PublicDessertDetail:
    result = await db.execute(_public_base_query().where(Dessert.slug == slug))
    dessert = result.scalar_one_or_none()
    if dessert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dessert not found")
    return _public_detail(dessert, settings)


async def list_admin_desserts(
    db: AsyncSession,
    category_id: int | None = None,
    include_archived: bool = False,
) -> list[Dessert]:
    query = select(Dessert).options(*_dessert_options())
    if category_id is not None:
        query = query.where(Dessert.category_id == category_id)
    if not include_archived:
        query = query.where(Dessert.archived_at.is_(None))
    result = await db.execute(query.order_by(Dessert.sort_order, Dessert.id))
    return list(result.scalars())


async def get_dessert(db: AsyncSession, dessert_id: int) -> Dessert:
    result = await db.execute(
        select(Dessert)
        .options(*_dessert_options())
        .where(Dessert.id == dessert_id)
        .execution_options(populate_existing=True)
    )
    dessert = result.scalar_one_or_none()
    if dessert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dessert not found")
    return dessert


async def get_active_dessert(db: AsyncSession, dessert_id: int) -> Dessert:
    dessert = await get_dessert(db, dessert_id)
    if dessert.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dessert is archived")
    return dessert


async def _has_active_variant(db: AsyncSession, dessert_id: int) -> bool:
    return bool(
        await db.scalar(
            select(
                exists().where(
                    DessertVariant.dessert_id == dessert_id,
                    DessertVariant.archived_at.is_(None),
                )
            )
        )
    )


async def _ensure_publish_allowed(db: AsyncSession, dessert_id: int) -> None:
    if not await _has_active_variant(db, dessert_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Published desserts require at least one active variant",
        )


async def create_dessert(db: AsyncSession, payload: DessertCreate) -> Dessert:
    await ensure_active_category(db, payload.category_id)
    data = payload.model_dump()
    if data.get("is_published"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Create desserts as drafts, then add a variant before publishing",
        )
    dessert = Dessert(**data)
    db.add(dessert)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_catalog_integrity_error(exc) from exc
    return await get_dessert(db, dessert.id)


async def update_dessert(db: AsyncSession, dessert_id: int, payload: DessertUpdate) -> Dessert:
    dessert = await get_active_dessert(db, dessert_id)
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data:
        await ensure_active_category(db, data["category_id"])
    for key, value in data.items():
        setattr(dessert, key, value)
    if data.get("is_published") is True:
        await _ensure_publish_allowed(db, dessert_id)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_catalog_integrity_error(exc) from exc
    return await get_dessert(db, dessert_id)


async def archive_dessert(db: AsyncSession, dessert_id: int) -> Dessert:
    dessert = await get_dessert(db, dessert_id)
    dessert.archived_at = _now()
    dessert.is_published = False
    await db.commit()
    return await get_dessert(db, dessert_id)


async def reorder_desserts(db: AsyncSession, payload: list[ReorderItem]) -> list[Dessert]:
    dessert_ids = [item.id for item in payload]
    if len(dessert_ids) != len(set(dessert_ids)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Duplicate dessert IDs")
    desserts = {dessert.id: dessert for dessert in await list_admin_desserts(db)}
    for dessert_id in dessert_ids:
        if dessert_id not in desserts:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dessert not found")
    for item in payload:
        desserts[item.id].sort_order = item.sort_order
    await db.commit()
    return await list_admin_desserts(db)


async def create_variant(db: AsyncSession, dessert_id: int, payload: DessertVariantCreate) -> Dessert:
    await get_active_dessert(db, dessert_id)
    db.add(DessertVariant(dessert_id=dessert_id, **payload.model_dump()))
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_catalog_integrity_error(exc) from exc
    return await get_dessert(db, dessert_id)


async def update_variant(
    db: AsyncSession,
    dessert_id: int,
    variant_id: int,
    payload: DessertVariantUpdate,
) -> Dessert:
    await get_active_dessert(db, dessert_id)
    variant = await db.get(DessertVariant, variant_id)
    if variant is None or variant.dessert_id != dessert_id or variant.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    data = payload.model_dump(exclude_unset=True)
    price = data.get("price", variant.price)
    old_price = data.get("old_price", variant.old_price)
    if old_price is not None and old_price <= price:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="old_price must be greater than price")
    for key, value in data.items():
        setattr(variant, key, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_catalog_integrity_error(exc) from exc
    return await get_dessert(db, dessert_id)


async def archive_variant(db: AsyncSession, dessert_id: int, variant_id: int) -> Dessert:
    dessert = await get_active_dessert(db, dessert_id)
    variant = await db.get(DessertVariant, variant_id)
    if variant is None or variant.dessert_id != dessert_id or variant.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    active_count = await db.scalar(
        select(func.count())
        .select_from(DessertVariant)
        .where(DessertVariant.dessert_id == dessert_id, DessertVariant.archived_at.is_(None))
    )
    if dessert.is_published and int(active_count or 0) <= 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot archive the last active variant of a published dessert",
        )
    variant.archived_at = _now()
    await db.commit()
    return await get_dessert(db, dessert_id)


async def reorder_variants(db: AsyncSession, dessert_id: int, payload: list[ReorderItem]) -> Dessert:
    await get_active_dessert(db, dessert_id)
    ids = [item.id for item in payload]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Duplicate variant IDs")
    result = await db.execute(
        select(DessertVariant).where(
            DessertVariant.dessert_id == dessert_id,
            DessertVariant.archived_at.is_(None),
            DessertVariant.id.in_(ids),
        )
    )
    variants = {variant.id: variant for variant in result.scalars()}
    if set(ids) != set(variants):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    for item in payload:
        variants[item.id].sort_order = item.sort_order
    await db.commit()
    return await get_dessert(db, dessert_id)


async def upload_image(
    db: AsyncSession,
    dessert_id: int,
    file: UploadFile,
    alt_text: str,
    is_primary: bool,
    settings: Settings,
) -> Dessert:
    await get_active_dessert(db, dessert_id)
    storage = _storage(settings)
    storage_key, original_filename, mime_type, file_size = await storage.save_upload(file)
    active_count = await db.scalar(
        select(func.count())
        .select_from(DessertImage)
        .where(DessertImage.dessert_id == dessert_id, DessertImage.deleted_at.is_(None))
    )
    make_primary = is_primary or int(active_count or 0) == 0
    image = DessertImage(
        dessert_id=dessert_id,
        storage_key=storage_key,
        original_filename=original_filename,
        mime_type=mime_type,
        width=None,
        height=None,
        file_size=file_size,
        alt_text=alt_text.strip(),
        is_primary=False,
        sort_order=int(active_count or 0),
        created_at=_now(),
    )
    db.add(image)
    try:
        await db.flush()
        if make_primary:
            await _set_primary_image_row(db, dessert_id, image)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        try:
            storage.delete(storage_key)
        finally:
            raise _map_catalog_integrity_error(exc) from exc
    return await get_dessert(db, dessert_id)


async def update_image_alt(db: AsyncSession, dessert_id: int, image_id: int, alt_text: str) -> Dessert:
    await get_active_dessert(db, dessert_id)
    image = await _get_active_image(db, dessert_id, image_id)
    image.alt_text = alt_text.strip()
    await db.commit()
    return await get_dessert(db, dessert_id)


async def set_primary_image(db: AsyncSession, dessert_id: int, image_id: int) -> Dessert:
    await get_active_dessert(db, dessert_id)
    image = await _get_active_image(db, dessert_id, image_id)
    try:
        await _set_primary_image_row(db, dessert_id, image)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not update primary image") from exc
    return await get_dessert(db, dessert_id)


async def delete_image(
    db: AsyncSession,
    dessert_id: int,
    image_id: int,
    settings: Settings,
) -> Dessert:
    await get_active_dessert(db, dessert_id)
    image = await _get_active_image(db, dessert_id, image_id)
    was_primary = image.is_primary
    image.deleted_at = _now()
    image.is_primary = False
    if was_primary:
        result = await db.execute(
            select(DessertImage)
            .where(
                DessertImage.dessert_id == dessert_id,
                DessertImage.id != image_id,
                DessertImage.deleted_at.is_(None),
            )
            .order_by(DessertImage.sort_order, DessertImage.id)
        )
        replacement = result.scalars().first()
        if replacement is not None:
            await _set_primary_image_row(db, dessert_id, replacement)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not delete image") from exc
    try:
        _storage(settings).delete(image.storage_key)
    except HTTPException:
        pass
    return await get_dessert(db, dessert_id)


async def reorder_images(db: AsyncSession, dessert_id: int, payload: list[ReorderItem]) -> Dessert:
    await get_active_dessert(db, dessert_id)
    ids = [item.id for item in payload]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Duplicate image IDs")
    result = await db.execute(
        select(DessertImage).where(
            DessertImage.dessert_id == dessert_id,
            DessertImage.deleted_at.is_(None),
            DessertImage.id.in_(ids),
        )
    )
    images = {image.id: image for image in result.scalars()}
    if set(ids) != set(images):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    for item in payload:
        images[item.id].sort_order = item.sort_order
    await db.commit()
    return await get_dessert(db, dessert_id)


async def _set_primary_image_row(db: AsyncSession, dessert_id: int, image: DessertImage) -> None:
    await db.execute(
        update(DessertImage)
        .where(
            DessertImage.dessert_id == dessert_id,
            DessertImage.deleted_at.is_(None),
            DessertImage.is_primary.is_(True),
        )
        .values(is_primary=False)
    )
    await db.flush()
    image.is_primary = True
    await db.flush()


async def _get_active_image(db: AsyncSession, dessert_id: int, image_id: int) -> DessertImage:
    image = await db.get(DessertImage, image_id)
    if image is None or image.dessert_id != dessert_id or image.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    return image
