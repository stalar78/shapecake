from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.categories.models import Category
from app.categories.schemas import CategoryCreate, CategoryUpdate, ReorderItem
from app.desserts.models import Dessert


def _now() -> datetime:
    return datetime.now(UTC)


def _constraint_name(exc: IntegrityError) -> str:
    original = getattr(exc, "orig", None)
    sqlstate = getattr(original, "sqlstate", "") or ""
    message = f"{original} {exc}"
    if sqlstate == "23505" and ("uq_categories_slug" in message or "categories_slug_key" in message):
        return "uq_categories_slug"
    return ""


def _map_category_integrity_error(exc: IntegrityError) -> HTTPException:
    if _constraint_name(exc) == "uq_categories_slug":
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists")
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Catalog integrity conflict")


async def list_admin_categories(db: AsyncSession) -> list[Category]:
    result = await db.execute(select(Category).order_by(Category.sort_order, Category.id))
    return list(result.scalars())


async def list_public_categories(db: AsyncSession) -> list[Category]:
    result = await db.execute(
        select(Category)
        .where(Category.archived_at.is_(None), Category.is_visible.is_(True))
        .order_by(Category.sort_order, Category.id)
    )
    return list(result.scalars())


async def get_category(db: AsyncSession, category_id: int) -> Category:
    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


async def ensure_active_category(db: AsyncSession, category_id: int) -> Category:
    category = await get_category(db, category_id)
    if category.archived_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category is archived")
    return category


async def create_category(db: AsyncSession, payload: CategoryCreate) -> Category:
    category = Category(**payload.model_dump())
    db.add(category)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_category_integrity_error(exc) from exc
    await db.refresh(category)
    return category


async def update_category(db: AsyncSession, category_id: int, payload: CategoryUpdate) -> Category:
    category = await get_category(db, category_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, key, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _map_category_integrity_error(exc) from exc
    await db.refresh(category)
    return category


async def reorder_categories(db: AsyncSession, items: list[ReorderItem]) -> list[Category]:
    categories = {category.id: category for category in await list_admin_categories(db)}
    for item in items:
        if item.id not in categories:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        categories[item.id].sort_order = item.sort_order
    await db.commit()
    return await list_admin_categories(db)


async def archive_category(db: AsyncSession, category_id: int) -> Category:
    category = await get_category(db, category_id)
    result = await db.execute(
        select(Dessert.id).where(
            Dessert.category_id == category.id,
            Dessert.archived_at.is_(None),
        )
    )
    if result.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot archive category with active desserts",
        )
    category.archived_at = _now()
    await db.commit()
    await db.refresh(category)
    return category


async def get_category_with_desserts(db: AsyncSession, category_id: int) -> Category:
    result = await db.execute(
        select(Category).options(selectinload(Category.desserts)).where(Category.id == category_id)
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category
