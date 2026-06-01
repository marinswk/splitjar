from __future__ import annotations

from datetime import date as date_t
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import Expense, ExpenseShare, Group, Member
from app.schemas import MemberBalance, StatsOut
from app.services.balances import settle

router = APIRouter(tags=["stats"])

CENT = Decimal("0.01")


@router.get("/api/groups/{group_id}/stats", response_model=StatsOut)
def stats(
    group_id: int,
    year: int | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    session: Session = Depends(get_session),
):
    if not session.get(Group, group_id):
        raise HTTPException(404, "group not found")

    stmt = select(Expense).where(Expense.group_id == group_id)
    if year is not None and month is not None:
        start = date_t(year, month, 1)
        end = date_t(year + (month // 12), (month % 12) + 1, 1)
        stmt = stmt.where(Expense.date >= start, Expense.date < end)
    elif year is not None:
        start = date_t(year, 1, 1)
        end = date_t(year + 1, 1, 1)
        stmt = stmt.where(Expense.date >= start, Expense.date < end)

    expenses = session.exec(stmt).all()
    members = session.exec(select(Member).where(Member.group_id == group_id)).all()
    by_id = {m.id: m for m in members}

    paid: dict[int, Decimal] = {m.id: Decimal("0") for m in members}
    owed: dict[int, Decimal] = {m.id: Decimal("0") for m in members}
    total = Decimal("0")

    for e in expenses:
        total += e.amount
        paid[e.payer_id] = paid.get(e.payer_id, Decimal("0")) + e.amount
        shares = session.exec(
            select(ExpenseShare).where(ExpenseShare.expense_id == e.id)
        ).all()
        for s in shares:
            share_amount = (e.amount * s.percentage / Decimal("100")).quantize(CENT)
            owed[s.member_id] = owed.get(s.member_id, Decimal("0")) + share_amount

    balances = [
        MemberBalance(
            member_id=m.id,
            name=m.name,
            paid=paid.get(m.id, Decimal("0")).quantize(CENT),
            owed=owed.get(m.id, Decimal("0")).quantize(CENT),
            net=(paid.get(m.id, Decimal("0")) - owed.get(m.id, Decimal("0"))).quantize(CENT),
        )
        for m in members
        if m.active or paid.get(m.id, Decimal("0")) or owed.get(m.id, Decimal("0"))
    ]
    transfers = settle(balances)
    return StatsOut(total=total.quantize(CENT), balances=balances, settlements=transfers)
