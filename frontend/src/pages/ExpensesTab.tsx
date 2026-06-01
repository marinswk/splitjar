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
import { PeriodFilter } from "../components/PeriodFilter";
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

type SplitSummary =
  | { kind: "everyone"; each: string }
  | { kind: "equal-subset"; names: string[]; each: string }
  | { kind: "uneven"; entries: { name: string; amount: string }[] }
  | { kind: "uneven-many"; count: number; entries: { name: string; amount: string }[] };

function describeShares(
  expense: Expense,
  members: Member[],
  activeMemberCount: number,
): SplitSummary {
  const shares = expense.shares;
  const total = parseFloat(expense.amount);
  const allEqual =
    shares.length >= 2 &&
    shares.every(
      (s) =>
        Math.abs(parseFloat(s.percentage) - parseFloat(shares[0].percentage)) < 0.05,
    );

  const nameOf = (id: number) => members.find((m) => m.id === id)?.name ?? "?";

  if (allEqual) {
    const each = (total / shares.length).toFixed(2);
    if (shares.length === activeMemberCount) return { kind: "everyone", each };
    return { kind: "equal-subset", names: shares.map((s) => nameOf(s.member_id)), each };
  }

  const entries = shares.map((s) => ({
    name: nameOf(s.member_id),
    amount: ((total * parseFloat(s.percentage)) / 100).toFixed(2),
  }));
  if (entries.length <= 3) return { kind: "uneven", entries };
  return { kind: "uneven-many", count: entries.length, entries };
}

export default function ExpensesTab({ group }: { group: Group }) {
  const qc = useQueryClient();

  const now = new Date();
  const [mode, setMode] = useState<"all" | "month">("all");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [page, setPage] = useState(0);

  const { data: members = [] } = useQuery({
    queryKey: ["members", group.id],
    queryFn: () => api.listMembers(group.id),
  });

  const queryParams = {
    year: mode === "month" ? year : undefined,
    month: mode === "month" ? month : undefined,
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
  }, [mode, year, month]);

  const memberName = (id: number) => members.find((m) => m.id === id)?.name ?? "?";
  const activeMembers = useMemo(() => members.filter((m) => m.active), [members]);

  // --- Expense form (create OR edit) ---
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [amountValue, setAmountValue] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today);
  const [payerId, setPayerId] = useState<number | null>(null);
  const [shares, setShares] = useState<ShareDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setEditingId(null);
    setAmount("");
    setAmountValue(null);
    setDescription("");
    setDate(today);
    setPayerId(activeMembers.length ? activeMembers[0].id : null);
    setShares(equalShares(members));
    setError(null);
    setShowForm(true);
  };

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setAmount(e.amount);
    setAmountValue(parseFloat(e.amount));
    setDescription(e.description);
    setDate(e.date);
    setPayerId(e.payer_id);
    setShares(e.shares.map((s) => ({ member_id: s.member_id, percentage: parseFloat(s.percentage).toFixed(2) })));
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transactions", group.id] });
    qc.invalidateQueries({ queryKey: ["stats", group.id] });
    qc.invalidateQueries({ queryKey: ["stats-alltime", group.id] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!payerId) throw new Error("pick a payer");
      if (amountValue === null || amountValue <= 0) throw new Error("invalid amount");
      const t = shares.reduce((a, s) => a + (parseFloat(s.percentage) || 0), 0);
      if (Math.abs(t - 100) > 0.05) throw new Error("shares must sum to 100%");
      const body = {
        payer_id: payerId,
        amount: amountValue.toFixed(2),
        description,
        date,
        shares,
      };
      return editingId !== null
        ? api.updateExpense(editingId, body)
        : api.createExpense(group.id, body);
    },
    onSuccess: () => {
      invalidate();
      closeForm();
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
        <button
          className="btn-primary"
          onClick={() => (showForm ? closeForm() : openNew())}
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {editingId !== null ? "Edit expense" : "New expense"}
            </h3>
          </div>
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
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={closeForm}>
              Cancel
            </button>
            <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {editingId !== null ? "Save changes" : "Save expense"}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="card text-sm text-jar-600">
          {mode === "month" ? "No transactions in this month." : "No transactions yet."}
        </p>
      ) : (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
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
                      onEdit={() => openEdit(row)}
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

function SplitCell({
  summary,
  currency,
}: {
  summary: SplitSummary;
  currency: string;
}) {
  if (summary.kind === "everyone") {
    return (
      <div>
        <span>Everyone</span>
        <span className="ml-1 text-xs text-jar-600">
          ({fmtMoney(summary.each, currency)} each)
        </span>
      </div>
    );
  }
  if (summary.kind === "equal-subset") {
    return (
      <div>
        <span>{summary.names.join(", ")}</span>
        <span className="ml-1 text-xs text-jar-600">
          ({fmtMoney(summary.each, currency)} each)
        </span>
      </div>
    );
  }
  if (summary.kind === "uneven") {
    return (
      <div className="space-y-0.5">
        {summary.entries.map((e, i) => (
          <div key={i} className="text-xs">
            <span className="text-jar-800">{e.name}</span>
            <span className="ml-1 text-jar-600">{fmtMoney(e.amount, currency)}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      className="text-jar-600"
      title={summary.entries
        .map((e) => `${e.name}: ${fmtMoney(e.amount, currency)}`)
        .join("\n")}
    >
      {summary.count} people (custom split)
    </div>
  );
}

function ExpenseRowView({
  expense,
  members,
  activeMemberCount,
  currency,
  onEdit,
  onDelete,
  memberName,
}: {
  expense: Expense;
  members: Member[];
  activeMemberCount: number;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  memberName: (id: number) => string;
}) {
  const summary = describeShares(expense, members, activeMemberCount);
  return (
    <tr className="hover:bg-jar-50">
      <td className="whitespace-nowrap px-3 py-2 align-top text-jar-600">{expense.date}</td>
      <td className="whitespace-nowrap px-3 py-2 align-top font-medium">
        {memberName(expense.payer_id)}
      </td>
      <td className="px-3 py-2 align-top">
        {expense.description || <span className="text-jar-600">—</span>}
      </td>
      <td className="px-3 py-2 align-top">
        <SplitCell summary={summary} currency={currency} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top text-right font-semibold">
        {fmtMoney(expense.amount, currency)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top text-right">
        <div className="flex justify-end gap-3">
          <button className="text-xs text-jar-600 hover:underline" onClick={onEdit}>
            edit
          </button>
          <button className="text-xs text-red-600 hover:underline" onClick={onDelete}>
            delete
          </button>
        </div>
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
      <td className="whitespace-nowrap px-3 py-2 align-top text-jar-600">{settlement.date}</td>
      <td className="whitespace-nowrap px-3 py-2 align-top font-medium">
        {memberName(settlement.from_member_id)}
      </td>
      <td className="px-3 py-2 align-top">
        <span className="rounded-full bg-jar-200 px-2 py-0.5 text-xs font-medium text-jar-800">
          ⇋ Settlement
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top text-jar-600">
        {memberName(settlement.to_member_id)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top text-right font-semibold">
        {fmtMoney(settlement.amount, currency)}
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top text-right">
        <button className="text-xs text-red-600 hover:underline" onClick={onDelete}>
          delete
        </button>
      </td>
    </tr>
  );
}
