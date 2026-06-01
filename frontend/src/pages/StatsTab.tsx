import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, type Group } from "../api/client";
import { PeriodFilter } from "../components/PeriodFilter";

function fmt(amount: string, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    parseFloat(amount),
  );
}

export default function StatsTab({ group }: { group: Group }) {
  const now = new Date();
  const [mode, setMode] = useState<"all" | "month">("all");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const params = mode === "month" ? { year, month } : { year: undefined, month: undefined };

  const { data, isLoading } = useQuery({
    queryKey: ["stats", group.id, params],
    queryFn: () => api.stats(group.id, params.year, params.month),
  });

  // Drive BarChart width from our own ResizeObserver. ResponsiveContainer
  // can latch onto a stale 0-width on first render, so we measure the box
  // ourselves and pass an explicit width to BarChart.
  const chartBoxRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(600);
  useEffect(() => {
    const el = chartBoxRef.current;
    if (!el) return;
    const update = () => setChartWidth(el.clientWidth || 600);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PeriodFilter
          mode={mode}
          onModeChange={setMode}
          year={year}
          month={month}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
        <div className="text-sm text-slate-400">
          {data && (
            <>
              Total:{" "}
              <span className="font-semibold text-slate-100">
                {fmt(data.total, group.currency)}
              </span>
            </>
          )}
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="card">
            <h3 className="mb-2 text-sm font-semibold">Paid vs owed</h3>
            <div ref={chartBoxRef} className="h-64 w-full">
              <BarChart
                width={chartWidth}
                height={256}
                data={data.balances.map((b) => ({
                  name: b.name,
                  paid: parseFloat(b.paid),
                  owed: parseFloat(b.owed),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f1f5f9",
                  }}
                />
                <Bar dataKey="paid" fill="#38bdf8" isAnimationActive={false} />
                <Bar dataKey="owed" fill="#075985" isAnimationActive={false} />
              </BarChart>
            </div>
          </div>

          <div className="card">
            <h3 className="mb-2 text-sm font-semibold">Balances</h3>
            {data.balances.length === 0 ? (
              <p className="text-sm text-slate-400">No data.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-400">
                  <tr>
                    <th className="py-1">Member</th>
                    <th className="py-1 text-right">Paid</th>
                    <th className="py-1 text-right">Owed</th>
                    <th className="py-1 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.balances.map((b) => (
                    <tr key={b.member_id} className="border-t border-white/5">
                      <td className="py-1">{b.name}</td>
                      <td className="py-1 text-right">{fmt(b.paid, group.currency)}</td>
                      <td className="py-1 text-right">{fmt(b.owed, group.currency)}</td>
                      <td
                        className={`py-1 text-right font-medium ${
                          parseFloat(b.net) >= 0 ? "text-emerald-400" : "text-red-300"
                        }`}
                      >
                        {fmt(b.net, group.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 className="mb-2 text-sm font-semibold">Settle up</h3>
            {data.settlements.length === 0 ? (
              <p className="text-sm text-slate-400">All settled.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.settlements.map((t, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>
                      <strong>{t.from_name}</strong> → <strong>{t.to_name}</strong>
                    </span>
                    <span className="font-semibold">
                      {fmt(t.amount, group.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
