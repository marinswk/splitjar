"""settlements table

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-01

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "settlement",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("from_member_id", sa.Integer(), nullable=False),
        sa.Column("to_member_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["group_id"], ["group.id"]),
        sa.ForeignKeyConstraint(["from_member_id"], ["member.id"]),
        sa.ForeignKeyConstraint(["to_member_id"], ["member.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_settlement_group_id", "settlement", ["group_id"])


def downgrade() -> None:
    op.drop_index("ix_settlement_group_id", table_name="settlement")
    op.drop_table("settlement")
