from __future__ import annotations

from sqlalchemy import CheckConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class SiteSettings(TimestampMixin, Base):
    __tablename__ = "site_settings"
    __table_args__ = (CheckConstraint("id = 1", name="ck_site_settings_singleton_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    hero_title: Mapped[str] = mapped_column(String(200), nullable=False)
    hero_text: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    whatsapp_url: Mapped[str] = mapped_column(String(500), nullable=False)
    telegram_url: Mapped[str] = mapped_column(String(500), nullable=False)
    social_url: Mapped[str] = mapped_column(String(500), nullable=False)
    address_text: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_text: Mapped[str] = mapped_column(Text, nullable=False)
    pickup_text: Mapped[str] = mapped_column(Text, nullable=False)
    prepayment_text: Mapped[str] = mapped_column(Text, nullable=False)
    order_terms_text: Mapped[str] = mapped_column(Text, nullable=False)
    working_hours_text: Mapped[str] = mapped_column(Text, nullable=False)
