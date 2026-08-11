from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.categories.schemas import normalize_slug, reject_explicit_nulls, trim_required

WeightUnit = Literal["g", "kg", "pcs"]


class DessertVariantBase(BaseModel):
    weight_value: Decimal = Field(gt=0, max_digits=8, decimal_places=2)
    weight_unit: WeightUnit
    price: int = Field(ge=0)
    old_price: int | None = Field(default=None, ge=0)
    is_available: bool = True
    sort_order: int = 0

    @model_validator(mode="after")
    def validate_old_price(self) -> DessertVariantBase:
        if self.old_price is not None and self.old_price <= self.price:
            raise ValueError("old_price must be greater than price")
        return self


class DessertVariantCreate(DessertVariantBase):
    pass


class DessertVariantUpdate(BaseModel):
    weight_value: Decimal | None = Field(default=None, gt=0, max_digits=8, decimal_places=2)
    weight_unit: WeightUnit | None = None
    price: int | None = Field(default=None, ge=0)
    old_price: int | None = Field(default=None, ge=0)
    is_available: bool | None = None
    sort_order: int | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_nulls(cls, data: Any) -> Any:
        return reject_explicit_nulls(
            data,
            {"weight_value", "weight_unit", "price", "is_available", "sort_order"},
        )

    @model_validator(mode="after")
    def validate_old_price(self) -> DessertVariantUpdate:
        if self.old_price is not None and self.price is not None and self.old_price <= self.price:
            raise ValueError("old_price must be greater than price")
        return self


class ReorderItem(BaseModel):
    id: int
    sort_order: int


class DessertVariantResponse(DessertVariantBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dessert_id: int
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class DessertImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dessert_id: int
    url: str
    original_filename: str
    mime_type: str
    width: int | None
    height: int | None
    file_size: int
    alt_text: str
    is_primary: bool
    sort_order: int
    created_at: datetime
    deleted_at: datetime | None


class DessertBase(BaseModel):
    category_id: int
    name: str = Field(min_length=1, max_length=160)
    slug: str = Field(min_length=1, max_length=180)
    short_description: str = Field(default="", max_length=500)
    full_description: str = Field(default="", max_length=5000)
    ingredients: str = Field(default="", max_length=5000)
    allergens: str = Field(default="", max_length=2000)
    warnings: str = Field(default="", max_length=2000)
    calories: int | None = Field(default=None, ge=0)
    proteins: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=2)
    fats: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=2)
    carbohydrates: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=2)
    preparation_time_text: str = Field(default="", max_length=120)
    is_published: bool = False
    is_available: bool = True
    is_sugar_free: bool = False
    is_gluten_free: bool = False
    is_low_calorie: bool = False
    is_bento: bool = False
    is_new: bool = False
    is_popular: bool = False
    is_seasonal: bool = False
    sort_order: int = 0

    @field_validator(
        "name",
        "slug",
        "short_description",
        "full_description",
        "ingredients",
        "allergens",
        "warnings",
        "preparation_time_text",
        mode="before",
    )
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


class DessertCreate(DessertBase):
    pass


class DessertUpdate(BaseModel):
    category_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=160)
    slug: str | None = Field(default=None, min_length=1, max_length=180)
    short_description: str | None = Field(default=None, max_length=500)
    full_description: str | None = Field(default=None, max_length=5000)
    ingredients: str | None = Field(default=None, max_length=5000)
    allergens: str | None = Field(default=None, max_length=2000)
    warnings: str | None = Field(default=None, max_length=2000)
    calories: int | None = Field(default=None, ge=0)
    proteins: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=2)
    fats: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=2)
    carbohydrates: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=2)
    preparation_time_text: str | None = Field(default=None, max_length=120)
    is_published: bool | None = None
    is_available: bool | None = None
    is_sugar_free: bool | None = None
    is_gluten_free: bool | None = None
    is_low_calorie: bool | None = None
    is_bento: bool | None = None
    is_new: bool | None = None
    is_popular: bool | None = None
    is_seasonal: bool | None = None
    sort_order: int | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_nulls(cls, data: Any) -> Any:
        return reject_explicit_nulls(
            data,
            {
                "category_id",
                "name",
                "slug",
                "short_description",
                "full_description",
                "ingredients",
                "allergens",
                "warnings",
                "preparation_time_text",
                "is_published",
                "is_available",
                "is_sugar_free",
                "is_gluten_free",
                "is_low_calorie",
                "is_bento",
                "is_new",
                "is_popular",
                "is_seasonal",
                "sort_order",
            },
        )

    @field_validator("*", mode="before")
    @classmethod
    def trim_strings(cls, value: object) -> object:
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
        return DessertBase.normalize_slug_value(value)


class DessertResponse(DessertBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
    variants: list[DessertVariantResponse] = []
    images: list[DessertImageResponse] = []


class PublicDessertSummary(BaseModel):
    id: int
    category_id: int
    category_slug: str
    name: str
    slug: str
    short_description: str
    calories: int | None
    proteins: Decimal | None
    fats: Decimal | None
    carbohydrates: Decimal | None
    is_available: bool
    is_sugar_free: bool
    is_gluten_free: bool
    is_low_calorie: bool
    is_bento: bool
    is_new: bool
    is_popular: bool
    is_seasonal: bool
    primary_image: DessertImageResponse | None
    variants: list[DessertVariantResponse]


class PublicDessertDetail(PublicDessertSummary):
    full_description: str
    ingredients: str
    allergens: str
    warnings: str
    preparation_time_text: str
    images: list[DessertImageResponse]


class PublicCatalogResponse(BaseModel):
    items: list[PublicDessertSummary]
    total: int
    limit: int
    offset: int
