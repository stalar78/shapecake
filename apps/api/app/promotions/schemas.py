from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.categories.schemas import normalize_slug, reject_explicit_nulls, trim_required
from app.reviews.schemas import ReviewDessertReference


def require_aware_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("datetime must include a timezone")
    return value.astimezone(UTC)


class PromotionBase(BaseModel):
    dessert_id: int | None = Field(default=None, ge=1)
    slug: str = Field(min_length=1, max_length=160)
    title: str = Field(min_length=1, max_length=180)
    summary: str = Field(default="", max_length=500)
    body: str = Field(default="", max_length=10000)
    is_published: bool = False
    sort_order: int = 0
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @field_validator("slug", mode="before")
    @classmethod
    def normalize_slug_value(cls, value: object) -> object:
        return normalize_slug(value) if isinstance(value, str) else value

    @field_validator("title", mode="before")
    @classmethod
    def trim_title(cls, value: object) -> object:
        return trim_required(value) if isinstance(value, str) else value

    @field_validator("summary", "body", mode="before")
    @classmethod
    def trim_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("starts_at", "ends_at")
    @classmethod
    def validate_aware_datetime(cls, value: datetime | None) -> datetime | None:
        return require_aware_utc(value)

    @model_validator(mode="after")
    def validate_schedule(self) -> PromotionBase:
        if self.starts_at is not None and self.ends_at is not None and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be greater than starts_at")
        return self


class PromotionCreate(PromotionBase):
    pass


class PromotionUpdate(BaseModel):
    dessert_id: int | None = Field(default=None, ge=1)
    slug: str | None = Field(default=None, min_length=1, max_length=160)
    title: str | None = Field(default=None, min_length=1, max_length=180)
    summary: str | None = Field(default=None, max_length=500)
    body: str | None = Field(default=None, max_length=10000)
    is_published: bool | None = None
    sort_order: int | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_nulls(cls, data: Any) -> Any:
        return reject_explicit_nulls(data, {"slug", "title", "summary", "body", "is_published", "sort_order"})

    @field_validator("slug", mode="before")
    @classmethod
    def normalize_slug_value(cls, value: object) -> object:
        return normalize_slug(value) if isinstance(value, str) else value

    @field_validator("title", mode="before")
    @classmethod
    def trim_title(cls, value: object) -> object:
        return trim_required(value) if isinstance(value, str) else value

    @field_validator("summary", "body", mode="before")
    @classmethod
    def trim_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("starts_at", "ends_at")
    @classmethod
    def validate_aware_datetime(cls, value: datetime | None) -> datetime | None:
        return require_aware_utc(value)

    @model_validator(mode="after")
    def validate_schedule(self) -> PromotionUpdate:
        if self.starts_at is not None and self.ends_at is not None and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be greater than starts_at")
        return self


class ReorderItem(BaseModel):
    id: int
    sort_order: int


class PromotionResponse(PromotionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dessert: ReviewDessertReference | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class PublicPromotionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dessert_id: int | None
    dessert: ReviewDessertReference | None
    slug: str
    title: str
    summary: str
    body: str
    starts_at: datetime | None
    ends_at: datetime | None


class PublicPromotionListResponse(BaseModel):
    items: list[PublicPromotionResponse]
    total: int
    limit: int
    offset: int
