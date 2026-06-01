from __future__ import annotations

import ast
import re
from decimal import Decimal, InvalidOperation

_ALLOWED = re.compile(r"^[\d\.\+\-\*\/\(\)\s]+$")


class FormulaError(ValueError):
    pass


def evaluate(expression: str) -> Decimal:
    expr = expression.strip()
    if not expr:
        raise FormulaError("empty expression")
    if not _ALLOWED.match(expr):
        raise FormulaError("expression contains disallowed characters")
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as e:
        raise FormulaError(f"syntax error: {e.msg}") from e
    return _eval_node(tree.body).quantize(Decimal("0.01"))


def _eval_node(node: ast.AST) -> Decimal:
    if isinstance(node, ast.Expression):
        return _eval_node(node.body)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            try:
                return Decimal(str(node.value))
            except InvalidOperation as e:
                raise FormulaError("invalid number") from e
        raise FormulaError("only numeric literals allowed")
    if isinstance(node, ast.UnaryOp):
        operand = _eval_node(node.operand)
        if isinstance(node.op, ast.UAdd):
            return +operand
        if isinstance(node.op, ast.USub):
            return -operand
        raise FormulaError("unsupported unary operator")
    if isinstance(node, ast.BinOp):
        left = _eval_node(node.left)
        right = _eval_node(node.right)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            if right == 0:
                raise FormulaError("division by zero")
            return left / right
        raise FormulaError("unsupported operator")
    raise FormulaError("unsupported expression")
