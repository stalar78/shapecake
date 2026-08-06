from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.site_settings.models import SiteSettings

DEFAULT_SITE_SETTINGS = {
    "id": 1,
    "hero_title": "Cake & Shape",
    "hero_text": "Custom desserts for memorable moments.",
    "phone": "",
    "email": "",
    "whatsapp_url": "",
    "telegram_url": "",
    "social_url": "",
    "address_text": "",
    "delivery_text": "",
    "pickup_text": "",
    "prepayment_text": "",
    "order_terms_text": "",
    "working_hours_text": "",
}


async def get_or_create_site_settings(db: AsyncSession) -> SiteSettings:
    settings = await db.get(SiteSettings, 1)
    if settings is not None:
        return settings
    settings = SiteSettings(**DEFAULT_SITE_SETTINGS)
    db.add(settings)
    await db.commit()
    await db.refresh(settings)
    return settings


async def get_site_settings(db: AsyncSession) -> SiteSettings:
    settings = await db.get(SiteSettings, 1)
    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Site settings singleton is not initialized",
        )
    return settings
