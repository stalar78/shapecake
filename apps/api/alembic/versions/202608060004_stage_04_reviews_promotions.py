"""stage 04 reviews and promotions

Revision ID: 202608060004
Revises: 202608060003
Create Date: 2026-08-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202608060004"
down_revision = "202608060003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dessert_id", sa.Integer(), nullable=True),
        sa.Column("author_name", sa.String(length=120), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("is_featured", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
        sa.ForeignKeyConstraint(["dessert_id"], ["desserts.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_reviews_dessert_id", "reviews", ["dessert_id"])
    op.create_index("ix_reviews_featured", "reviews", ["is_featured"])
    op.create_index(
        "ix_reviews_public_order",
        "reviews",
        ["is_published", "archived_at", "sort_order", "id"],
    )

    op.create_table(
        "promotions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dessert_id", sa.Integer(), nullable=True),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("summary", sa.String(length=500), server_default="", nullable=False),
        sa.Column("body", sa.Text(), server_default="", nullable=False),
        sa.Column("is_published", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at",
            name="ck_promotions_schedule_order",
        ),
        sa.ForeignKeyConstraint(["dessert_id"], ["desserts.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("slug", name="uq_promotions_slug"),
    )
    op.create_index("ix_promotions_dessert_id", "promotions", ["dessert_id"])
    op.create_index(
        "ix_promotions_public_order",
        "promotions",
        ["is_published", "archived_at", "starts_at", "ends_at", "sort_order", "id"],
    )


def downgrade() -> None:
    op.drop_index("ix_promotions_public_order", table_name="promotions")
    op.drop_index("ix_promotions_dessert_id", table_name="promotions")
    op.drop_table("promotions")
    op.drop_index("ix_reviews_public_order", table_name="reviews")
    op.drop_index("ix_reviews_featured", table_name="reviews")
    op.drop_index("ix_reviews_dessert_id", table_name="reviews")
    op.drop_table("reviews")
