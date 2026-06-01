import { MonthPicker } from "./MonthPicker";

type Props = {
  mode: "all" | "month";
  onModeChange: (mode: "all" | "month") => void;
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
};

export function PeriodFilter({
  mode,
  onModeChange,
  year,
  month,
  onMonthChange,
}: Props) {
  const base = "px-3 py-1.5 text-sm font-medium transition-colors";
  const active = "bg-jar-600 text-white";
  const inactive = "text-jar-600 hover:bg-jar-100";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex overflow-hidden rounded-md border border-jar-200 bg-white">
        <button
          type="button"
          className={`${base} ${mode === "all" ? active : inactive}`}
          onClick={() => onModeChange("all")}
        >
          All time
        </button>
        <button
          type="button"
          className={`${base} border-l border-jar-200 ${mode === "month" ? active : inactive}`}
          onClick={() => onModeChange("month")}
        >
          By month
        </button>
      </div>
      {mode === "month" && (
        <MonthPicker year={year} month={month} onChange={onMonthChange} />
      )}
    </div>
  );
}
