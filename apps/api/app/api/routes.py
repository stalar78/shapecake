from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.overview import AdminOverviewResponse, get_admin_overview
from app.auth.models import AdminSession, AdminUser
from app.auth.passwords import verify_password
from app.auth.rate_limit import login_rate_limiter
from app.auth.schemas import AdminUserResponse, CsrfResponse, LoginRequest
from app.auth.services import (
    clear_session_cookie,
    create_admin_session,
    get_current_admin,
    get_current_session,
    make_csrf_token,
    normalize_email,
    require_csrf,
    set_session_cookie,
)
from app.core.config import Settings, get_settings
from app.db.session import get_db_session
from app.site_settings.schemas import SiteSettingsResponse, SiteSettingsUpdate
from app.site_settings.services import (
    get_site_settings,
    site_settings_response,
    update_about_master_image,
    update_craft_image,
)

router = APIRouter(prefix="/api")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def ready(db: AsyncSession = Depends(get_db_session)) -> dict[str, str]:
    await db.execute(text("SELECT 1"))
    return {"status": "ready"}


@router.get("/public/site-settings", response_model=SiteSettingsResponse)
async def public_site_settings(
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> SiteSettingsResponse:
    site_settings = await get_site_settings(db)
    return site_settings_response(site_settings, settings)


@router.post("/admin/auth/login", response_model=AdminUserResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> AdminUserResponse:
    email = normalize_email(payload.email)
    limiter_key = f"{request.client.host if request.client else 'unknown'}:{email}"
    if not login_rate_limiter.allow(limiter_key):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts")

    result = await db.execute(select(AdminUser).where(AdminUser.email == email))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(user.password_hash, payload.password):
        login_rate_limiter.record_failure(limiter_key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    await db.execute(
        update(AdminSession)
        .where(AdminSession.admin_user_id == user.id, AdminSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC))
    )
    _session, token = await create_admin_session(db, user, settings)
    set_session_cookie(response, token, settings)
    login_rate_limiter.record_success(limiter_key)
    return AdminUserResponse(id=user.id, email=user.email)


@router.post("/admin/auth/logout")
async def logout(
    response: Response,
    current: tuple[AdminSession, str] = Depends(get_current_session),
    db: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    session, _token = current
    session.revoked_at = datetime.now(UTC)
    await db.commit()
    clear_session_cookie(response, settings)
    return {"status": "logged_out"}


@router.get("/admin/auth/me", response_model=AdminUserResponse)
async def me(user: AdminUser = Depends(get_current_admin)) -> AdminUserResponse:
    return AdminUserResponse(id=user.id, email=user.email)


@router.get("/admin/auth/csrf", response_model=CsrfResponse)
async def csrf(
    current: tuple[AdminSession, str] = Depends(get_current_session),
    settings: Settings = Depends(get_settings),
) -> CsrfResponse:
    session, token = current
    return CsrfResponse(
        csrf_token=make_csrf_token(session.csrf_secret, token, settings.session_hash_pepper)
    )


@router.get("/admin/overview", response_model=AdminOverviewResponse)
async def admin_overview(
    db: AsyncSession = Depends(get_db_session),
    _user: AdminUser = Depends(get_current_admin),
) -> AdminOverviewResponse:
    return await get_admin_overview(db)


@router.get("/admin/site-settings", response_model=SiteSettingsResponse)
async def admin_site_settings(
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _user: AdminUser = Depends(get_current_admin),
) -> SiteSettingsResponse:
    site_settings = await get_site_settings(db)
    return site_settings_response(site_settings, settings)


@router.patch("/admin/site-settings", response_model=SiteSettingsResponse)
async def update_site_settings(
    payload: SiteSettingsUpdate,
    db: AsyncSession = Depends(get_db_session),
    app_settings: Settings = Depends(get_settings),
    _csrf: None = Depends(require_csrf),
) -> SiteSettingsResponse:
    settings = await get_site_settings(db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return site_settings_response(settings, app_settings)


@router.post("/admin/site-settings/about-master-image", response_model=SiteSettingsResponse)
async def upload_about_master_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _user: AdminUser = Depends(get_current_admin),
    _csrf: None = Depends(require_csrf),
) -> SiteSettingsResponse:
    site_settings = await update_about_master_image(db, file, settings)
    return site_settings_response(site_settings, settings)


@router.post("/admin/site-settings/craft-image", response_model=SiteSettingsResponse)
async def upload_craft_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
    _user: AdminUser = Depends(get_current_admin),
    _csrf: None = Depends(require_csrf),
) -> SiteSettingsResponse:
    site_settings = await update_craft_image(db, file, settings)
    return site_settings_response(site_settings, settings)
