from __future__ import annotations

from datetime import date as date_t

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import Expense, ExpenseShare, Group, Settlement
from app.schemas import (
    ShareOut,
    TransactionExpense,
    TransactionSettlement,
    TransactionsPage,
)

router = APIRouter(tags=["transactions"])


def _month_window(year: int | None, month: int | None) -> tuple[date_t, date_t] | None:
    if year is not None and month is not None:
        start = date_t(year, month, 1)
        end = date_t(year + (month // 12), (month % 12) + 1, 1)
        return start, end
    if year is not None:
        return date_t(year, 1, 1), date_t(year + 1, 1, 1)
    return None


@router.get("/api/groups/{group_id}/transactions", response_model=TransactionsPage)
def list_transactions(
    group_id: int,
    year: int | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
):
    if not session.get(Group, group_id):
        raise HTTPException(404, "group not found")

    window = _month_window(year, month)

    exp_stmt = select(Expense).where(Expense.group_id == group_id)
    set_stmt = select(Settlement).where(Settlement.group_id == group_id)
    if window:
        start, end = window
        exp_stmt = exp_stmt.where(Expense.date >= start, Expense.date < end)
        set_stmt = set_stmt.where(Settlement.date >= start, Settlement.date < end)

    expenses = session.exec(exp_stmt).all()
    settlements = session.exec(set_stmt).all()

    items: list[tuple[str, TransactionExpense | TransactionSettlement]] = []
    for e in expenses:
        shares = session.exec(
            select(ExpenseShare).where(ExpenseShare.expense_id == e.id)
        ).all()
        items.append(
            (
                f"{e.date.isoformat()}-e-{e.id:08d}",
                TransactionExpense(
                    id=e.id,
                    group_id=e.group_id,
                    payer_id=e.payer_id,
                    amount=e.amount,
                    description=e.description,
                    date=e.date,
                    created_at=e.created_at,
                    shares=[
                        ShareOut(member_id=s.member_id, percentage=s.percentage)
                        for s in shares
                    ],
                ),
            )
        )
    for s in settlements:
        items.append(
            (
                f"{s.date.isoformat()}-s-{s.id:08d}",
                TransactionSettlement(
                    id=s.id,
                    group_id=s.group_id,
                    from_member_id=s.from_member_id,
                    to_member_id=s.to_member_id,
                    amount=s.amount,
                    date=s.date,
                    created_at=s.created_at,
                ),
            )
        )

    items.sort(key=lambda kv: kv[0], reverse=True)
    total = len(items)
    page = [v for _, v in items[offset : offset + limit]]
    return TransactionsPage(items=page, total=total, limit=limit, offset=offset)
