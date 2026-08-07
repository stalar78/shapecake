"""stage 06 inquiry order request

Revision ID: 202608060006
Revises: 202608060005
Create Date: 2026-08-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202608060006"
down_revision = "202608060005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("inquiries", sa.Column("variant_id", sa.Integer(), nullable=True))
    op.add_column("inquiries", sa.Column("variant_weight_value_snapshot", sa.String(length=32), nullable=True))
    op.add_column("inquiries", sa.Column("variant_weight_unit_snapshot", sa.String(length=8), nullable=True))
    op.add_column(
        "inquiries",
        sa.Column("fulfillment_method", sa.String(length=16), server_default="pickup", nullable=False),
    )
    op.add_column(
        "inquiries",
        sa.Column("recipe_preferences", sa.Text(), server_default="", nullable=False),
    )
    op.add_column(
        "inquiries",
        sa.Column("decor_preferences", sa.Text(), server_default="", nullable=False),
    )
    op.create_foreign_key(
        "fk_inquiries_variant_id_dessert_variants",
        "inquiries",
        "dessert_variants",
        ["variant_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_check_constraint(
        "ck_inquiries_fulfillment_method",
        "inquiries",
        "fulfillment_method IN ('pickup', 'delivery')",
    )
    op.create_index("ix_inquiries_variant_id", "inquiries", ["variant_id"])


def downgrade() -> None:
    op.drop_index("ix_inquiries_variant_id", table_name="inquiries")
    op.drop_constraint("ck_inquiries_fulfillment_method", "inquiries", type_="check")
    op.drop_constraint("fk_inquiries_variant_id_dessert_variants", "inquiries", type_="foreignkey")
    op.drop_column("inquiries", "decor_preferences")
    op.drop_column("inquiries", "recipe_preferences")
    op.drop_column("inquiries", "fulfillment_method")
    op.drop_column("inquiries", "variant_weight_unit_snapshot")
    op.drop_column("inquiries", "variant_weight_value_snapshot")
    op.drop_column("inquiries", "variant_id")
