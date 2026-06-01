from decimal import Decimal

from app.schemas import MemberBalance
from app.services.balances import settle


def _bal(mid, name, net):
    return MemberBalance(
        member_id=mid, name=name, paid=Decimal("0"), owed=Decimal("0"), net=Decimal(net)
    )


def test_simple_two_party():
    balances = [_bal(1, "A", "10.00"), _bal(2, "B", "-10.00")]
    transfers = settle(balances)
    assert len(transfers) == 1
    assert transfers[0].from_member_id == 2
    assert transfers[0].to_member_id == 1
    assert transfers[0].amount == Decimal("10.00")


def test_three_party_minimal():
    balances = [
        _bal(1, "A", "10.00"),
        _bal(2, "B", "5.00"),
        _bal(3, "C", "-15.00"),
    ]
    transfers = settle(balances)
    assert len(transfers) == 2
    total = sum(t.amount for t in transfers)
    assert total == Decimal("15.00")


def test_zero_balances():
    balances = [_bal(1, "A", "0"), _bal(2, "B", "0")]
    assert settle(balances) == []
