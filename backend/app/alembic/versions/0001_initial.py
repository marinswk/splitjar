"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-01

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "group",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("currency", sqlmodel.sql.sqltypes.AutoString(length=3), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "member",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["group.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_member_group_id", "member", ["group_id"])

    op.create_table(
        "expense",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("payer_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["group.id"]),
        sa.ForeignKeyConstraint(["payer_id"], ["member.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_expense_group_id", "expense", ["group_id"])

    op.create_table(
        "expenseshare",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("expense_id", sa.Integer(), nullable=False),
        sa.Column("member_id", sa.Integer(), nullable=False),
        sa.Column("percentage", sa.Numeric(precision=6, scale=3), nullable=False),
        sa.ForeignKeyConstraint(["expense_id"], ["expense.id"]),
        sa.ForeignKeyConstraint(["member_id"], ["member.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_expenseshare_expense_id", "expenseshare", ["expense_id"])


def downgrade() -> None:
    op.drop_index("ix_expenseshare_expense_id", table_name="expenseshare")
    op.drop_table("expenseshare")
    op.drop_index("ix_expense_group_id", table_name="expense")
    op.drop_table("expense")
    op.drop_index("ix_member_group_id", table_name="member")
    op.drop_table("member")
    op.drop_table("group")
