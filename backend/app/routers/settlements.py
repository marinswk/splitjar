from __future__ import annotations

from datetime import date as date_t
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import Expense, ExpenseShare, Group, Member, Settlement
from app.schemas import MemberBalance, SettlementOut, Transfer
from app.services.balances import settle

router = APIRouter(tags=["settlements"])

CENT = Decimal("0.01")


def _compute_transfers(group_id: int, session: Session) -> list[Transfer]:
    """All-time outstanding transfers needed to zero out balances."""
    expenses = session.exec(select(Expense).where(Expense.group_id == group_id)).all()
    members = session.exec(select(Member).where(Member.group_id == group_id)).all()

    paid: dict[int, Decimal] = {m.id: Decimal("0") for m in members}
    owed: dict[int, Decimal] = {m.id: Decimal("0") for m in members}

    for e in expenses:
        paid[e.payer_id] = paid.get(e.payer_id, Decimal("0")) + e.amount
        for s in session.exec(
            select(ExpenseShare).where(ExpenseShare.expense_id == e.id)
        ).all():
            share = (e.amount * s.percentage / Decimal("100")).quantize(CENT)
            owed[s.member_id] = owed.get(s.member_id, Decimal("0")) + share

    for s in session.exec(
        select(Settlement).where(Settlement.group_id == group_id)
    ).all():
        paid[s.from_member_id] = paid.get(s.from_member_id, Decimal("0")) + s.amount
        owed[s.to_member_id] = owed.get(s.to_member_id, Decimal("0")) + s.amount

    balances = [
        MemberBalance(
            member_id=m.id,
            name=m.name,
            paid=paid.get(m.id, Decimal("0")).quantize(CENT),
            owed=owed.get(m.id, Decimal("0")).quantize(CENT),
            net=(paid.get(m.id, Decimal("0")) - owed.get(m.id, Decimal("0"))).quantize(CENT),
        )
        for m in members
    ]
    return settle(balances)


@router.get("/api/groups/{group_id}/settlements", response_model=list[SettlementOut])
def list_settlements(
    group_id: int,
    year: int | None = Query(default=None),
    month: int | None = Query(default=None, ge=1, le=12),
    session: Session = Depends(get_session),
):
    if not session.get(Group, group_id):
        raise HTTPException(404, "group not found")
    stmt = select(Settlement).where(Settlement.group_id == group_id)
    if year is not None and month is not None:
        start = date_t(year, month, 1)
        end = date_t(year + (month // 12), (month % 12) + 1, 1)
        stmt = stmt.where(Settlement.date >= start, Settlement.date < end)
    elif year is not None:
        start = date_t(year, 1, 1)
        end = date_t(year + 1, 1, 1)
        stmt = stmt.where(Settlement.date >= start, Settlement.date < end)
    return session.exec(stmt.order_by(Settlement.date.desc(), Settlement.id.desc())).all()


@router.delete("/api/settlements/{settlement_id}")
def delete_settlement(settlement_id: int, session: Session = Depends(get_session)):
    s = session.get(Settlement, settlement_id)
    if not s:
        raise HTTPException(404, "settlement not found")
    session.delete(s)
    session.commit()
    return {"ok": True}


@router.post("/api/groups/{group_id}/settle", response_model=list[Transfer])
def settle_group(group_id: int, session: Session = Depends(get_session)):
    if not session.get(Group, group_id):
        raise HTTPException(404, "group not found")
    transfers = _compute_transfers(group_id, session)
    today = date_t.today()
    for t in transfers:
        session.add(
            Settlement(
                group_id=group_id,
                from_member_id=t.from_member_id,
                to_member_id=t.to_member_id,
                amount=t.amount,
                date=today,
            )
        )
    session.commit()
    return transfers
