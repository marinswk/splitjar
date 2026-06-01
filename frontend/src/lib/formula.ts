// Client-side mirror of backend formula parser. Same whitelist + safe eval.
// Returns null on invalid input.

const ALLOWED = /^[\d\.\+\-\*\/\(\)\s]+$/;

export function evalFormula(expr: string): number | null {
  const s = expr.trim();
  if (!s) return null;
  if (!ALLOWED.test(s)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`"use strict"; return (${s});`);
    const v = fn();
    if (typeof v !== "number" || !isFinite(v)) return null;
    return Math.round(v * 100) / 100;
  } catch {
    return null;
  }
}
