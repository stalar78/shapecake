from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import AdminSession, AdminUser
from app.core.config import Settings, get_settings
from app.db.session import get_db_session


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_token(token: str, pepper: str) -> str:
    return hmac.new(pepper.encode(), token.encode(), hashlib.sha256).hexdigest()


def _now() -> datetime:
    return datetime.now(UTC)


def make_csrf_token(csrf_secret: str, session_token: str, pepper: str) -> str:
    signature = hmac.new(
        pepper.encode(),
        f"{csrf_secret}.{session_token}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{csrf_secret}.{signature}"


def verify_csrf_token(csrf_token: str, csrf_secret: str, session_token: str, pepper: str) -> bool:
    expected = make_csrf_token(csrf_secret, session_token, pepper)
    return hmac.compare_digest(csrf_token, expected)


async def create_admin_session(
    db: AsyncSession,
    user: AdminUser,
    settings: Settings,
) -> tuple[AdminSession, str]:
    now = _now()
    token = secrets.token_urlsafe(48)
    session = AdminSession(
        admin_user_id=user.id,
        token_hash=_hash_token(token, settings.session_hash_pepper),
        csrf_secret=secrets.token_urlsafe(32),
        expires_at=now + timedelta(seconds=settings.session_absolute_timeout_seconds),
        last_activity_at=now,
        revoked_at=None,
        created_at=now,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session, token


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        domain=settings.session_cookie_domain or None,
        path="/",
        max_age=settings.session_absolute_timeout_seconds,
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        domain=settings.session_cookie_domain or None,
        path="/",
        samesite=settings.session_cookie_samesite,
        secure=settings.session_cookie_secure,
        httponly=True,
    )


async def get_current_session(
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> tuple[AdminSession, str]:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    result = await db.execute(
        select(AdminSession)
        .options(selectinload(AdminSession.admin_user))
        .where(AdminSession.token_hash == _hash_token(token, settings.session_hash_pepper))
    )
    session = result.scalar_one_or_none()
    now = _now()
    if (
        session is None
        or session.revoked_at is not None
        or session.expires_at <= now
        or session.last_activity_at + timedelta(seconds=settings.session_idle_timeout_seconds) <= now
        or not session.admin_user.is_active
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    session.last_activity_at = now
    await db.commit()
    return session, token


async def get_current_admin(
    current: tuple[AdminSession, str] = Depends(get_current_session),
) -> AdminUser:
    return current[0].admin_user


async def require_csrf(
    request: Request,
    current: tuple[AdminSession, str] = Depends(get_current_session),
    settings: Settings = Depends(get_settings),
) -> None:
    session, token = current
    csrf_token = request.headers.get("x-csrf-token")
    if not csrf_token or not verify_csrf_token(
        csrf_token, session.csrf_secret, token, settings.session_hash_pepper
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")
