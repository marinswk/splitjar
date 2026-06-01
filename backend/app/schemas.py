from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class GroupIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    currency: str = Field(default="EUR", min_length=3, max_length=3)


class GroupOut(GroupIn):
    id: int
    created_at: datetime


class MemberIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class MemberOut(MemberIn):
    id: int
    group_id: int
    active: bool


class ShareIn(BaseModel):
    member_id: int
    percentage: Decimal


class ShareOut(ShareIn):
    pass


class ExpenseIn(BaseModel):
    payer_id: int
    amount: Decimal
    description: str = ""
    date: date
    shares: list[ShareIn]


class ExpenseOut(BaseModel):
    id: int
    group_id: int
    payer_id: int
    amount: Decimal
    description: str
    date: date
    created_at: datetime
    shares: list[ShareOut]


class FormulaIn(BaseModel):
    expression: str


class FormulaOut(BaseModel):
    value: Decimal


class MemberBalance(BaseModel):
    member_id: int
    name: str
    paid: Decimal
    owed: Decimal
    net: Decimal


class Transfer(BaseModel):
    from_member_id: int
    from_name: str
    to_member_id: int
    to_name: str
    amount: Decimal


class StatsOut(BaseModel):
    total: Decimal
    balances: list[MemberBalance]
    settlements: list[Transfer]
