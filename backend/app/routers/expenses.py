from __future__ import annotations

from datetime import date as date_t
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import Expense, ExpenseShare, Group, Member
from app.schemas import ExpenseIn, ExpenseOut, ShareOut

router = APIRouter(tags=["expenses"])

PCT_TOTAL = Decimal("100")
TOL = Decimal("0.01")


def _to_out(exp: Expense, shares: list[ExpenseShare]) -> ExpenseOut:
    return ExpenseOut(
        id=exp.id,
        group_id=exp.group_id,
        payer_id=exp.payer_id,
        amount=exp.amount,
        description=exp.description,
        date=exp.date,
        created_at=exp.created_at,
        shares=[ShareOut(member_id=s.member_id, percentage=s.percentage) for s in shares],
    )


def _validate_payload(group_id: int, payload: ExpenseIn, session: Session) -> None:
    if not session.get(Group, group_id):
        raise HTTPException(404, "group not found")
    if payload.amount <= 0:
        raise HTTPException(400, "amount must be positive")
    payer = session.get(Member, payload.payer_id)
    if not payer or payer.group_id != group_id:
        raise HTTPException(400, "payer not in this group")
    if not payload.shares:
        raise HTTPException(400, "at least one share required")
    member_ids = {payload.payer_id, *(s.member_id for s in payload.shares)}
    members = session.exec(
        select(Member).where(Member.group_id == group_id, Member.id.in_(member_ids))
    ).all()
    found = {m.id for m in members}
    missing = member_ids - found
    if missing:
        raise HTTPException(400, f"members not in group: {sorted(missing)}")
    total_pct = sum((s.percentage for s in payload.shares), Decimal("0"))
    if abs(total_pct - PCT_TOTAL) > TOL:
        raise HTTPException(400, f"shares must sum to 100 (got {total_pct})")


@router.get("/api/groups/{group_id}/expenses", response_model=list[ExpenseOut])
def list_expenses(
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
    expenses = session.exec(stmt.order_by(Expense.date.desc(), Expense.id.desc())).all()
    out = []
    for e in expenses:
        shares = session.exec(
            select(ExpenseShare).where(ExpenseShare.expense_id == e.id)
        ).all()
        out.append(_to_out(e, shares))
    return out


@router.post("/api/groups/{group_id}/expenses", response_model=ExpenseOut)
def create_expense(group_id: int, payload: ExpenseIn, session: Session = Depends(get_session)):
    _validate_payload(group_id, payload, session)
    exp = Expense(
        group_id=group_id,
        payer_id=payload.payer_id,
        amount=payload.amount,
        description=payload.description,
        date=payload.date,
    )
    session.add(exp)
    session.commit()
    session.refresh(exp)
    for s in payload.shares:
        session.add(
            ExpenseShare(expense_id=exp.id, member_id=s.member_id, percentage=s.percentage)
        )
    session.commit()
    shares = session.exec(
        select(ExpenseShare).where(ExpenseShare.expense_id == exp.id)
    ).all()
    return _to_out(exp, shares)


@router.patch("/api/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, payload: ExpenseIn, session: Session = Depends(get_session)):
    exp = session.get(Expense, expense_id)
    if not exp:
        raise HTTPException(404, "expense not found")
    _validate_payload(exp.group_id, payload, session)
    exp.payer_id = payload.payer_id
    exp.amount = payload.amount
    exp.description = payload.description
    exp.date = payload.date
    session.add(exp)
    old_shares = session.exec(
        select(ExpenseShare).where(ExpenseShare.expense_id == exp.id)
    ).all()
    for s in old_shares:
        session.delete(s)
    session.commit()
    for s in payload.shares:
        session.add(
            ExpenseShare(expense_id=exp.id, member_id=s.member_id, percentage=s.percentage)
        )
    session.commit()
    shares = session.exec(
        select(ExpenseShare).where(ExpenseShare.expense_id == exp.id)
    ).all()
    return _to_out(exp, shares)


@router.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int, session: Session = Depends(get_session)):
    exp = session.get(Expense, expense_id)
    if not exp:
        raise HTTPException(404, "expense not found")
    shares = session.exec(
        select(ExpenseShare).where(ExpenseShare.expense_id == exp.id)
    ).all()
    for s in shares:
        session.delete(s)
    session.delete(exp)
    session.commit()
    return {"ok": True}
