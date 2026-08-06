from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SiteSettingsBase(BaseModel):
    hero_title: str = Field(max_length=200)
    hero_text: str
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


class SiteSettingsResponse(SiteSettingsBase):
    model_config = ConfigDict(from_attributes=True)


class SiteSettingsUpdate(BaseModel):
    hero_title: str | None = Field(default=None, max_length=200)
    hero_text: str | None = None
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
