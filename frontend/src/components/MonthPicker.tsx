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
  const value = `${year}-${String(month).padStart(2, "0")}`;
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-jar-200 bg-white">
      <button
        type="button"
        className="px-2 py-2 text-jar-600 hover:bg-jar-100"
        aria-label="Previous month"
        onClick={() => {
          const [y, m] = shift(year, month, -1);
          onChange(y, m);
        }}
      >
        ‹
      </button>
      <label className="relative cursor-pointer px-2 py-2 text-sm font-medium select-none">
        {MONTHS[month - 1]} {year}
        <input
          type="month"
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          value={value}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map((s) => parseInt(s, 10));
            if (y && m) onChange(y, m);
          }}
        />
      </label>
      <button
        type="button"
        className="px-2 py-2 text-jar-600 hover:bg-jar-100"
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
