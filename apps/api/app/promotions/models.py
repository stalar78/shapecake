from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.desserts.models import Dessert


class Promotion(TimestampMixin, Base):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(primary_key=True)
    dessert_id: Mapped[int | None] = mapped_column(ForeignKey("desserts.id", ondelete="SET NULL"), nullable=True, index=True)
    slug: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False, default="", server_default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    dessert: Mapped[Dessert | None] = relationship()

    __table_args__ = (
        CheckConstraint("ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at", name="ck_promotions_schedule_order"),
        Index("ix_promotions_public_order", "is_published", "archived_at", "starts_at", "ends_at", "sort_order", "id"),
    )

