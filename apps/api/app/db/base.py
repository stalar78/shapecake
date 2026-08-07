from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


from app.auth import models as _auth_models  # noqa: F401
from app.categories import models as _category_models  # noqa: F401
from app.desserts import models as _dessert_models  # noqa: F401
from app.inquiries import models as _inquiry_models  # noqa: F401
from app.site_settings import models as _site_settings_models  # noqa: F401
