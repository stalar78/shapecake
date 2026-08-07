from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.desserts.models import Dessert
from app.reviews.models import Review
from app.reviews.schemas import (
    PublicReviewListResponse,
    PublicReviewResponse,
    ReorderItem,
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
)


def _now() -> datetime:
    return datetime.now(UTC)


def _base_query() -> Select[tuple[Review]]:
    return select(Review).options(selectinload(Review.dessert))


async def _ensure_dessert_exists(db: AsyncSession, dessert_id: int | None) -> None:
    if dessert_id is None:
        return
    if await db.get(Dessert, dessert_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dessert not found")


def _map_integrity_error(exc: IntegrityError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Review integrity conflict")


def _response(review: Review) -> ReviewResponse:
    return ReviewResponse.model_validate(review)


async def list_public_reviews(
    db: AsyncSession,
    dessert_id: int | None = None,
    featured: bool | None = None,
    limit: int = 20,
    offset: int = 0,
) -> PublicReviewListResponse:
    query = _base_query().where(Review.is_published.is_(True), Review.archived_at.is_(None))
    if dessert_id is not None:
        query = query.where(Review.dessert_id == dessert_id)
    if featured is not None:
        query = query.where(Review.is_featured.is_(featured))
    total = int(await db.scalar(select(func.count()).select_from(query.subquery())) or 0)
    result = await db.execute(query.order_by(Review.sort_order, Review.id).limit(limit).offset(offset))
    return PublicReviewListResponse(
        items=[PublicReviewResponse.model_validate(review) for review in result.scalars()],
        total=total,
        limit=limit,
        offset=offset,
    )


async def list_admin_reviews(db: AsyncSession, include_archived: bool = False) -> list[ReviewResponse]:
    query = _base_query()
    if not include_archived:
        query = query.where(Review.archived_at.is_(None))
    result = await db.execute(query.order_by(Review.sort_order, Review.id))
    return [_response(review) for review in result.scalars()]


async def get_review(db: AsyncSession, review_id: int) -> Review:
    result = await db.execute(_base_query().where(Review.id == review_id).execution_options(populate_existing=True))
    review = result.scalar_one_or_none()
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return review


async def create_review(db: AsyncSession, payload: ReviewCreate) -> ReviewResponse:
    await _ensure_dessert_exists(db, payload.dessert_id)
    review = Review(**payload.model_dump())
    db.add(review)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_integrity_error(exc) from exc
    return _response(await get_review(db, review.id))


async def update_review(db: AsyncSession, review_id: int, payload: ReviewUpdate) -> ReviewResponse:
    review = await get_review(db, review_id)
    data = payload.model_dump(exclude_unset=True)
    if "dessert_id" in data:
        await _ensure_dessert_exists(db, data["dessert_id"])
    for key, value in data.items():
        setattr(review, key, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_integrity_error(exc) from exc
    return _response(await get_review(db, review_id))


async def set_review_published(db: AsyncSession, review_id: int, published: bool) -> ReviewResponse:
    review = await get_review(db, review_id)
    review.is_published = published
    await db.commit()
    return _response(await get_review(db, review_id))


async def set_review_featured(db: AsyncSession, review_id: int, featured: bool) -> ReviewResponse:
    review = await get_review(db, review_id)
    review.is_featured = featured
    await db.commit()
    return _response(await get_review(db, review_id))


async def reorder_reviews(db: AsyncSession, payload: list[ReorderItem]) -> list[ReviewResponse]:
    ids = [item.id for item in payload]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Duplicate review IDs")
    result = await db.execute(select(Review).where(Review.archived_at.is_(None), Review.id.in_(ids)))
    reviews = {review.id: review for review in result.scalars()}
    if set(ids) != set(reviews):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    for item in payload:
        reviews[item.id].sort_order = item.sort_order
    await db.commit()
    return await list_admin_reviews(db)


async def archive_review(db: AsyncSession, review_id: int) -> ReviewResponse:
    review = await get_review(db, review_id)
    review.archived_at = _now()
    review.is_published = False
    await db.commit()
    return _response(await get_review(db, review_id))
