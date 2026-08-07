from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import AdminUser
from app.auth.services import get_current_admin, require_csrf
from app.db.session import get_db_session
from app.promotions.schemas import (
    PromotionCreate,
    PromotionResponse,
    PromotionUpdate,
    PublicPromotionListResponse,
    PublicPromotionResponse,
    ReorderItem,
)
from app.promotions.services import (
    archive_promotion,
    create_promotion,
    get_promotion,
    get_public_promotion,
    list_admin_promotions,
    list_public_promotions,
    reorder_promotions,
    set_promotion_published,
    update_promotion,
)

router = APIRouter(prefix="/api")


@router.get("/public/promotions", response_model=PublicPromotionListResponse)
async def public_promotions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> PublicPromotionListResponse:
    return await list_public_promotions(db, limit=limit, offset=offset)


@router.get("/public/promotions/{slug}", response_model=PublicPromotionResponse)
async def public_promotion(slug: str, db: AsyncSession = Depends(get_db_session)) -> PublicPromotionResponse:
    return await get_public_promotion(db, slug)


@router.get("/admin/promotions", response_model=list[PromotionResponse])
async def admin_promotions(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db_session),
    _user: AdminUser = Depends(get_current_admin),
) -> list[PromotionResponse]:
    return await list_admin_promotions(db, include_archived)


@router.post("/admin/promotions/reorder", response_model=list[PromotionResponse])
async def admin_reorder_promotions(
    payload: list[ReorderItem],
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> list[PromotionResponse]:
    return await reorder_promotions(db, payload)


@router.get("/admin/promotions/{promotion_id}", response_model=PromotionResponse)
async def admin_promotion(
    promotion_id: int,
    db: AsyncSession = Depends(get_db_session),
    _user: AdminUser = Depends(get_current_admin),
) -> PromotionResponse:
    return PromotionResponse.model_validate(await get_promotion(db, promotion_id))


@router.post("/admin/promotions", response_model=PromotionResponse, status_code=201)
async def admin_create_promotion(
    payload: PromotionCreate,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> PromotionResponse:
    return await create_promotion(db, payload)


@router.patch("/admin/promotions/{promotion_id}", response_model=PromotionResponse)
async def admin_update_promotion(
    promotion_id: int,
    payload: PromotionUpdate,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> PromotionResponse:
    return await update_promotion(db, promotion_id, payload)


@router.post("/admin/promotions/{promotion_id}/publish", response_model=PromotionResponse)
async def admin_publish_promotion(
    promotion_id: int,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> PromotionResponse:
    return await set_promotion_published(db, promotion_id, True)


@router.post("/admin/promotions/{promotion_id}/unpublish", response_model=PromotionResponse)
async def admin_unpublish_promotion(
    promotion_id: int,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> PromotionResponse:
    return await set_promotion_published(db, promotion_id, False)


@router.post("/admin/promotions/{promotion_id}/archive", response_model=PromotionResponse)
async def admin_archive_promotion(
    promotion_id: int,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> PromotionResponse:
    return await archive_promotion(db, promotion_id)
