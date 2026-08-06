from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import AdminUser
from app.auth.services import get_current_admin, require_csrf
from app.core.config import Settings, get_settings
from app.db.session import get_db_session
from app.desserts.schemas import (
    DessertCreate,
    DessertResponse,
    DessertUpdate,
    DessertVariantCreate,
    DessertVariantUpdate,
    PublicCatalogResponse,
    PublicDessertDetail,
    ReorderItem,
)
from app.desserts.services import (
    archive_dessert,
    archive_variant,
    create_dessert,
    create_variant,
    delete_image,
    dessert_response,
    get_dessert,
    get_public_dessert,
    list_admin_desserts,
    list_public_catalog,
    reorder_desserts,
    reorder_images,
    reorder_variants,
    set_primary_image,
    update_dessert,
    update_image_alt,
    update_variant,
    upload_image,
)

router = APIRouter(prefix="/api")


@router.get("/public/catalog", response_model=PublicCatalogResponse)
async def public_catalog(
    category: str | None = None,
    is_available: bool | None = None,
    is_new: bool | None = None,
    is_popular: bool | None = None,
    is_seasonal: bool | None = None,
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> PublicCatalogResponse:
    return await list_public_catalog(
        db,
        settings,
        category_slug=category,
        is_available=is_available,
        is_new=is_new,
        is_popular=is_popular,
        is_seasonal=is_seasonal,
        limit=limit,
        offset=offset,
    )


@router.get("/public/desserts/{slug}", response_model=PublicDessertDetail)
async def public_dessert(
    slug: str,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> PublicDessertDetail:
    return await get_public_dessert(db, slug, settings)


@router.get("/admin/desserts", response_model=list[DessertResponse])
async def admin_desserts(
    category_id: int | None = None,
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _user: AdminUser = Depends(get_current_admin),
) -> list[DessertResponse]:
    return [
        dessert_response(dessert, settings)
        for dessert in await list_admin_desserts(db, category_id, include_archived)
    ]


@router.get("/admin/desserts/{dessert_id}", response_model=DessertResponse)
async def admin_dessert(
    dessert_id: int,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _user: AdminUser = Depends(get_current_admin),
) -> DessertResponse:
    return dessert_response(await get_dessert(db, dessert_id), settings)


@router.post("/admin/desserts", response_model=DessertResponse, status_code=201)
async def admin_create_dessert(
    payload: DessertCreate,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await create_dessert(db, payload), settings)


@router.patch("/admin/desserts/{dessert_id}", response_model=DessertResponse)
async def admin_update_dessert(
    dessert_id: int,
    payload: DessertUpdate,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await update_dessert(db, dessert_id, payload), settings)


@router.post("/admin/desserts/{dessert_id}/archive", response_model=DessertResponse)
async def admin_archive_dessert(
    dessert_id: int,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await archive_dessert(db, dessert_id), settings)


@router.post("/admin/desserts/reorder", response_model=list[DessertResponse])
async def admin_reorder_desserts(
    payload: list[ReorderItem],
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> list[DessertResponse]:
    return [dessert_response(dessert, settings) for dessert in await reorder_desserts(db, payload)]


@router.post("/admin/desserts/{dessert_id}/variants", response_model=DessertResponse, status_code=201)
async def admin_create_variant(
    dessert_id: int,
    payload: DessertVariantCreate,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await create_variant(db, dessert_id, payload), settings)


@router.patch("/admin/desserts/{dessert_id}/variants/{variant_id}", response_model=DessertResponse)
async def admin_update_variant(
    dessert_id: int,
    variant_id: int,
    payload: DessertVariantUpdate,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await update_variant(db, dessert_id, variant_id, payload), settings)


@router.post("/admin/desserts/{dessert_id}/variants/{variant_id}/archive", response_model=DessertResponse)
async def admin_archive_variant(
    dessert_id: int,
    variant_id: int,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await archive_variant(db, dessert_id, variant_id), settings)


@router.post("/admin/desserts/{dessert_id}/variants/reorder", response_model=DessertResponse)
async def admin_reorder_variants(
    dessert_id: int,
    payload: list[ReorderItem],
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await reorder_variants(db, dessert_id, payload), settings)


@router.post("/admin/desserts/{dessert_id}/images", response_model=DessertResponse, status_code=201)
async def admin_upload_image(
    dessert_id: int,
    alt_text: str = Form(default=""),
    is_primary: bool = Form(default=False),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await upload_image(db, dessert_id, file, alt_text, is_primary, settings), settings)


@router.patch("/admin/desserts/{dessert_id}/images/{image_id}", response_model=DessertResponse)
async def admin_update_image_alt(
    dessert_id: int,
    image_id: int,
    alt_text: str = Form(default=""),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await update_image_alt(db, dessert_id, image_id, alt_text), settings)


@router.post("/admin/desserts/{dessert_id}/images/{image_id}/primary", response_model=DessertResponse)
async def admin_set_primary_image(
    dessert_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await set_primary_image(db, dessert_id, image_id), settings)


@router.delete("/admin/desserts/{dessert_id}/images/{image_id}", response_model=DessertResponse)
async def admin_delete_image(
    dessert_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await delete_image(db, dessert_id, image_id, settings), settings)


@router.post("/admin/desserts/{dessert_id}/images/reorder", response_model=DessertResponse)
async def admin_reorder_images(
    dessert_id: int,
    payload: list[ReorderItem],
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> DessertResponse:
    return dessert_response(await reorder_images(db, dessert_id, payload), settings)
