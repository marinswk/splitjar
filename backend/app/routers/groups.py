from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import Group
from app.schemas import GroupIn, GroupOut

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("", response_model=list[GroupOut])
def list_groups(session: Session = Depends(get_session)):
    return session.exec(select(Group).order_by(Group.created_at.desc())).all()


@router.post("", response_model=GroupOut)
def create_group(payload: GroupIn, session: Session = Depends(get_session)):
    g = Group(name=payload.name, currency=payload.currency.upper())
    session.add(g)
    session.commit()
    session.refresh(g)
    return g


@router.get("/{group_id}", response_model=GroupOut)
def get_group(group_id: int, session: Session = Depends(get_session)):
    g = session.get(Group, group_id)
    if not g:
        raise HTTPException(404, "group not found")
    return g


@router.patch("/{group_id}", response_model=GroupOut)
def update_group(group_id: int, payload: GroupIn, session: Session = Depends(get_session)):
    g = session.get(Group, group_id)
    if not g:
        raise HTTPException(404, "group not found")
    g.name = payload.name
    g.currency = payload.currency.upper()
    session.add(g)
    session.commit()
    session.refresh(g)
    return g


@router.delete("/{group_id}")
def delete_group(group_id: int, session: Session = Depends(get_session)):
    g = session.get(Group, group_id)
    if not g:
        raise HTTPException(404, "group not found")
    session.delete(g)
    session.commit()
    return {"ok": True}
