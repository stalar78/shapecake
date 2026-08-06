"""stage 01 foundation

Revision ID: 202608060001
Revises:
Create Date: 2026-08-06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202608060001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("email", name="uq_admin_users_email"),
    )
    op.create_table(
        "admin_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("csrf_secret", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["admin_user_id"], ["admin_users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_admin_sessions_token_hash"),
    )
    op.create_index("ix_admin_sessions_admin_user_id", "admin_sessions", ["admin_user_id"])
    op.create_table(
        "site_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hero_title", sa.String(length=200), nullable=False),
        sa.Column("hero_text", sa.Text(), nullable=False),
        sa.Column("phone", sa.String(length=80), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("whatsapp_url", sa.String(length=500), nullable=False),
        sa.Column("telegram_url", sa.String(length=500), nullable=False),
        sa.Column("social_url", sa.String(length=500), nullable=False),
        sa.Column("address_text", sa.Text(), nullable=False),
        sa.Column("delivery_text", sa.Text(), nullable=False),
        sa.Column("pickup_text", sa.Text(), nullable=False),
        sa.Column("prepayment_text", sa.Text(), nullable=False),
        sa.Column("order_terms_text", sa.Text(), nullable=False),
        sa.Column("working_hours_text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("id = 1", name="ck_site_settings_singleton_id"),
    )
    op.execute(
        """
        INSERT INTO site_settings (
            id, hero_title, hero_text, phone, email, whatsapp_url, telegram_url,
            social_url, address_text, delivery_text, pickup_text, prepayment_text,
            order_terms_text, working_hours_text
        ) VALUES (
            1, 'Cake & Shape', 'Custom desserts for memorable moments.', '', '',
            '', '', '', '', '', '', '', '', ''
        )
        ON CONFLICT (id) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("site_settings")
    op.drop_index("ix_admin_sessions_admin_user_id", table_name="admin_sessions")
    op.drop_table("admin_sessions")
    op.drop_table("admin_users")
