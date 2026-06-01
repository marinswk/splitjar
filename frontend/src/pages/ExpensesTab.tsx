import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Group } from "../api/client";
import { FormulaInput } from "../components/FormulaInput";
import { ShareEditor, type ShareDraft } from "../components/ShareEditor";
import { MonthPicker } from "../components/MonthPicker";

function fmtMoney(amount: string | number, currency: string): string {
  const v = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
}

const today = new Date().toISOString().slice(0, 10);

export default function ExpensesTab({ group }: { group: Group }) {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: members = [] } = useQuery({
    queryKey: ["members", group.id],
    queryFn: () => api.listMembers(group.id),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses", group.id, year, month],
    queryFn: () => api.listExpenses(group.id, year, month),
  });

  const memberName = (id: number) => members.find((m) => m.id === id)?.name ?? "?";

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountValue, setAmountValue] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [payerId, setPayerId] = useState<number | null>(null);
  const [shares, setShares] = useState<ShareDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);

  const create = useMutation({
    mutationFn: async () => {
      if (!payerId) throw new Error("pick a payer");
      if (amountValue === null || amountValue <= 0) throw new Error("invalid amount");
      const total = shares.reduce((a, s) => a + (parseFloat(s.percentage) || 0), 0);
      if (Math.abs(total - 100) > 0.01) throw new Error("shares must sum to 100%");
      return api.createExpense(group.id, {
        payer_id: payerId,
        amount: amountValue.toFixed(2),
        description,
        date,
        shares,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", group.id] });
      qc.invalidateQueries({ queryKey: ["stats", group.id] });
      setShowForm(false);
      setAmount("");
      setDescription("");
      setShares([]);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", group.id] });
      qc.invalidateQueries({ queryKey: ["stats", group.id] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
        <button
          className="btn-primary"
          onClick={() => setShowForm((v) => !v)}
          disabled={!activeMembers.length}
        >
          {showForm ? "Cancel" : "+ Add expense"}
        </button>
      </div>

      {!activeMembers.length && (
        <p className="card text-sm text-jar-600">
          Add at least one member in <strong>Settings</strong> before logging expenses.
        </p>
      )}

      {showForm && (
        <div className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Amount</label>
              <FormulaInput
                value={amount}
                onChange={setAmount}
                onValue={setAmountValue}
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <input
                className="input"
                placeholder="What was it for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Paid by</label>
              <select
                className="input"
                value={payerId ?? ""}
                onChange={(e) => setPayerId(parseInt(e.target.value, 10))}
              >
                <option value="">Choose…</option>
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <ShareEditor members={members} shares={shares} onChange={setShares} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button className="btn-primary" disabled={create.isPending} onClick={() => create.mutate()}>
              Save expense
            </button>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <p className="text-sm text-jar-600">No expenses for this month.</p>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li key={e.id} className="card flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{e.description || "(no description)"}</div>
                <div className="text-xs text-jar-600">
                  {e.date} · paid by {memberName(e.payer_id)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{fmtMoney(e.amount, group.currency)}</div>
                <button
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => {
                    if (confirm("Delete this expense?")) del.mutate(e.id);
                  }}
                >
                  delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
