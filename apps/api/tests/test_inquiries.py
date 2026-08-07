from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.categories.models import Category
from app.desserts.models import Dessert, DessertVariant
from app.inquiries.models import Inquiry, InquiryStatusHistory
from app.inquiries.services import InMemoryInquiryRateLimiter, inquiry_rate_limiter
from app.notifications.adapter import get_notification_adapter
from tests.conftest import create_admin


@pytest.fixture(autouse=True)
def clear_inquiry_limiter() -> None:
    inquiry_rate_limiter.clear()


class RecordingNotificationAdapter:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.references: list[str] = []

    async def inquiry_created(self, public_reference: str) -> None:
        self.references.append(public_reference)
        if self.fail:
            raise RuntimeError("notification provider unavailable")


async def _login(client: AsyncClient, db: AsyncSession) -> str:
    await create_admin(db)
    response = await client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "Password12345"},
    )
    assert response.status_code == 200
    csrf = await client.get("/api/admin/auth/csrf")
    return csrf.json()["csrf_token"]


async def _public_dessert(
    db: AsyncSession,
    slug: str = "honey-cake",
    *,
    published: bool = True,
    category_visible: bool = True,
    category_archived: bool = False,
) -> Dessert:
    category = Category(name="Cakes", slug=f"{slug}-category")
    category.is_visible = category_visible
    if category_archived:
        category.archived_at = datetime.now(UTC)
    db.add(category)
    await db.commit()
    dessert = Dessert(category_id=category.id, name="Honey Cake", slug=slug, is_published=published)
    db.add(dessert)
    await db.commit()
    db.add(DessertVariant(dessert_id=dessert.id, weight_value=1, weight_unit="kg", price=2500))
    await db.commit()
    await db.refresh(dessert)
    return dessert


def _payload(**overrides: Any) -> dict[str, Any]:
    today = datetime.now(UTC).date()
    payload: dict[str, Any] = {
        "customer_name": "Ada Customer",
        "phone": "+1 (555) 123-4567",
        "email": "ada@example.com",
        "preferred_contact_channel": "email",
        "requested_date": (today + timedelta(days=3)).isoformat(),
        "quantity": 12,
        "message": "Please make a celebration cake.",
        "consent_personal_data": True,
    }
    payload.update(overrides)
    return payload


async def _create_inquiry(client: AsyncClient, **overrides: Any) -> dict[str, Any]:
    response = await client.post("/api/public/inquiries", json=_payload(**overrides))
    assert response.status_code == 201, response.text
    return response.json()


async def _latest_inquiry_id(db: AsyncSession, public_reference: str) -> int:
    inquiry_id = await db.scalar(
        select(Inquiry.id).where(Inquiry.public_reference == public_reference)
    )
    assert inquiry_id is not None
    return inquiry_id


async def test_valid_public_submission_acknowledgement_and_notification(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    adapter = RecordingNotificationAdapter()
    client._transport.app.dependency_overrides[get_notification_adapter] = lambda: adapter
    body = await _create_inquiry(client)

    assert body["acknowledgement"] == "Inquiry received"
    assert body["public_reference"]
    assert "id" not in body
    assert "internal_notes" not in body
    assert adapter.references == [body["public_reference"]]

    stored = (await db_session.execute(Inquiry.__table__.select())).first()
    assert stored is not None
    assert stored.consent_personal_data is True
    assert len(stored.duplicate_fingerprint_hash) == 64
    assert "ada@example.com" not in stored.duplicate_fingerprint_hash
    assert "555" not in stored.duplicate_fingerprint_hash


async def test_public_submission_validation_errors(client: AsyncClient) -> None:
    cases = [
        ({}, 201),
        ({"consent_personal_data": False}, 422),
        ({"consent_personal_data": None}, 422),
        ({"phone": None, "email": None}, 422),
        ({"email": "not-an-email", "preferred_contact_channel": "email"}, 422),
        ({"phone": "call-me", "preferred_contact_channel": "phone"}, 422),
        ({"phone": None, "preferred_contact_channel": "phone"}, 422),
        ({"email": None, "preferred_contact_channel": "email"}, 422),
        ({"requested_date": (datetime.now(UTC).date() - timedelta(days=1)).isoformat()}, 422),
        ({"quantity": 0}, 422),
        ({"quantity": 10001}, 422),
    ]
    for overrides, expected in cases:
        inquiry_rate_limiter.clear()
        response = await client.post("/api/public/inquiries", json=_payload(**overrides))
        assert response.status_code == expected, response.text


async def test_public_dessert_reference_must_be_public_and_active(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    public = await _public_dessert(db_session)
    linked = await _create_inquiry(client, dessert_id=public.id)
    assert linked["public_reference"]

    missing = await client.post("/api/public/inquiries", json=_payload(dessert_id=9999, message="other"))
    assert missing.status_code == 404

    archived = await _public_dessert(db_session, "archived-cake")
    archived.archived_at = datetime.now(UTC)
    await db_session.commit()
    response = await client.post("/api/public/inquiries", json=_payload(dessert_id=archived.id, message="archived"))
    assert response.status_code == 404

    unpublished = await _public_dessert(db_session, "unpublished-cake", published=False)
    response = await client.post(
        "/api/public/inquiries",
        json=_payload(dessert_id=unpublished.id, message="unpublished"),
    )
    assert response.status_code == 404

    hidden_category = await _public_dessert(
        db_session,
        "hidden-category-cake",
        category_visible=False,
    )
    response = await client.post(
        "/api/public/inquiries",
        json=_payload(dessert_id=hidden_category.id, message="hidden category"),
    )
    assert response.status_code == 404

    archived_category = await _public_dessert(
        db_session,
        "archived-category-cake",
        category_archived=True,
    )
    response = await client.post(
        "/api/public/inquiries",
        json=_payload(dessert_id=archived_category.id, message="archived category"),
    )
    assert response.status_code == 404


async def test_duplicate_suppression_and_throttling(client: AsyncClient) -> None:
    first = await client.post("/api/public/inquiries", json=_payload())
    assert first.status_code == 201
    duplicate = await client.post("/api/public/inquiries", json=_payload())
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Duplicate inquiry already received"

    inquiry_rate_limiter.clear()
    for index in range(10):
        response = await client.post("/api/public/inquiries", json=_payload(message=f"message {index}"))
        assert response.status_code == 201
    throttled = await client.post("/api/public/inquiries", json=_payload(message="message throttle"))
    assert throttled.status_code == 429


async def test_x_forwarded_for_rotation_does_not_bypass_throttling(client: AsyncClient) -> None:
    for index in range(10):
        response = await client.post(
            "/api/public/inquiries",
            json=_payload(message=f"xff {index}"),
            headers={"x-forwarded-for": f"203.0.113.{index}"},
        )
        assert response.status_code == 201
    throttled = await client.post(
        "/api/public/inquiries",
        json=_payload(message="xff blocked"),
        headers={"x-forwarded-for": "198.51.100.200"},
    )
    assert throttled.status_code == 429


def test_inquiry_limiter_prunes_expired_entries_and_bounds_keys() -> None:
    limiter = InMemoryInquiryRateLimiter(max_attempts=2, window=timedelta(minutes=10), max_tracked_keys=2)
    expired = datetime.now(UTC) - timedelta(minutes=30)
    limiter.attempts["expired"] = [expired]
    assert limiter.allow("fresh")
    assert "expired" not in limiter.attempts

    assert limiter.allow("second")
    assert limiter.allow("third")
    assert len(limiter.attempts) <= 2
    assert "fresh" not in limiter.attempts
    assert "second" in limiter.attempts
    assert "third" in limiter.attempts


def test_inquiry_limiter_threshold_and_normal_requests() -> None:
    limiter = InMemoryInquiryRateLimiter(max_attempts=2, window=timedelta(minutes=10), max_tracked_keys=10)
    assert limiter.allow("client")
    assert limiter.allow("client")
    assert not limiter.allow("client")


async def test_public_inquiry_read_routes_do_not_exist(client: AsyncClient) -> None:
    assert (await client.get("/api/public/inquiries")).status_code == 405
    assert (await client.get("/api/public/inquiries/1")).status_code == 404


async def test_admin_auth_csrf_detail_notes_filters_and_internal_visibility(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    dessert = await _public_dessert(db_session)
    await _create_inquiry(client, dessert_id=dessert.id, preferred_contact_channel="phone", email=None)
    await _create_inquiry(client, message="second unique inquiry", preferred_contact_channel="email")

    unauthenticated = await client.get("/api/admin/inquiries")
    assert unauthenticated.status_code == 401
    csrf = await _login(client, db_session)
    listing = await client.get("/api/admin/inquiries?preferred_contact_channel=phone&limit=1&offset=0")
    assert listing.status_code == 200
    body = listing.json()
    assert body["total"] == 1
    assert body["items"][0]["dessert"]["slug"] == dessert.slug
    assert body["items"][0]["dessert"]["name"] == dessert.name
    inquiry_id = body["items"][0]["id"]

    paged = await client.get("/api/admin/inquiries?limit=1&offset=0")
    assert paged.status_code == 200
    assert paged.json()["total"] == 2
    assert len(paged.json()["items"]) == 1
    status_filtered = await client.get("/api/admin/inquiries?status=new")
    assert status_filtered.status_code == 200
    assert status_filtered.json()["total"] == 2
    dessert_filtered = await client.get(f"/api/admin/inquiries?dessert_id={dessert.id}")
    assert dessert_filtered.status_code == 200
    assert dessert_filtered.json()["total"] == 1

    detail = await client.get(f"/api/admin/inquiries/{inquiry_id}")
    assert detail.status_code == 200
    assert detail.json()["dessert"]["slug"] == dessert.slug
    assert detail.json()["internal_notes"] == ""
    assert detail.json()["message"] == "Please make a celebration cake."

    unknown = await client.get("/api/admin/inquiries/999999")
    assert unknown.status_code == 404

    missing_csrf = await client.patch(f"/api/admin/inquiries/{inquiry_id}", json={"internal_notes": "Call after 3pm"})
    assert missing_csrf.status_code == 403
    notes = await client.patch(
        f"/api/admin/inquiries/{inquiry_id}",
        json={"internal_notes": "Call after 3pm"},
        headers={"x-csrf-token": csrf},
    )
    assert notes.status_code == 200
    assert notes.json()["internal_notes"] == "Call after 3pm"
    public_detail = await client.get(f"/api/public/inquiries/{inquiry_id}")
    assert public_detail.status_code == 404


async def test_status_transitions_history_and_terminal_rules(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    csrf = await _login(client, db_session)
    created = await _create_inquiry(client)
    inquiry_id = await _latest_inquiry_id(db_session, created["public_reference"])

    first = await client.post(
        f"/api/admin/inquiries/{inquiry_id}/transition",
        json={"target_status": "in_progress"},
        headers={"x-csrf-token": csrf},
    )
    assert first.status_code == 200
    assert first.json()["status"] == "in_progress"
    changed_at = first.json()["status_changed_at"]
    assert first.json()["status_history"][0]["from_status"] == "new"
    assert first.json()["status_history"][0]["to_status"] == "in_progress"
    assert first.json()["status_history"][0]["administrator_id"] is not None
    persisted_history = await db_session.scalar(
        select(InquiryStatusHistory).where(InquiryStatusHistory.inquiry_id == inquiry_id)
    )
    assert persisted_history is not None
    assert persisted_history.from_status == "new"
    assert persisted_history.to_status == "in_progress"

    second = await client.post(
        f"/api/admin/inquiries/{inquiry_id}/transition",
        json={"target_status": "waiting_customer"},
        headers={"x-csrf-token": csrf},
    )
    assert second.status_code == 200
    assert second.json()["status_changed_at"] != changed_at

    forbidden = await client.post(
        f"/api/admin/inquiries/{inquiry_id}/transition",
        json={"target_status": "completed"},
        headers={"x-csrf-token": csrf},
    )
    assert forbidden.status_code == 409

    no_op = await client.post(
        f"/api/admin/inquiries/{inquiry_id}/transition",
        json={"target_status": "waiting_customer"},
        headers={"x-csrf-token": csrf},
    )
    assert no_op.status_code == 409

    confirmed = await client.post(
        f"/api/admin/inquiries/{inquiry_id}/transition",
        json={"target_status": "confirmed"},
        headers={"x-csrf-token": csrf},
    )
    assert confirmed.status_code == 200
    completed = await client.post(
        f"/api/admin/inquiries/{inquiry_id}/transition",
        json={"target_status": "completed"},
        headers={"x-csrf-token": csrf},
    )
    assert completed.status_code == 200
    assert completed.json()["completed_at"] is not None
    terminal = await client.post(
        f"/api/admin/inquiries/{inquiry_id}/transition",
        json={"target_status": "cancelled"},
        headers={"x-csrf-token": csrf},
    )
    assert terminal.status_code == 409


async def test_every_allowed_status_transition(client: AsyncClient, db_session: AsyncSession) -> None:
    csrf = await _login(client, db_session)
    transitions = [
        ("in_progress",),
        ("confirmed",),
        ("cancelled",),
        ("spam",),
        ("in_progress", "waiting_customer"),
        ("in_progress", "confirmed"),
        ("in_progress", "cancelled"),
        ("in_progress", "spam"),
        ("in_progress", "waiting_customer", "in_progress"),
        ("in_progress", "waiting_customer", "confirmed"),
        ("in_progress", "waiting_customer", "cancelled"),
        ("in_progress", "waiting_customer", "spam"),
        ("confirmed", "in_progress"),
        ("confirmed", "completed"),
        ("confirmed", "cancelled"),
    ]
    for index, path in enumerate(transitions):
        inquiry_rate_limiter.clear()
        created = await _create_inquiry(client, message=f"path {index}")
        inquiry_id = await _latest_inquiry_id(db_session, created["public_reference"])
        for target in path:
            response = await client.post(
                f"/api/admin/inquiries/{inquiry_id}/transition",
                json={"target_status": target},
                headers={"x-csrf-token": csrf},
            )
            assert response.status_code == 200, response.text
            persisted_status = await db_session.scalar(
                select(Inquiry.status).where(Inquiry.id == inquiry_id)
            )
            assert persisted_status == target


async def test_terminal_status_timestamps(client: AsyncClient, db_session: AsyncSession) -> None:
    csrf = await _login(client, db_session)
    terminal_paths = [
        ("cancelled", "cancelled_at"),
        ("spam", "spam_marked_at"),
    ]
    for index, (target, timestamp_field) in enumerate(terminal_paths):
        created = await _create_inquiry(client, message=f"terminal {index}")
        inquiry_id = await _latest_inquiry_id(db_session, created["public_reference"])
        response = await client.post(
            f"/api/admin/inquiries/{inquiry_id}/transition",
            json={"target_status": target},
            headers={"x-csrf-token": csrf},
        )
        assert response.status_code == 200
        assert response.json()[timestamp_field] is not None
        terminal = await client.post(
            f"/api/admin/inquiries/{inquiry_id}/transition",
            json={"target_status": "in_progress"},
            headers={"x-csrf-token": csrf},
        )
        assert terminal.status_code == 409


async def test_notification_failure_does_not_lose_inquiry(
    client: AsyncClient,
    db_session: AsyncSession,
) -> None:
    adapter = RecordingNotificationAdapter(fail=True)
    client._transport.app.dependency_overrides[get_notification_adapter] = lambda: adapter
    response = await client.post("/api/public/inquiries", json=_payload())
    assert response.status_code == 201
    assert adapter.references == [response.json()["public_reference"]]
    csrf = await _login(client, db_session)
    listing = await client.get("/api/admin/inquiries", headers={"x-csrf-token": csrf})
    assert listing.status_code == 200
    assert listing.json()["total"] == 1


async def test_notification_failure_logs_safe_metadata_only(
    client: AsyncClient,
    caplog: pytest.LogCaptureFixture,
) -> None:
    adapter = RecordingNotificationAdapter(fail=True)
    client._transport.app.dependency_overrides[get_notification_adapter] = lambda: adapter
    with caplog.at_level("ERROR", logger="app.inquiries"):
        response = await client.post("/api/public/inquiries", json=_payload())
    assert response.status_code == 201
    log_text = caplog.text
    assert response.json()["public_reference"] in log_text
    assert "ada@example.com" not in log_text
    assert "555" not in log_text
    assert "celebration cake" not in log_text
