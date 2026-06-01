import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
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
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.balances.map((b) => ({
                    name: b.name,
                    paid: parseFloat(b.paid),
                    owed: parseFloat(b.owed),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="paid" fill="#38bdf8" />
                  <Bar dataKey="owed" fill="#075985" />
                </BarChart>
              </ResponsiveContainer>
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
