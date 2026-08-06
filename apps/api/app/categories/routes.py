from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import AdminUser
from app.auth.services import get_current_admin, require_csrf
from app.categories.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    PublicCategoryResponse,
    ReorderItem,
)
from app.categories.services import (
    archive_category,
    create_category,
    get_category,
    list_admin_categories,
    list_public_categories,
    reorder_categories,
    update_category,
)
from app.db.session import get_db_session

router = APIRouter(prefix="/api")


@router.get("/public/categories", response_model=list[PublicCategoryResponse])
async def public_categories(db: AsyncSession = Depends(get_db_session)) -> list[PublicCategoryResponse]:
    return [PublicCategoryResponse.model_validate(category) for category in await list_public_categories(db)]


@router.get("/admin/categories", response_model=list[CategoryResponse])
async def admin_categories(
    db: AsyncSession = Depends(get_db_session),
    _user: AdminUser = Depends(get_current_admin),
) -> list[CategoryResponse]:
    return [CategoryResponse.model_validate(category) for category in await list_admin_categories(db)]


@router.get("/admin/categories/{category_id}", response_model=CategoryResponse)
async def admin_category(
    category_id: int,
    db: AsyncSession = Depends(get_db_session),
    _user: AdminUser = Depends(get_current_admin),
) -> CategoryResponse:
    return CategoryResponse.model_validate(await get_category(db, category_id))


@router.post("/admin/categories", response_model=CategoryResponse, status_code=201)
async def admin_create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> CategoryResponse:
    return CategoryResponse.model_validate(await create_category(db, payload))


@router.patch("/admin/categories/{category_id}", response_model=CategoryResponse)
async def admin_update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> CategoryResponse:
    return CategoryResponse.model_validate(await update_category(db, category_id, payload))


@router.post("/admin/categories/reorder", response_model=list[CategoryResponse])
async def admin_reorder_categories(
    payload: list[ReorderItem],
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> list[CategoryResponse]:
    return [CategoryResponse.model_validate(category) for category in await reorder_categories(db, payload)]


@router.post("/admin/categories/{category_id}/archive", response_model=CategoryResponse)
async def admin_archive_category(
    category_id: int,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> CategoryResponse:
    return CategoryResponse.model_validate(await archive_category(db, category_id))
