from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import AdminUser
from app.auth.services import get_current_admin, require_csrf
from app.db.session import get_db_session
from app.inquiries.schemas import (
    AdminInquiryListResponse,
    AdminInquiryResponse,
    InquiryTransitionRequest,
    InquiryUpdate,
    PreferredContactChannel,
    PublicInquiryAcknowledgement,
    PublicInquiryCreate,
)
from app.inquiries.services import (
    create_public_inquiry,
    get_inquiry,
    list_inquiries,
    transition_inquiry,
    update_inquiry_notes,
)
from app.inquiries.status import InquiryStatus
from app.notifications.adapter import NotificationAdapter, get_notification_adapter

router = APIRouter(prefix="/api")


@router.post("/public/inquiries", response_model=PublicInquiryAcknowledgement, status_code=status.HTTP_201_CREATED)
async def public_create_inquiry(
    payload: PublicInquiryCreate,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    adapter: NotificationAdapter = Depends(get_notification_adapter),
) -> PublicInquiryAcknowledgement:
    inquiry = await create_public_inquiry(db, payload, request, adapter)
    return PublicInquiryAcknowledgement(
        acknowledgement="Inquiry received",
        public_reference=inquiry.public_reference,
        created_at=inquiry.created_at,
    )


@router.get("/admin/inquiries", response_model=AdminInquiryListResponse)
async def admin_inquiries(
    status_filter: InquiryStatus | None = Query(default=None, alias="status"),
    preferred_contact_channel: PreferredContactChannel | None = None,
    dessert_id: int | None = Query(default=None, ge=1),
    requested_from: date | None = None,
    requested_to: date | None = None,
    created_from: date | None = None,
    created_to: date | None = None,
    search: str | None = Query(default=None, max_length=160),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db_session),
    _user: AdminUser = Depends(get_current_admin),
) -> AdminInquiryListResponse:
    items, total = await list_inquiries(
        db,
        inquiry_status=status_filter,
        preferred_contact_channel=preferred_contact_channel,
        dessert_id=dessert_id,
        requested_from=requested_from,
        requested_to=requested_to,
        created_from=created_from,
        created_to=created_to,
        search=search,
        limit=limit,
        offset=offset,
    )
    return AdminInquiryListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/admin/inquiries/{inquiry_id}", response_model=AdminInquiryResponse)
async def admin_inquiry(
    inquiry_id: int,
    db: AsyncSession = Depends(get_db_session),
    _user: AdminUser = Depends(get_current_admin),
) -> AdminInquiryResponse:
    return AdminInquiryResponse.model_validate(await get_inquiry(db, inquiry_id))


@router.patch("/admin/inquiries/{inquiry_id}", response_model=AdminInquiryResponse)
async def admin_update_inquiry(
    inquiry_id: int,
    payload: InquiryUpdate,
    db: AsyncSession = Depends(get_db_session),
    _csrf: None = Depends(require_csrf),
) -> AdminInquiryResponse:
    return await update_inquiry_notes(db, inquiry_id, payload.internal_notes)


@router.post("/admin/inquiries/{inquiry_id}/transition", response_model=AdminInquiryResponse)
async def admin_transition_inquiry(
    inquiry_id: int,
    payload: InquiryTransitionRequest,
    db: AsyncSession = Depends(get_db_session),
    admin: AdminUser = Depends(get_current_admin),
    _csrf: None = Depends(require_csrf),
) -> AdminInquiryResponse:
    return await transition_inquiry(db, inquiry_id, payload.target_status, admin)
