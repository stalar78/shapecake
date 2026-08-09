from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def trim_text(value: object) -> object:
    return value.strip() if isinstance(value, str) else value


def trim_required(value: object) -> object:
    if not isinstance(value, str):
        return value
    trimmed = value.strip()
    if not trimmed:
        raise ValueError("field cannot be blank")
    return trimmed


def validate_optional_email(value: str) -> str:
    if not value:
        return value
    if not EMAIL_PATTERN.fullmatch(value):
        raise ValueError("email must be a valid email address")
    return value


def validate_optional_https_url(value: str) -> str:
    if not value:
        return value
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("URL must be an absolute https URL")
    return value


class SiteSettingsBase(BaseModel):
    hero_title: str = Field(max_length=200)
    hero_text: str
    about_master_title: str = Field(max_length=200)
    about_master_text: str
    about_master_image_url: str | None = None
    craft_image_url: str | None = None
    phone: str = Field(max_length=80)
    email: str = Field(max_length=320)
    whatsapp_url: str = Field(max_length=500)
    telegram_url: str = Field(max_length=500)
    social_url: str = Field(max_length=500)
    address_text: str
    delivery_text: str
    pickup_text: str
    prepayment_text: str
    order_terms_text: str
    working_hours_text: str

    @field_validator("hero_title", mode="before")
    @classmethod
    def trim_required_fields(cls, value: object) -> object:
        return trim_required(value)

    @field_validator(
        "hero_text",
        "about_master_title",
        "about_master_text",
        "phone",
        "email",
        "whatsapp_url",
        "telegram_url",
        "social_url",
        "address_text",
        "delivery_text",
        "pickup_text",
        "prepayment_text",
        "order_terms_text",
        "working_hours_text",
        mode="before",
    )
    @classmethod
    def trim_optional_text(cls, value: object) -> object:
        return trim_text(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return validate_optional_email(value)

    @field_validator("whatsapp_url", "telegram_url", "social_url")
    @classmethod
    def validate_contact_url(cls, value: str) -> str:
        return validate_optional_https_url(value)


class SiteSettingsResponse(SiteSettingsBase):
    model_config = ConfigDict(from_attributes=True)


class SiteSettingsUpdate(BaseModel):
    hero_title: str | None = Field(default=None, max_length=200)
    hero_text: str | None = None
    about_master_title: str | None = Field(default=None, max_length=200)
    about_master_text: str | None = None
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=320)
    whatsapp_url: str | None = Field(default=None, max_length=500)
    telegram_url: str | None = Field(default=None, max_length=500)
    social_url: str | None = Field(default=None, max_length=500)
    address_text: str | None = None
    delivery_text: str | None = None
    pickup_text: str | None = None
    prepayment_text: str | None = None
    order_terms_text: str | None = None
    working_hours_text: str | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_explicit_nulls(cls, data: Any) -> Any:
        if isinstance(data, dict):
            null_fields = [key for key, value in data.items() if value is None]
            if null_fields:
                raise ValueError("site settings fields cannot be null")
        return data

    @field_validator("hero_title", mode="before")
    @classmethod
    def trim_required_fields(cls, value: object) -> object:
        return trim_required(value)

    @field_validator(
        "hero_text",
        "about_master_title",
        "about_master_text",
        "phone",
        "email",
        "whatsapp_url",
        "telegram_url",
        "social_url",
        "address_text",
        "delivery_text",
        "pickup_text",
        "prepayment_text",
        "order_terms_text",
        "working_hours_text",
        mode="before",
    )
    @classmethod
    def trim_optional_text(cls, value: object) -> object:
        return trim_text(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        return validate_optional_email(value) if value is not None else value

    @field_validator("whatsapp_url", "telegram_url", "social_url")
    @classmethod
    def validate_contact_url(cls, value: str | None) -> str | None:
        return validate_optional_https_url(value) if value is not None else value
