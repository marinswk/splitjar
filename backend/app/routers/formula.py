from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import FormulaIn, FormulaOut
from app.services.formula import FormulaError, evaluate

router = APIRouter(prefix="/api/formula", tags=["formula"])


@router.post("/eval", response_model=FormulaOut)
def eval_formula(payload: FormulaIn):
    try:
        value = evaluate(payload.expression)
    except FormulaError as e:
        raise HTTPException(400, str(e)) from e
    return FormulaOut(value=value)
