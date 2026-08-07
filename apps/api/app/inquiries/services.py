from __future__ import annotations

import hashlib
import logging
import secrets
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import cast

from fastapi import HTTPException, Request, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import AdminUser
from app.categories.models import Category
from app.desserts.models import Dessert, DessertVariant
from app.inquiries.models import Inquiry, InquiryStatusHistory
from app.inquiries.schemas import AdminInquiryResponse, PublicInquiryCreate
from app.inquiries.status import InquiryStatus, assert_transition_allowed
from app.notifications.adapter import NotificationAdapter

logger = logging.getLogger("app.inquiries")

DUPLICATE_WINDOW = timedelta(minutes=30)


@dataclass
class InMemoryInquiryRateLimiter:
    max_attempts: int = 10
    window: timedelta = timedelta(minutes=10)
    max_tracked_keys: int = 1000
    attempts: dict[str, list[datetime]] = field(default_factory=dict)

    def allow(self, key: str) -> bool:
        now = _now()
        self._prune(now)
        if key not in self.attempts and len(self.attempts) >= self.max_tracked_keys:
            self._evict_oldest()
        self.attempts[key] = [item for item in self.attempts.get(key, []) if now - item < self.window]
        if len(self.attempts[key]) >= self.max_attempts:
            return False
        self.attempts[key].append(now)
        return True

    def _prune(self, now: datetime) -> None:
        for key, timestamps in list(self.attempts.items()):
            active = [item for item in timestamps if now - item < self.window]
            if active:
                self.attempts[key] = active
            else:
                self.attempts.pop(key, None)

    def _evict_oldest(self) -> None:
        if not self.attempts:
            return
        oldest_key = min(
            self.attempts,
            key=lambda item: min(self.attempts[item]) if self.attempts[item] else datetime.min.replace(tzinfo=UTC),
        )
        self.attempts.pop(oldest_key, None)

    def clear(self) -> None:
        self.attempts.clear()


inquiry_rate_limiter = InMemoryInquiryRateLimiter()


def _now() -> datetime:
    return datetime.now(UTC)


def _public_reference() -> str:
    return secrets.token_urlsafe(12)


def _fingerprint(payload: PublicInquiryCreate) -> str:
    normalized = "|".join(
        [
            payload.phone or "",
            payload.email or "",
            str(payload.dessert_id or ""),
            str(payload.variant_id or ""),
            payload.fulfillment_method,
            payload.requested_date.isoformat() if payload.requested_date else "",
            str(payload.quantity or ""),
            " ".join(payload.recipe_preferences.lower().split()),
            " ".join(payload.decor_preferences.lower().split()),
            " ".join(payload.message.lower().split()),
        ]
    )
    return hashlib.sha256(normalized.encode()).hexdigest()


def _client_key(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    return hashlib.sha256(host.encode()).hexdigest()


async def _public_dessert(db: AsyncSession, dessert_id: int | None) -> Dessert | None:
    if dessert_id is None:
        return None
    active_variant_exists = (
        select(DessertVariant.id)
        .where(DessertVariant.dessert_id == Dessert.id, DessertVariant.archived_at.is_(None))
        .exists()
    )
    result = await db.execute(
        select(Dessert)
        .join(Category, Dessert.category_id == Category.id)
        .options(selectinload(Dessert.category))
        .where(
            Dessert.id == dessert_id,
            Dessert.archived_at.is_(None),
            Dessert.is_published.is_(True),
            Dessert.is_available.is_(True),
            Category.archived_at.is_(None),
            Category.is_visible.is_(True),
            active_variant_exists,
        )
    )
    dessert = result.scalar_one_or_none()
    if dessert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dessert not found")
    return dessert


async def _public_variant(
    db: AsyncSession,
    dessert: Dessert | None,
    variant_id: int | None,
) -> DessertVariant | None:
    if variant_id is None:
        return None
    if dessert is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Variant requires a dessert",
        )
    variant = await db.get(DessertVariant, variant_id)
    if variant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    if variant.dessert_id != dessert.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Variant does not belong to the selected dessert",
        )
    if variant.archived_at is not None or not variant.is_available:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Variant is not available",
        )
    return variant


async def create_public_inquiry(
    db: AsyncSession,
    payload: PublicInquiryCreate,
    request: Request,
    adapter: NotificationAdapter,
) -> Inquiry:
    if not inquiry_rate_limiter.allow(_client_key(request)):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many inquiry attempts")

    dessert = await _public_dessert(db, payload.dessert_id)
    variant = await _public_variant(db, dessert, payload.variant_id)
    fingerprint = _fingerprint(payload)
    duplicate_cutoff = _now() - DUPLICATE_WINDOW
    duplicate = await db.scalar(
        select(Inquiry.id).where(
            Inquiry.duplicate_fingerprint_hash == fingerprint,
            Inquiry.created_at >= duplicate_cutoff,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate inquiry already received")

    now = _now()
    inquiry = Inquiry(
        public_reference=_public_reference(),
        dessert_id=dessert.id if dessert else None,
        dessert_name_snapshot=dessert.name if dessert else None,
        variant_id=variant.id if variant else None,
        variant_weight_value_snapshot=str(variant.weight_value) if variant else None,
        variant_weight_unit_snapshot=variant.weight_unit if variant else None,
        fulfillment_method=payload.fulfillment_method,
        recipe_preferences=payload.recipe_preferences,
        decor_preferences=payload.decor_preferences,
        customer_name=payload.customer_name,
        phone=payload.phone,
        email=payload.email,
        preferred_contact_channel=payload.preferred_contact_channel,
        requested_date=payload.requested_date,
        quantity=payload.quantity,
        message=payload.message,
        consent_personal_data=True,
        status="new",
        internal_notes="",
        duplicate_fingerprint_hash=fingerprint,
        status_changed_at=now,
    )
    db.add(inquiry)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inquiry could not be accepted",
        ) from exc
    await db.refresh(inquiry)

    try:
        await adapter.inquiry_created(inquiry.public_reference)
    except Exception:  # noqa: BLE001 - notification adapters must never roll back accepted inquiries.
        logger.error("Inquiry notification failed for reference %s", inquiry.public_reference)
    return await get_inquiry(db, inquiry.id)


def _base_query() -> Select[tuple[Inquiry]]:
    return select(Inquiry).options(selectinload(Inquiry.dessert), selectinload(Inquiry.status_history))


def _response(inquiry: Inquiry) -> AdminInquiryResponse:
    return AdminInquiryResponse.model_validate(inquiry)


async def list_inquiries(
    db: AsyncSession,
    inquiry_status: InquiryStatus | None = None,
    preferred_contact_channel: str | None = None,
    dessert_id: int | None = None,
    requested_from: date | None = None,
    requested_to: date | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    search: str | None = None,
    limit: int = 25,
    offset: int = 0,
) -> tuple[list[AdminInquiryResponse], int]:
    query = _base_query()
    if inquiry_status is not None:
        query = query.where(Inquiry.status == inquiry_status)
    if preferred_contact_channel is not None:
        query = query.where(Inquiry.preferred_contact_channel == preferred_contact_channel)
    if dessert_id is not None:
        query = query.where(Inquiry.dessert_id == dessert_id)
    if requested_from is not None:
        query = query.where(Inquiry.requested_date >= requested_from)
    if requested_to is not None:
        query = query.where(Inquiry.requested_date <= requested_to)
    if created_from is not None:
        query = query.where(func.date(Inquiry.created_at) >= created_from)
    if created_to is not None:
        query = query.where(func.date(Inquiry.created_at) <= created_to)
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Inquiry.customer_name).like(term),
                func.lower(Inquiry.email).like(term),
                Inquiry.phone.like(f"%{search.strip()}%"),
                func.lower(Inquiry.public_reference).like(term),
            )
        )

    total = int(await db.scalar(select(func.count()).select_from(query.subquery())) or 0)
    result = await db.execute(query.order_by(Inquiry.created_at.desc(), Inquiry.id.desc()).limit(limit).offset(offset))
    return [_response(inquiry) for inquiry in result.scalars()], total


async def get_inquiry(db: AsyncSession, inquiry_id: int) -> Inquiry:
    result = await db.execute(
        _base_query()
        .where(Inquiry.id == inquiry_id)
        .execution_options(populate_existing=True)
    )
    inquiry = result.scalar_one_or_none()
    if inquiry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
    return inquiry


async def update_inquiry_notes(db: AsyncSession, inquiry_id: int, internal_notes: str) -> AdminInquiryResponse:
    inquiry = await get_inquiry(db, inquiry_id)
    inquiry.internal_notes = internal_notes
    await db.commit()
    return _response(await get_inquiry(db, inquiry_id))


async def transition_inquiry(
    db: AsyncSession,
    inquiry_id: int,
    target_status: InquiryStatus,
    administrator: AdminUser,
) -> AdminInquiryResponse:
    inquiry = await get_inquiry(db, inquiry_id)
    current = cast(InquiryStatus, inquiry.status)
    try:
        assert_transition_allowed(current, target_status)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    now = _now()
    inquiry.status = target_status
    inquiry.status_changed_at = now
    if target_status == "completed":
        inquiry.completed_at = now
    elif target_status == "cancelled":
        inquiry.cancelled_at = now
    elif target_status == "spam":
        inquiry.spam_marked_at = now
    db.add(
        InquiryStatusHistory(
            inquiry_id=inquiry.id,
            from_status=current,
            to_status=target_status,
            changed_at=now,
            administrator_id=administrator.id,
        )
    )
    await db.flush()
    await db.commit()
    return _response(await get_inquiry(db, inquiry_id))
