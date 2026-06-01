import { useMemo } from "react";
import { evalFormula } from "../lib/formula";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onValue?: (v: number | null) => void;
  placeholder?: string;
};

export function FormulaInput({ value, onChange, onValue, placeholder }: Props) {
  const computed = useMemo(() => evalFormula(value), [value]);
  if (onValue) onValue(computed);
  return (
    <div className="space-y-1">
      <input
        className="input"
        inputMode="decimal"
        placeholder={placeholder ?? "12.50 + 7*2"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="text-xs text-slate-500">
        {computed === null ? (
          <span className="text-red-600">enter a valid number or formula</span>
        ) : (
          <span>= {computed.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}
