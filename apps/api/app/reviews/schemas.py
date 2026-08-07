from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.categories.schemas import reject_explicit_nulls, trim_required


class ReviewDessertReference(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str


class ReviewBase(BaseModel):
    dessert_id: int | None = Field(default=None, ge=1)
    author_name: str = Field(min_length=1, max_length=120)
    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=1, max_length=5000)
    is_published: bool = False
    is_featured: bool = False
    sort_order: int = 0

    @field_validator("author_name", "text", mode="before")
    @classmethod
    def trim_required_text(cls, value: object) -> object:
        return trim_required(value) if isinstance(value, str) else value


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseModel):
    dessert_id: int | None = Field(default=None, ge=1)
    author_name: str | None = Field(default=None, min_length=1, max_length=120)
    rating: int | None = Field(default=None, ge=1, le=5)
    text: str | None = Field(default=None, min_length=1, max_length=5000)
    is_published: bool | None = None
    is_featured: bool | None = None
    sort_order: int | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_nulls(cls, data: Any) -> Any:
        return reject_explicit_nulls(data, {"author_name", "rating", "text", "is_published", "is_featured", "sort_order"})

    @field_validator("author_name", "text", mode="before")
    @classmethod
    def trim_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("author_name", "text")
    @classmethod
    def validate_required_text(cls, value: str | None) -> str | None:
        return trim_required(value) if value is not None else value


class ReorderItem(BaseModel):
    id: int
    sort_order: int


class ReviewResponse(ReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dessert: ReviewDessertReference | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class PublicReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dessert_id: int | None
    dessert: ReviewDessertReference | None
    author_name: str
    rating: int
    text: str
    is_featured: bool


class PublicReviewListResponse(BaseModel):
    items: list[PublicReviewResponse]
    total: int
    limit: int
    offset: int

