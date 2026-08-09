"""site settings craft image

Revision ID: 202608090008
Revises: 202608060007
Create Date: 2026-08-09
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202608090008"
down_revision = "202608060007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("site_settings", sa.Column("craft_image_storage_key", sa.String(length=500), nullable=True))
    op.add_column(
        "site_settings",
        sa.Column("craft_image_original_filename", sa.String(length=255), nullable=True),
    )
    op.add_column("site_settings", sa.Column("craft_image_mime_type", sa.String(length=80), nullable=True))
    op.add_column("site_settings", sa.Column("craft_image_file_size", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("site_settings", "craft_image_file_size")
    op.drop_column("site_settings", "craft_image_mime_type")
    op.drop_column("site_settings", "craft_image_original_filename")
    op.drop_column("site_settings", "craft_image_storage_key")
