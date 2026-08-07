from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel
from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.desserts.models import Dessert
from app.inquiries.models import Inquiry
from app.inquiries.status import InquiryStatus
from app.promotions.models import Promotion


class OverviewInquiry(BaseModel):
    id: int
    public_reference: str
    status: InquiryStatus
    dessert_name_snapshot: str | None
    requested_date: str | None
    created_at: datetime


class OverviewPromotion(BaseModel):
    id: int
    slug: str
    title: str
    starts_at: datetime | None
    ends_at: datetime | None


class AdminOverviewResponse(BaseModel):
    published_dessert_count: int
    hidden_unpublished_dessert_count: int
    new_inquiry_count: int
    recent_inquiries: list[OverviewInquiry]
    active_promotion_count: int
    active_promotions: list[OverviewPromotion]


def _active_promotion_query() -> Select[tuple[Promotion]]:
    now = datetime.now(UTC)
    return select(Promotion).where(
        Promotion.is_published.is_(True),
        Promotion.archived_at.is_(None),
        or_(Promotion.starts_at.is_(None), Promotion.starts_at <= now),
        or_(Promotion.ends_at.is_(None), Promotion.ends_at > now),
    )


async def get_admin_overview(db: AsyncSession) -> AdminOverviewResponse:
    published_dessert_count = int(
        await db.scalar(
            select(func.count())
            .select_from(Dessert)
            .where(Dessert.archived_at.is_(None), Dessert.is_published.is_(True))
        )
        or 0
    )
    hidden_unpublished_dessert_count = int(
        await db.scalar(
            select(func.count())
            .select_from(Dessert)
            .where(Dessert.archived_at.is_(None), Dessert.is_published.is_(False))
        )
        or 0
    )
    new_inquiry_count = int(
        await db.scalar(select(func.count()).select_from(Inquiry).where(Inquiry.status == "new")) or 0
    )

    inquiries_result = await db.execute(
        select(
            Inquiry.id,
            Inquiry.public_reference,
            Inquiry.status,
            Inquiry.dessert_name_snapshot,
            Inquiry.requested_date,
            Inquiry.created_at,
        )
        .order_by(Inquiry.created_at.desc(), Inquiry.id.desc())
        .limit(5)
    )
    recent_inquiries = [
        OverviewInquiry(
            id=row.id,
            public_reference=row.public_reference,
            status=row.status,
            dessert_name_snapshot=row.dessert_name_snapshot,
            requested_date=row.requested_date.isoformat() if row.requested_date is not None else None,
            created_at=row.created_at,
        )
        for row in inquiries_result
    ]

    active_query = _active_promotion_query()
    active_promotion_count = int(
        await db.scalar(select(func.count()).select_from(active_query.subquery())) or 0
    )
    promotions_result = await db.execute(
        active_query.order_by(Promotion.sort_order, Promotion.id).limit(5)
    )
    active_promotions = [
        OverviewPromotion.model_validate(
            {
                "id": promotion.id,
                "slug": promotion.slug,
                "title": promotion.title,
                "starts_at": promotion.starts_at,
                "ends_at": promotion.ends_at,
            }
        )
        for promotion in promotions_result.scalars()
    ]

    return AdminOverviewResponse(
        published_dessert_count=published_dessert_count,
        hidden_unpublished_dessert_count=hidden_unpublished_dessert_count,
        new_inquiry_count=new_inquiry_count,
        recent_inquiries=recent_inquiries,
        active_promotion_count=active_promotion_count,
        active_promotions=active_promotions,
    )
