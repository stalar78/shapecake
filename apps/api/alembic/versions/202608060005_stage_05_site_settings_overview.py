"""stage 05 site settings overview

Revision ID: 202608060005
Revises: 202608060004
Create Date: 2026-08-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202608060005"
down_revision = "202608060004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "site_settings",
        sa.Column("about_master_title", sa.String(length=200), server_default="", nullable=False),
    )
    op.add_column(
        "site_settings",
        sa.Column("about_master_text", sa.Text(), server_default="", nullable=False),
    )
    op.execute(
        """
        UPDATE site_settings
        SET about_master_title = 'About the master'
        WHERE id = 1 AND about_master_title = ''
        """
    )


def downgrade() -> None:
    op.drop_column("site_settings", "about_master_text")
    op.drop_column("site_settings", "about_master_title")
