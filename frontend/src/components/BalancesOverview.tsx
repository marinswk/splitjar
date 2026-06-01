import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Group } from "../api/client";

function fmt(amount: string, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    parseFloat(amount),
  );
}

export function BalancesOverview({ group }: { group: Group }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["stats-alltime", group.id],
    queryFn: () => api.stats(group.id),
  });

  const settle = useMutation({
    mutationFn: () => api.settle(group.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats-alltime", group.id] });
      qc.invalidateQueries({ queryKey: ["stats", group.id] });
      qc.invalidateQueries({ queryKey: ["expenses", group.id] });
    },
  });

  if (isLoading || !data) return null;

  const settled = data.settlements.length === 0;

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Current balances</h3>
        <button
          type="button"
          className="btn-primary text-xs disabled:opacity-50"
          disabled={settled || settle.isPending}
          onClick={() => {
            if (
              confirm(
                `Record ${data.settlements.length} settlement transfer(s) and bring all balances to 0?`,
              )
            ) {
              settle.mutate();
            }
          }}
        >
          {settled ? "All settled" : settle.isPending ? "Settling…" : "Settle up"}
        </button>
      </div>

      {settled ? (
        <p className="text-sm text-slate-500">Everyone is square. ✨</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {data.settlements.map((t, i) => (
            <li key={i} className="flex items-center justify-between">
              <span>
                <strong>{t.from_name}</strong>
                <span className="text-slate-500"> owes </span>
                <strong>{t.to_name}</strong>
              </span>
              <span className="font-semibold">{fmt(t.amount, group.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
