from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import Group, Member
from app.schemas import MemberIn, MemberOut

router = APIRouter(tags=["members"])


@router.get("/api/groups/{group_id}/members", response_model=list[MemberOut])
def list_members(group_id: int, session: Session = Depends(get_session)):
    if not session.get(Group, group_id):
        raise HTTPException(404, "group not found")
    return session.exec(
        select(Member).where(Member.group_id == group_id).order_by(Member.id)
    ).all()


@router.post("/api/groups/{group_id}/members", response_model=MemberOut)
def create_member(group_id: int, payload: MemberIn, session: Session = Depends(get_session)):
    if not session.get(Group, group_id):
        raise HTTPException(404, "group not found")
    m = Member(group_id=group_id, name=payload.name)
    session.add(m)
    session.commit()
    session.refresh(m)
    return m


@router.patch("/api/members/{member_id}", response_model=MemberOut)
def update_member(member_id: int, payload: MemberIn, session: Session = Depends(get_session)):
    m = session.get(Member, member_id)
    if not m:
        raise HTTPException(404, "member not found")
    m.name = payload.name
    session.add(m)
    session.commit()
    session.refresh(m)
    return m


@router.delete("/api/members/{member_id}")
def delete_member(member_id: int, session: Session = Depends(get_session)):
    m = session.get(Member, member_id)
    if not m:
        raise HTTPException(404, "member not found")
    m.active = False
    session.add(m)
    session.commit()
    return {"ok": True}
