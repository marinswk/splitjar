from __future__ import annotations

from decimal import Decimal
from typing import Iterable

from app.schemas import MemberBalance, Transfer

CENT = Decimal("0.01")


def settle(balances: Iterable[MemberBalance]) -> list[Transfer]:
    creditors: list[list] = []
    debtors: list[list] = []
    for b in balances:
        if b.net > CENT:
            creditors.append([b.member_id, b.name, b.net])
        elif b.net < -CENT:
            debtors.append([b.member_id, b.name, -b.net])

    creditors.sort(key=lambda r: r[2], reverse=True)
    debtors.sort(key=lambda r: r[2], reverse=True)

    transfers: list[Transfer] = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        d = debtors[i]
        c = creditors[j]
        amount = min(d[2], c[2]).quantize(CENT)
        if amount > 0:
            transfers.append(
                Transfer(
                    from_member_id=d[0],
                    from_name=d[1],
                    to_member_id=c[0],
                    to_name=c[1],
                    amount=amount,
                )
            )
        d[2] -= amount
        c[2] -= amount
        if d[2] <= CENT:
            i += 1
        if c[2] <= CENT:
            j += 1
    return transfers
