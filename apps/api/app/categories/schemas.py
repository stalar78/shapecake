from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def normalize_slug(value: str) -> str:
    normalized = re.sub(r"\s+", "-", value.strip().lower())
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    if not normalized or not SLUG_PATTERN.fullmatch(normalized):
        raise ValueError("slug must contain lowercase ASCII letters, digits, and single hyphens")
    return normalized


def trim_required(value: str) -> str:
    trimmed = value.strip()
    if not trimmed:
        raise ValueError("field cannot be blank")
    return trimmed


def reject_explicit_nulls(data: Any, fields: set[str]) -> Any:
    if isinstance(data, dict):
        null_fields = sorted(field for field in fields if field in data and data[field] is None)
        if null_fields:
            raise ValueError(f"Fields cannot be null: {', '.join(null_fields)}")
    return data


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=140)
    description: str = Field(default="", max_length=2000)
    sort_order: int = 0
    is_visible: bool = True

    @field_validator("name", "slug", "description", mode="before")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return trim_required(value)

    @field_validator("slug")
    @classmethod
    def normalize_slug_value(cls, value: str) -> str:
        return normalize_slug(value)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    slug: str | None = Field(default=None, min_length=1, max_length=140)
    description: str | None = Field(default=None, max_length=2000)
    sort_order: int | None = None
    is_visible: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_nulls(cls, data: Any) -> Any:
        return reject_explicit_nulls(
            data,
            {"name", "slug", "description", "sort_order", "is_visible"},
        )

    @field_validator("name", "slug", "description", mode="before")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        return value.strip() if isinstance(value, str) else value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        return trim_required(value) if value is not None else value

    @field_validator("slug")
    @classmethod
    def normalize_slug_value(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return CategoryBase.normalize_slug_value(value)


class ReorderItem(BaseModel):
    id: int
    sort_order: int


class CategoryResponse(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class PublicCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str
