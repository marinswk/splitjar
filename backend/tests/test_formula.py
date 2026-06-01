from decimal import Decimal

import pytest

from app.services.formula import FormulaError, evaluate


def test_simple_addition():
    assert evaluate("12.50 + 7*2") == Decimal("26.50")


def test_parentheses():
    assert evaluate("(1+2)*3") == Decimal("9.00")


def test_division():
    assert evaluate("10/4") == Decimal("2.50")


def test_unary_minus():
    assert evaluate("-5+10") == Decimal("5.00")


@pytest.mark.parametrize("expr", ["__import__('os')", "1+a", "1;2", "abs(-1)", ""])
def test_rejects_bad(expr):
    with pytest.raises(FormulaError):
        evaluate(expr)


def test_div_by_zero():
    with pytest.raises(FormulaError):
        evaluate("1/0")
