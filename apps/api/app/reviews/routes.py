from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import AdminUser
from app.auth.services import get_current_admin, require_csrf
from app.db.session import get_db_session
from app.reviews.schemas import (
    PublicReviewListResponse,
    ReorderItem,
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
)
from app.reviews.services import (
    archive_review,
    create_review,
    get_review,
    list_admin_reviews,
    list_public_reviews,
    reorder_reviews,
    set_review_featured,
    set_review_published,
    update_review,
)

router = APIRouter(prefix="/api")


@router.get("/public/reviews", response_model=PublicReviewListResponse)
async def public_reviews(
    dessert_id: int | None = Query(default=None, ge=1),
    featured: bool | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
) -> PublicReviewListResponse:
    return await list_public_reviews(db, dessert_id=dessert_id, featured=featured, limit=limit, offset=offset)


@router.get("/admin/reviews", response_model=list[ReviewResponse])
async def admin_reviews(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db_session),
    _user: AdminUser = Depends(get_current_admin),
) -> list[ReviewResponse]:
    return await list_admin_reviews(db, include_archived)


@router.post("/admin/reviews/reorder", response_model=list[ReviewResponse])
async def admin_reorder_reviews(
    payload: list[ReorderItem],
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> list[ReviewResponse]:
    return await reorder_reviews(db, payload)


@router.get("/admin/reviews/{review_id}", response_model=ReviewResponse)
async def admin_review(
    review_id: int,
    db: AsyncSession = Depends(get_db_session),
    _user: AdminUser = Depends(get_current_admin),
) -> ReviewResponse:
    return ReviewResponse.model_validate(await get_review(db, review_id))


@router.post("/admin/reviews", response_model=ReviewResponse, status_code=201)
async def admin_create_review(
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> ReviewResponse:
    return await create_review(db, payload)


@router.patch("/admin/reviews/{review_id}", response_model=ReviewResponse)
async def admin_update_review(
    review_id: int,
    payload: ReviewUpdate,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> ReviewResponse:
    return await update_review(db, review_id, payload)


@router.post("/admin/reviews/{review_id}/publish", response_model=ReviewResponse)
async def admin_publish_review(
    review_id: int,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> ReviewResponse:
    return await set_review_published(db, review_id, True)


@router.post("/admin/reviews/{review_id}/unpublish", response_model=ReviewResponse)
async def admin_unpublish_review(
    review_id: int,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> ReviewResponse:
    return await set_review_published(db, review_id, False)


@router.post("/admin/reviews/{review_id}/feature", response_model=ReviewResponse)
async def admin_feature_review(
    review_id: int,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> ReviewResponse:
    return await set_review_featured(db, review_id, True)


@router.post("/admin/reviews/{review_id}/unfeature", response_model=ReviewResponse)
async def admin_unfeature_review(
    review_id: int,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> ReviewResponse:
    return await set_review_featured(db, review_id, False)


@router.post("/admin/reviews/{review_id}/archive", response_model=ReviewResponse)
async def admin_archive_review(
    review_id: int,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> ReviewResponse:
    return await archive_review(db, review_id)
