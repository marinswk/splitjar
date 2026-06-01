from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


class Group(SQLModel, table=True):
    __tablename__ = "group"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    currency: str = Field(default="EUR", max_length=3)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Member(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="group.id", index=True)
    name: str
    active: bool = Field(default=True)


class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="group.id", index=True)
    payer_id: int = Field(foreign_key="member.id")
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    description: str = ""
    date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ExpenseShare(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    expense_id: int = Field(foreign_key="expense.id", index=True)
    member_id: int = Field(foreign_key="member.id")
    percentage: Decimal = Field(max_digits=6, decimal_places=3)


class Settlement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="group.id", index=True)
    from_member_id: int = Field(foreign_key="member.id")
    to_member_id: int = Field(foreign_key="member.id")
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    date: date
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
