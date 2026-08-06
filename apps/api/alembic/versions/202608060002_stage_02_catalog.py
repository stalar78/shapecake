"""stage 02 catalog

Revision ID: 202608060002
Revises: 202608060001
Create Date: 2026-08-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202608060002"
down_revision = "202608060001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("description", sa.Text(), server_default="", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_visible", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("slug", name="uq_categories_slug"),
    )
    op.create_index("ix_categories_public_order", "categories", ["sort_order", "id"])

    op.create_table(
        "desserts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("short_description", sa.String(length=500), server_default="", nullable=False),
        sa.Column("full_description", sa.Text(), server_default="", nullable=False),
        sa.Column("ingredients", sa.Text(), server_default="", nullable=False),
        sa.Column("allergens", sa.Text(), server_default="", nullable=False),
        sa.Column("warnings", sa.Text(), server_default="", nullable=False),
        sa.Column("calories", sa.Integer(), nullable=True),
        sa.Column("proteins", sa.Numeric(8, 2), nullable=True),
        sa.Column("fats", sa.Numeric(8, 2), nullable=True),
        sa.Column("carbohydrates", sa.Numeric(8, 2), nullable=True),
        sa.Column("preparation_time_text", sa.String(length=120), server_default="", nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_available", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("is_sugar_free", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_gluten_free", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_low_calorie", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_bento", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_new", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_popular", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_seasonal", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("calories IS NULL OR calories >= 0", name="ck_desserts_calories_non_negative"),
        sa.CheckConstraint("proteins IS NULL OR proteins >= 0", name="ck_desserts_proteins_non_negative"),
        sa.CheckConstraint("fats IS NULL OR fats >= 0", name="ck_desserts_fats_non_negative"),
        sa.CheckConstraint(
            "carbohydrates IS NULL OR carbohydrates >= 0",
            name="ck_desserts_carbohydrates_non_negative",
        ),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("slug", name="uq_desserts_slug"),
    )
    op.create_index("ix_desserts_category_id", "desserts", ["category_id"])
    op.create_index("ix_desserts_public_order", "desserts", ["sort_order", "id"])

    op.create_table(
        "dessert_variants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dessert_id", sa.Integer(), nullable=False),
        sa.Column("weight_value", sa.Numeric(8, 2), nullable=False),
        sa.Column("weight_unit", sa.String(length=8), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("old_price", sa.Integer(), nullable=True),
        sa.Column("is_available", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("weight_value > 0", name="ck_dessert_variants_weight_positive"),
        sa.CheckConstraint("weight_unit IN ('g', 'kg', 'pcs')", name="ck_dessert_variants_weight_unit"),
        sa.CheckConstraint("price >= 0", name="ck_dessert_variants_price_non_negative"),
        sa.CheckConstraint("old_price IS NULL OR old_price > price", name="ck_dessert_variants_old_price_gt_price"),
        sa.ForeignKeyConstraint(["dessert_id"], ["desserts.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_dessert_variants_dessert_id", "dessert_variants", ["dessert_id"])
    op.create_index(
        "uq_dessert_variants_active_weight",
        "dessert_variants",
        ["dessert_id", "weight_value", "weight_unit"],
        unique=True,
        postgresql_where=sa.text("archived_at IS NULL"),
    )

    op.create_table(
        "dessert_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dessert_id", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=300), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=80), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("alt_text", sa.String(length=255), server_default="", nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("file_size > 0", name="ck_dessert_images_file_size_positive"),
        sa.CheckConstraint(
            "mime_type IN ('image/jpeg', 'image/png', 'image/webp')",
            name="ck_dessert_images_mime_type",
        ),
        sa.ForeignKeyConstraint(["dessert_id"], ["desserts.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("storage_key", name="uq_dessert_images_storage_key"),
    )
    op.create_index("ix_dessert_images_dessert_id", "dessert_images", ["dessert_id"])
    op.create_index(
        "uq_dessert_images_active_primary",
        "dessert_images",
        ["dessert_id"],
        unique=True,
        postgresql_where=sa.text("is_primary IS TRUE AND deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_dessert_images_active_primary", table_name="dessert_images")
    op.drop_index("ix_dessert_images_dessert_id", table_name="dessert_images")
    op.drop_table("dessert_images")
    op.drop_index("uq_dessert_variants_active_weight", table_name="dessert_variants")
    op.drop_index("ix_dessert_variants_dessert_id", table_name="dessert_variants")
    op.drop_table("dessert_variants")
    op.drop_index("ix_desserts_public_order", table_name="desserts")
    op.drop_index("ix_desserts_category_id", table_name="desserts")
    op.drop_table("desserts")
    op.drop_index("ix_categories_public_order", table_name="categories")
    op.drop_table("categories")
