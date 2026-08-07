from __future__ import annotations

import re
from datetime import UTC, date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.inquiries.status import InquiryStatus

PreferredContactChannel = Literal["phone", "email", "whatsapp", "telegram"]

PHONE_PATTERN = re.compile(r"^[0-9+().\-\s]{7,32}$")


def _trim(value: str) -> str:
    return value.strip()


def _required(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        raise ValueError("field cannot be blank")
    return trimmed


def normalize_phone(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if not PHONE_PATTERN.fullmatch(trimmed):
        raise ValueError("phone contains invalid characters or length")
    digits = re.sub(r"\D", "", trimmed)
    if len(digits) < 7 or len(digits) > 15:
        raise ValueError("phone must contain between 7 and 15 digits")
    if trimmed.startswith("+"):
        return f"+{digits}"
    return digits


class PublicInquiryCreate(BaseModel):
    customer_name: str = Field(min_length=1, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    preferred_contact_channel: PreferredContactChannel
    dessert_id: int | None = Field(default=None, ge=1)
    requested_date: date | None = None
    quantity: int | None = Field(default=None, ge=1, le=10000)
    message: str = Field(min_length=1, max_length=5000)
    consent_personal_data: bool

    @field_validator("customer_name", "message", mode="before")
    @classmethod
    def trim_required_text(cls, value: object) -> object:
        return _required(value) if isinstance(value, str) else value

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone_value(cls, value: object) -> object:
        return normalize_phone(value) if isinstance(value, str) or value is None else value

    @field_validator("email", mode="after")
    @classmethod
    def normalize_email_value(cls, value: EmailStr | None) -> str | None:
        return str(value).strip().lower() if value is not None else None

    @model_validator(mode="after")
    def validate_submission(self) -> PublicInquiryCreate:
        if self.consent_personal_data is not True:
            raise ValueError("personal data consent is required")
        if not self.phone and not self.email:
            raise ValueError("at least one contact method is required")
        if self.preferred_contact_channel in {"phone", "whatsapp", "telegram"} and not self.phone:
            raise ValueError("phone is required for the preferred contact channel")
        if self.preferred_contact_channel == "email" and not self.email:
            raise ValueError("email is required for the preferred contact channel")
        if self.requested_date is not None and self.requested_date < datetime.now(UTC).date():
            raise ValueError("requested_date cannot be in the past")
        return self


class PublicInquiryAcknowledgement(BaseModel):
    acknowledgement: str
    public_reference: str
    created_at: datetime


class InquiryDessertReference(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str


class InquiryStatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_status: InquiryStatus
    to_status: InquiryStatus
    changed_at: datetime
    administrator_id: int | None


class AdminInquiryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    public_reference: str
    dessert_id: int | None
    dessert_name_snapshot: str | None
    dessert: InquiryDessertReference | None
    customer_name: str
    phone: str | None
    email: str | None
    preferred_contact_channel: PreferredContactChannel
    requested_date: date | None
    quantity: int | None
    message: str
    consent_personal_data: bool
    status: InquiryStatus
    internal_notes: str
    created_at: datetime
    updated_at: datetime
    status_changed_at: datetime
    completed_at: datetime | None
    cancelled_at: datetime | None
    spam_marked_at: datetime | None
    status_history: list[InquiryStatusHistoryResponse] = []


class AdminInquiryListResponse(BaseModel):
    items: list[AdminInquiryResponse]
    total: int
    limit: int
    offset: int


class InquiryUpdate(BaseModel):
    internal_notes: str = Field(default="", max_length=5000)

    @field_validator("internal_notes", mode="before")
    @classmethod
    def trim_notes(cls, value: object) -> object:
        return _trim(value) if isinstance(value, str) else value


class InquiryTransitionRequest(BaseModel):
    target_status: InquiryStatus
