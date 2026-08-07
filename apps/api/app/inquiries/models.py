from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.auth.models import AdminUser
    from app.desserts.models import Dessert, DessertVariant


class Inquiry(TimestampMixin, Base):
    __tablename__ = "inquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    public_reference: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    dessert_id: Mapped[int | None] = mapped_column(ForeignKey("desserts.id", ondelete="SET NULL"), nullable=True, index=True)
    dessert_name_snapshot: Mapped[str | None] = mapped_column(String(160), nullable=True)
    variant_id: Mapped[int | None] = mapped_column(
        ForeignKey("dessert_variants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    variant_weight_value_snapshot: Mapped[str | None] = mapped_column(String(32), nullable=True)
    variant_weight_unit_snapshot: Mapped[str | None] = mapped_column(String(8), nullable=True)
    fulfillment_method: Mapped[str] = mapped_column(String(16), nullable=False, default="pickup", server_default="pickup")
    recipe_preferences: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    decor_preferences: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    customer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    preferred_contact_channel: Mapped[str] = mapped_column(String(16), nullable=False)
    requested_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    consent_personal_data: Mapped[bool] = mapped_column(Boolean, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="new", server_default="new")
    internal_notes: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    duplicate_fingerprint_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    spam_marked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    dessert: Mapped[Dessert | None] = relationship()
    variant: Mapped[DessertVariant | None] = relationship()
    status_history: Mapped[list[InquiryStatusHistory]] = relationship(
        back_populates="inquiry",
        cascade="all, delete-orphan",
        order_by="(InquiryStatusHistory.changed_at, InquiryStatusHistory.id)",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('new', 'in_progress', 'waiting_customer', 'confirmed', 'completed', 'cancelled', 'spam')",
            name="ck_inquiries_status",
        ),
        CheckConstraint(
            "preferred_contact_channel IN ('phone', 'email', 'whatsapp', 'telegram')",
            name="ck_inquiries_preferred_contact_channel",
        ),
        CheckConstraint(
            "fulfillment_method IN ('pickup', 'delivery')",
            name="ck_inquiries_fulfillment_method",
        ),
        CheckConstraint("consent_personal_data IS TRUE", name="ck_inquiries_consent_true"),
        CheckConstraint("phone IS NOT NULL OR email IS NOT NULL", name="ck_inquiries_contact_present"),
        CheckConstraint("quantity IS NULL OR (quantity > 0 AND quantity <= 10000)", name="ck_inquiries_quantity_range"),
        Index("ix_inquiries_status", "status"),
        Index("ix_inquiries_created_at", "created_at"),
        Index("ix_inquiries_requested_date", "requested_date"),
        Index("ix_inquiries_duplicate_fingerprint_hash", "duplicate_fingerprint_hash"),
    )


class InquiryStatusHistory(Base):
    __tablename__ = "inquiry_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    inquiry_id: Mapped[int] = mapped_column(ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[str] = mapped_column(String(24), nullable=False)
    to_status: Mapped[str] = mapped_column(String(24), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    administrator_id: Mapped[int | None] = mapped_column(ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)

    inquiry: Mapped[Inquiry] = relationship(back_populates="status_history")
    administrator: Mapped[AdminUser | None] = relationship()

    __table_args__ = (
        CheckConstraint(
            "from_status IN ('new', 'in_progress', 'waiting_customer', 'confirmed', 'completed', 'cancelled', 'spam')",
            name="ck_inquiry_status_history_from_status",
        ),
        CheckConstraint(
            "to_status IN ('new', 'in_progress', 'waiting_customer', 'confirmed', 'completed', 'cancelled', 'spam')",
            name="ck_inquiry_status_history_to_status",
        ),
    )
