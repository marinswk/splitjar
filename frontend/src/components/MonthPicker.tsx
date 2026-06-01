import { useRef } from "react";

type Props = {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function shift(year: number, month: number, delta: number): [number, number] {
  const idx = (year * 12 + (month - 1)) + delta;
  return [Math.floor(idx / 12), (idx % 12) + 1];
}

export function MonthPicker({ year, month, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const value = `${year}-${String(month).padStart(2, "0")}`;

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    // showPicker() is the modern API; some browsers still need a focus+click fallback.
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        /* fall through */
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-900">
      <button
        type="button"
        className="px-2 py-2 text-slate-400 hover:bg-white/5"
        aria-label="Previous month"
        onClick={() => {
          const [y, m] = shift(year, month, -1);
          onChange(y, m);
        }}
      >
        ‹
      </button>
      <button
        type="button"
        className="px-2 py-2 text-sm font-medium hover:bg-white/5"
        onClick={openPicker}
      >
        {MONTHS[month - 1]} {year}
      </button>
      <input
        ref={inputRef}
        type="month"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={(e) => {
          const [y, m] = e.target.value.split("-").map((s) => parseInt(s, 10));
          if (y && m) onChange(y, m);
        }}
      />
      <button
        type="button"
        className="px-2 py-2 text-slate-400 hover:bg-white/5"
        aria-label="Next month"
        onClick={() => {
          const [y, m] = shift(year, month, 1);
          onChange(y, m);
        }}
      >
        ›
      </button>
    </div>
  );
}
