from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Literal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.categories.models import Category

WeightUnit = Literal["g", "kg", "pcs"]


class Dessert(TimestampMixin, Base):
    __tablename__ = "desserts"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    short_description: Mapped[str] = mapped_column(String(500), nullable=False, default="", server_default="")
    full_description: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    ingredients: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    allergens: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    warnings: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    calories: Mapped[int | None] = mapped_column(Integer, nullable=True)
    proteins: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    fats: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    carbohydrates: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    preparation_time_text: Mapped[str] = mapped_column(String(120), nullable=False, default="", server_default="")
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    is_sugar_free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_gluten_free: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_low_calorie: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_bento: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_new: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_popular: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_seasonal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    category: Mapped[Category] = relationship(back_populates="desserts")
    variants: Mapped[list[DessertVariant]] = relationship(
        back_populates="dessert", cascade="all, delete-orphan"
    )
    images: Mapped[list[DessertImage]] = relationship(
        back_populates="dessert", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("calories IS NULL OR calories >= 0", name="ck_desserts_calories_non_negative"),
        CheckConstraint("proteins IS NULL OR proteins >= 0", name="ck_desserts_proteins_non_negative"),
        CheckConstraint("fats IS NULL OR fats >= 0", name="ck_desserts_fats_non_negative"),
        CheckConstraint(
            "carbohydrates IS NULL OR carbohydrates >= 0",
            name="ck_desserts_carbohydrates_non_negative",
        ),
    )


class DessertVariant(TimestampMixin, Base):
    __tablename__ = "dessert_variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    dessert_id: Mapped[int] = mapped_column(ForeignKey("desserts.id", ondelete="CASCADE"), index=True)
    weight_value: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    weight_unit: Mapped[str] = mapped_column(String(8), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    old_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    dessert: Mapped[Dessert] = relationship(back_populates="variants")

    __table_args__ = (
        CheckConstraint("weight_value > 0", name="ck_dessert_variants_weight_positive"),
        CheckConstraint("weight_unit IN ('g', 'kg', 'pcs')", name="ck_dessert_variants_weight_unit"),
        CheckConstraint("price >= 0", name="ck_dessert_variants_price_non_negative"),
        CheckConstraint(
            "old_price IS NULL OR old_price > price",
            name="ck_dessert_variants_old_price_gt_price",
        ),
        Index(
            "uq_dessert_variants_active_weight",
            "dessert_id",
            "weight_value",
            "weight_unit",
            unique=True,
            postgresql_where=archived_at.is_(None),
        ),
    )


class DessertImage(Base):
    __tablename__ = "dessert_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    dessert_id: Mapped[int] = mapped_column(ForeignKey("desserts.id", ondelete="CASCADE"), index=True)
    storage_key: Mapped[str] = mapped_column(String(300), nullable=False, unique=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(80), nullable=False)
    width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    alt_text: Mapped[str] = mapped_column(String(255), nullable=False, default="", server_default="")
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    dessert: Mapped[Dessert] = relationship(back_populates="images")

    __table_args__ = (
        CheckConstraint("file_size > 0", name="ck_dessert_images_file_size_positive"),
        CheckConstraint(
            "mime_type IN ('image/jpeg', 'image/png', 'image/webp')",
            name="ck_dessert_images_mime_type",
        ),
        Index(
            "uq_dessert_images_active_primary",
            "dessert_id",
            unique=True,
            postgresql_where=is_primary.is_(True) & deleted_at.is_(None),
        ),
    )
