"""stage 03 inquiries

Revision ID: 202608060003
Revises: 202608060002
Create Date: 2026-08-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202608060003"
down_revision = "202608060002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "inquiries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_reference", sa.String(length=40), nullable=False),
        sa.Column("dessert_id", sa.Integer(), nullable=True),
        sa.Column("dessert_name_snapshot", sa.String(length=160), nullable=True),
        sa.Column("customer_name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("email", sa.String(length=254), nullable=True),
        sa.Column("preferred_contact_channel", sa.String(length=16), nullable=False),
        sa.Column("requested_date", sa.Date(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("consent_personal_data", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=24), server_default="new", nullable=False),
        sa.Column("internal_notes", sa.Text(), server_default="", nullable=False),
        sa.Column("duplicate_fingerprint_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status_changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("spam_marked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('new', 'in_progress', 'waiting_customer', 'confirmed', 'completed', 'cancelled', 'spam')",
            name="ck_inquiries_status",
        ),
        sa.CheckConstraint(
            "preferred_contact_channel IN ('phone', 'email', 'whatsapp', 'telegram')",
            name="ck_inquiries_preferred_contact_channel",
        ),
        sa.CheckConstraint("consent_personal_data IS TRUE", name="ck_inquiries_consent_true"),
        sa.CheckConstraint("phone IS NOT NULL OR email IS NOT NULL", name="ck_inquiries_contact_present"),
        sa.CheckConstraint(
            "quantity IS NULL OR (quantity > 0 AND quantity <= 10000)",
            name="ck_inquiries_quantity_range",
        ),
        sa.ForeignKeyConstraint(["dessert_id"], ["desserts.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("public_reference", name="uq_inquiries_public_reference"),
    )
    op.create_index("ix_inquiries_dessert_id", "inquiries", ["dessert_id"])
    op.create_index("ix_inquiries_status", "inquiries", ["status"])
    op.create_index("ix_inquiries_created_at", "inquiries", ["created_at"])
    op.create_index("ix_inquiries_requested_date", "inquiries", ["requested_date"])
    op.create_index(
        "ix_inquiries_duplicate_fingerprint_hash",
        "inquiries",
        ["duplicate_fingerprint_hash"],
    )

    op.create_table(
        "inquiry_status_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("inquiry_id", sa.Integer(), nullable=False),
        sa.Column("from_status", sa.String(length=24), nullable=False),
        sa.Column("to_status", sa.String(length=24), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("administrator_id", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "from_status IN ('new', 'in_progress', 'waiting_customer', 'confirmed', 'completed', 'cancelled', 'spam')",
            name="ck_inquiry_status_history_from_status",
        ),
        sa.CheckConstraint(
            "to_status IN ('new', 'in_progress', 'waiting_customer', 'confirmed', 'completed', 'cancelled', 'spam')",
            name="ck_inquiry_status_history_to_status",
        ),
        sa.ForeignKeyConstraint(["administrator_id"], ["admin_users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["inquiry_id"], ["inquiries.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_inquiry_status_history_inquiry_id", "inquiry_status_history", ["inquiry_id"])


def downgrade() -> None:
    op.drop_index("ix_inquiry_status_history_inquiry_id", table_name="inquiry_status_history")
    op.drop_table("inquiry_status_history")
    op.drop_index("ix_inquiries_duplicate_fingerprint_hash", table_name="inquiries")
    op.drop_index("ix_inquiries_requested_date", table_name="inquiries")
    op.drop_index("ix_inquiries_created_at", table_name="inquiries")
    op.drop_index("ix_inquiries_status", table_name="inquiries")
    op.drop_index("ix_inquiries_dessert_id", table_name="inquiries")
    op.drop_table("inquiries")
