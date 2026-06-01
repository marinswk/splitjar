type Props = {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
};

export function MonthPicker({ year, month, onChange }: Props) {
  const value = `${year}-${String(month).padStart(2, "0")}`;
  return (
    <input
      type="month"
      className="input w-auto"
      value={value}
      onChange={(e) => {
        const [y, m] = e.target.value.split("-").map((s) => parseInt(s, 10));
        if (y && m) onChange(y, m);
      }}
    />
  );
}
