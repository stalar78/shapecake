from __future__ import annotations

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.media.storage import LocalMediaStorage
from app.site_settings.models import SiteSettings
from app.site_settings.schemas import SiteSettingsResponse

DEFAULT_SITE_SETTINGS = {
    "id": 1,
    "hero_title": "Cake & Shape",
    "hero_text": "Custom desserts for memorable moments.",
    "about_master_title": "About the master",
    "about_master_text": "",
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


def site_settings_response(site_settings: SiteSettings, settings: Settings) -> SiteSettingsResponse:
    data = {
        column.name: getattr(site_settings, column.name)
        for column in SiteSettings.__table__.columns
    }
    if site_settings.about_master_image_storage_key:
        storage = LocalMediaStorage(
            settings.media_root,
            settings.media_public_base_url,
            settings.max_upload_bytes,
        )
        data["about_master_image_url"] = storage.media_url(site_settings.about_master_image_storage_key)
    else:
        data["about_master_image_url"] = None
    if site_settings.craft_image_storage_key:
        storage = LocalMediaStorage(
            settings.media_root,
            settings.media_public_base_url,
            settings.max_upload_bytes,
        )
        data["craft_image_url"] = storage.media_url(site_settings.craft_image_storage_key)
    else:
        data["craft_image_url"] = None
    return SiteSettingsResponse.model_validate(data)


async def update_about_master_image(
    db: AsyncSession,
    file: UploadFile,
    settings: Settings,
) -> SiteSettings:
    return await update_site_settings_image(db, file, settings, "about_master_image")


async def update_craft_image(
    db: AsyncSession,
    file: UploadFile,
    settings: Settings,
) -> SiteSettings:
    return await update_site_settings_image(db, file, settings, "craft_image")


async def update_site_settings_image(
    db: AsyncSession,
    file: UploadFile,
    settings: Settings,
    prefix: str,
) -> SiteSettings:
    site_settings = await get_site_settings(db)
    storage = LocalMediaStorage(
        settings.media_root,
        settings.media_public_base_url,
        settings.max_upload_bytes,
    )
    storage_key_field = f"{prefix}_storage_key"
    original_filename_field = f"{prefix}_original_filename"
    mime_type_field = f"{prefix}_mime_type"
    file_size_field = f"{prefix}_file_size"
    old_storage_key = getattr(site_settings, storage_key_field)
    storage_key, original_filename, mime_type, file_size = await storage.save_upload(file)
    setattr(site_settings, storage_key_field, storage_key)
    setattr(site_settings, original_filename_field, original_filename)
    setattr(site_settings, mime_type_field, mime_type)
    setattr(site_settings, file_size_field, file_size)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        storage.delete(storage_key)
        raise
    if old_storage_key:
        storage.delete(old_storage_key)
    await db.refresh(site_settings)
    return site_settings
