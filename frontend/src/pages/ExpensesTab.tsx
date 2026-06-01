import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  type Expense,
  type Group,
  type Member,
  type SettlementRecord,
} from "../api/client";
import { FormulaInput } from "../components/FormulaInput";
import { ShareEditor, type ShareDraft } from "../components/ShareEditor";
import { MonthPicker } from "../components/MonthPicker";
import { BalancesOverview } from "../components/BalancesOverview";

const PAGE_SIZE = 100;

function equalShares(members: Member[]): ShareDraft[] {
  const active = members.filter((m) => m.active);
  if (!active.length) return [];
  const each = +(100 / active.length).toFixed(2);
  return active.map((m, i) => ({
    member_id: m.id,
    percentage:
      i === active.length - 1
        ? (100 - each * (active.length - 1)).toFixed(2)
        : each.toFixed(2),
  }));
}

function fmtMoney(amount: string | number, currency: string): string {
  const v = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(v);
}

const today = new Date().toISOString().slice(0, 10);

function describeShares(
  expense: Expense,
  members: Member[],
  activeMemberCount: number,
): { forWhom: string; each: string | null } {
  const shares = expense.shares;
  const total = parseFloat(expense.amount);
  const allEqual =
    shares.length >= 2 &&
    shares.every(
      (s) => Math.abs(parseFloat(s.percentage) - parseFloat(shares[0].percentage)) < 0.05,
    );
  const coversEveryone = shares.length === activeMemberCount && allEqual;

  const each =
    allEqual && shares.length > 1 ? (total / shares.length).toFixed(2) : null;

  if (coversEveryone) return { forWhom: "Everyone", each };
  if (shares.length === 1) {
    return {
      forWhom: members.find((m) => m.id === shares[0].member_id)?.name ?? "?",
      each: null,
    };
  }
  if (shares.length <= 3) {
    const names = shares
      .map((s) => members.find((m) => m.id === s.member_id)?.name ?? "?")
      .join(", ");
    return { forWhom: names, each };
  }
  return { forWhom: `${shares.length} people`, each };
}

export default function ExpensesTab({ group }: { group: Group }) {
  const qc = useQueryClient();

  const now = new Date();
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [page, setPage] = useState(0);

  const { data: members = [] } = useQuery({
    queryKey: ["members", group.id],
    queryFn: () => api.listMembers(group.id),
  });

  const queryParams = {
    year: filterEnabled ? year : undefined,
    month: filterEnabled ? month : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data: txPage } = useQuery({
    queryKey: ["transactions", group.id, queryParams],
    queryFn: () => api.listTransactions(group.id, queryParams),
  });

  const total = txPage?.total ?? 0;
  const items = txPage?.items ?? [];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [filterEnabled, year, month]);

  const memberName = (id: number) => members.find((m) => m.id === id)?.name ?? "?";
  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountValue, setAmountValue] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [payerId, setPayerId] = useState<number | null>(null);
  const [shares, setShares] = useState<ShareDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showForm && shares.length === 0 && activeMembers.length > 0) {
      setShares(equalShares(members));
      if (payerId === null) setPayerId(activeMembers[0].id);
    }
  }, [showForm, activeMembers.length]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transactions", group.id] });
    qc.invalidateQueries({ queryKey: ["stats", group.id] });
    qc.invalidateQueries({ queryKey: ["stats-alltime", group.id] });
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!payerId) throw new Error("pick a payer");
      if (amountValue === null || amountValue <= 0) throw new Error("invalid amount");
      const t = shares.reduce((a, s) => a + (parseFloat(s.percentage) || 0), 0);
      if (Math.abs(t - 100) > 0.01) throw new Error("shares must sum to 100%");
      return api.createExpense(group.id, {
        payer_id: payerId,
        amount: amountValue.toFixed(2),
        description,
        date,
        shares,
      });
    },
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setAmount("");
      setDescription("");
      setShares([]);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const delExpense = useMutation({
    mutationFn: (id: number) => api.deleteExpense(id),
    onSuccess: invalidate,
  });
  const delSettlement = useMutation({
    mutationFn: (id: number) => api.deleteSettlement(id),
    onSuccess: invalidate,
  });

  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {activeMembers.length > 0 && <BalancesOverview group={group} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-jar-600">
            <input
              type="checkbox"
              className="rounded border-jar-200"
              checked={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.checked)}
            />
            Filter by month
          </label>
          {filterEnabled && (
            <MonthPicker
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          )}
        </div>
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
              <FormulaInput value={amount} onChange={setAmount} onValue={setAmountValue} />
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
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
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

      {items.length === 0 ? (
        <p className="card text-sm text-jar-600">
          {filterEnabled ? "No transactions in this month." : "No transactions yet."}
        </p>
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-jar-100 text-left text-xs uppercase tracking-wide text-jar-600">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Who paid</th>
                  <th className="px-3 py-2 font-medium">For what</th>
                  <th className="px-3 py-2 font-medium">For whom</th>
                  <th className="px-3 py-2 text-right font-medium">How much</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jar-100">
                {items.map((row) =>
                  row.kind === "expense" ? (
                    <ExpenseRowView
                      key={`e-${row.id}`}
                      expense={row}
                      members={members}
                      activeMemberCount={activeMembers.length}
                      currency={group.currency}
                      onDelete={() => {
                        if (confirm("Delete this expense?")) delExpense.mutate(row.id);
                      }}
                      memberName={memberName}
                    />
                  ) : (
                    <SettlementRowView
                      key={`s-${row.id}`}
                      settlement={row}
                      currency={group.currency}
                      memberName={memberName}
                      onDelete={() => {
                        if (confirm("Delete this settlement? The debt will reappear."))
                          delSettlement.mutate(row.id);
                      }}
                    />
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-jar-600">
            <span>
              Showing {showingFrom}–{showingTo} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="btn-ghost text-sm disabled:opacity-40"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ‹ Prev
              </button>
              <span className="px-2">
                Page {page + 1} of {pages}
              </span>
              <button
                className="btn-ghost text-sm disabled:opacity-40"
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExpenseRowView({
  expense,
  members,
  activeMemberCount,
  currency,
  onDelete,
  memberName,
}: {
  expense: Expense;
  members: Member[];
  activeMemberCount: number;
  currency: string;
  onDelete: () => void;
  memberName: (id: number) => string;
}) {
  const { forWhom, each } = describeShares(expense, members, activeMemberCount);
  return (
    <tr className="hover:bg-jar-50">
      <td className="whitespace-nowrap px-3 py-2 text-jar-600">{expense.date}</td>
      <td className="whitespace-nowrap px-3 py-2 font-medium">{memberName(expense.payer_id)}</td>
      <td className="px-3 py-2">{expense.description || <span className="text-jar-600">—</span>}</td>
      <td className="px-3 py-2 text-jar-600">{forWhom}</td>
      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
        {fmtMoney(expense.amount, currency)}
        {each && (
          <span className="ml-1 text-xs font-normal text-jar-600">({fmtMoney(each, currency)} each)</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        <button className="text-xs text-red-600 hover:underline" onClick={onDelete}>
          delete
        </button>
      </td>
    </tr>
  );
}

function SettlementRowView({
  settlement,
  currency,
  memberName,
  onDelete,
}: {
  settlement: SettlementRecord;
  currency: string;
  memberName: (id: number) => string;
  onDelete: () => void;
}) {
  return (
    <tr className="bg-jar-50/50 hover:bg-jar-50">
      <td className="whitespace-nowrap px-3 py-2 text-jar-600">{settlement.date}</td>
      <td className="whitespace-nowrap px-3 py-2 font-medium">{memberName(settlement.from_member_id)}</td>
      <td className="px-3 py-2">
        <span className="rounded-full bg-jar-200 px-2 py-0.5 text-xs font-medium text-jar-800">
          ⇋ Settlement
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-jar-600">
        {memberName(settlement.to_member_id)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
        {fmtMoney(settlement.amount, currency)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        <button className="text-xs text-red-600 hover:underline" onClick={onDelete}>
          delete
        </button>
      </td>
    </tr>
  );
}
