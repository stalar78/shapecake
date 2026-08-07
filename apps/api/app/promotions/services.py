from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.desserts.models import Dessert
from app.promotions.models import Promotion
from app.promotions.schemas import (
    PromotionCreate,
    PromotionResponse,
    PromotionUpdate,
    PublicPromotionListResponse,
    PublicPromotionResponse,
    ReorderItem,
)


def _now() -> datetime:
    return datetime.now(UTC)


def _base_query() -> Select[tuple[Promotion]]:
    return select(Promotion).options(selectinload(Promotion.dessert))


def _public_query() -> Select[tuple[Promotion]]:
    now = _now()
    return _base_query().where(
        Promotion.is_published.is_(True),
        Promotion.archived_at.is_(None),
        or_(Promotion.starts_at.is_(None), Promotion.starts_at <= now),
        or_(Promotion.ends_at.is_(None), Promotion.ends_at > now),
    )


async def _ensure_dessert_exists(db: AsyncSession, dessert_id: int | None) -> None:
    if dessert_id is None:
        return
    if await db.get(Dessert, dessert_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dessert not found")


def _map_integrity_error(exc: IntegrityError) -> HTTPException:
    message = f"{getattr(exc, 'orig', '')} {exc}"
    if "uq_promotions_slug" in message or "promotions_slug_key" in message:
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Promotion slug already exists")
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Promotion integrity conflict")


def _response(promotion: Promotion) -> PromotionResponse:
    return PromotionResponse.model_validate(promotion)


async def list_public_promotions(db: AsyncSession, limit: int = 20, offset: int = 0) -> PublicPromotionListResponse:
    query = _public_query()
    total = int(await db.scalar(select(func.count()).select_from(query.subquery())) or 0)
    result = await db.execute(query.order_by(Promotion.sort_order, Promotion.id).limit(limit).offset(offset))
    return PublicPromotionListResponse(
        items=[PublicPromotionResponse.model_validate(promotion) for promotion in result.scalars()],
        total=total,
        limit=limit,
        offset=offset,
    )


async def get_public_promotion(db: AsyncSession, slug: str) -> PublicPromotionResponse:
    result = await db.execute(_public_query().where(Promotion.slug == slug))
    promotion = result.scalar_one_or_none()
    if promotion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found")
    return PublicPromotionResponse.model_validate(promotion)


async def list_admin_promotions(db: AsyncSession, include_archived: bool = False) -> list[PromotionResponse]:
    query = _base_query()
    if not include_archived:
        query = query.where(Promotion.archived_at.is_(None))
    result = await db.execute(query.order_by(Promotion.sort_order, Promotion.id))
    return [_response(promotion) for promotion in result.scalars()]


async def get_promotion(db: AsyncSession, promotion_id: int) -> Promotion:
    result = await db.execute(_base_query().where(Promotion.id == promotion_id).execution_options(populate_existing=True))
    promotion = result.scalar_one_or_none()
    if promotion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found")
    return promotion


async def create_promotion(db: AsyncSession, payload: PromotionCreate) -> PromotionResponse:
    await _ensure_dessert_exists(db, payload.dessert_id)
    promotion = Promotion(**payload.model_dump())
    db.add(promotion)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_integrity_error(exc) from exc
    return _response(await get_promotion(db, promotion.id))


async def update_promotion(db: AsyncSession, promotion_id: int, payload: PromotionUpdate) -> PromotionResponse:
    promotion = await get_promotion(db, promotion_id)
    data = payload.model_dump(exclude_unset=True)
    if "dessert_id" in data:
        await _ensure_dessert_exists(db, data["dessert_id"])
    starts_at = data.get("starts_at", promotion.starts_at)
    ends_at = data.get("ends_at", promotion.ends_at)
    if starts_at is not None and ends_at is not None and ends_at <= starts_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="ends_at must be greater than starts_at")
    for key, value in data.items():
        setattr(promotion, key, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_integrity_error(exc) from exc
    return _response(await get_promotion(db, promotion_id))


async def set_promotion_published(db: AsyncSession, promotion_id: int, published: bool) -> PromotionResponse:
    promotion = await get_promotion(db, promotion_id)
    promotion.is_published = published
    await db.commit()
    return _response(await get_promotion(db, promotion_id))


async def reorder_promotions(db: AsyncSession, payload: list[ReorderItem]) -> list[PromotionResponse]:
    ids = [item.id for item in payload]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Duplicate promotion IDs")
    result = await db.execute(select(Promotion).where(Promotion.archived_at.is_(None), Promotion.id.in_(ids)))
    promotions = {promotion.id: promotion for promotion in result.scalars()}
    if set(ids) != set(promotions):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found")
    for item in payload:
        promotions[item.id].sort_order = item.sort_order
    await db.commit()
    return await list_admin_promotions(db)


async def archive_promotion(db: AsyncSession, promotion_id: int) -> PromotionResponse:
    promotion = await get_promotion(db, promotion_id)
    promotion.archived_at = _now()
    promotion.is_published = False
    await db.commit()
    return _response(await get_promotion(db, promotion_id))

