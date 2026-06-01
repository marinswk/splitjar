export type Group = {
  id: number;
  name: string;
  currency: string;
  created_at: string;
};

export type Member = {
  id: number;
  group_id: number;
  name: string;
  active: boolean;
};

export type Share = { member_id: number; percentage: string };

export type Expense = {
  id: number;
  group_id: number;
  payer_id: number;
  amount: string;
  description: string;
  date: string;
  created_at: string;
  shares: Share[];
};

export type MemberBalance = {
  member_id: number;
  name: string;
  paid: string;
  owed: string;
  net: string;
};

export type Transfer = {
  from_member_id: number;
  from_name: string;
  to_member_id: number;
  to_name: string;
  amount: string;
};

export type Stats = {
  total: string;
  balances: MemberBalance[];
  settlements: Transfer[];
};

export type SettlementRecord = {
  id: number;
  group_id: number;
  from_member_id: number;
  to_member_id: number;
  amount: string;
  date: string;
  created_at: string;
};

export type TransactionItem =
  | ({ kind: "expense" } & Expense)
  | ({ kind: "settlement" } & SettlementRecord);

export type TransactionsPage = {
  items: TransactionItem[];
  total: number;
  limit: number;
  offset: number;
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  listGroups: () => http<Group[]>("/api/groups"),
  createGroup: (body: { name: string; currency: string }) =>
    http<Group>("/api/groups", { method: "POST", body: JSON.stringify(body) }),
  getGroup: (id: number) => http<Group>(`/api/groups/${id}`),
  updateGroup: (id: number, body: { name: string; currency: string }) =>
    http<Group>(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteGroup: (id: number) => http<{ ok: boolean }>(`/api/groups/${id}`, { method: "DELETE" }),

  listMembers: (gid: number) => http<Member[]>(`/api/groups/${gid}/members`),
  createMember: (gid: number, body: { name: string }) =>
    http<Member>(`/api/groups/${gid}/members`, { method: "POST", body: JSON.stringify(body) }),
  updateMember: (id: number, body: { name: string }) =>
    http<Member>(`/api/members/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteMember: (id: number) =>
    http<{ ok: boolean }>(`/api/members/${id}`, { method: "DELETE" }),

  listExpenses: (gid: number, year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set("year", String(year));
    if (month) q.set("month", String(month));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return http<Expense[]>(`/api/groups/${gid}/expenses${qs}`);
  },
  createExpense: (gid: number, body: Omit<Expense, "id" | "group_id" | "created_at">) =>
    http<Expense>(`/api/groups/${gid}/expenses`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateExpense: (id: number, body: Omit<Expense, "id" | "group_id" | "created_at">) =>
    http<Expense>(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteExpense: (id: number) =>
    http<{ ok: boolean }>(`/api/expenses/${id}`, { method: "DELETE" }),

  stats: (gid: number, year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set("year", String(year));
    if (month) q.set("month", String(month));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return http<Stats>(`/api/groups/${gid}/stats${qs}`);
  },

  evalFormula: (expression: string) =>
    http<{ value: string }>("/api/formula/eval", {
      method: "POST",
      body: JSON.stringify({ expression }),
    }),

  settle: (gid: number) =>
    http<Transfer[]>(`/api/groups/${gid}/settle`, { method: "POST" }),

  listSettlements: (gid: number, year?: number, month?: number) => {
    const q = new URLSearchParams();
    if (year) q.set("year", String(year));
    if (month) q.set("month", String(month));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return http<SettlementRecord[]>(`/api/groups/${gid}/settlements${qs}`);
  },
  deleteSettlement: (id: number) =>
    http<{ ok: boolean }>(`/api/settlements/${id}`, { method: "DELETE" }),

  listTransactions: (
    gid: number,
    opts: { year?: number; month?: number; limit?: number; offset?: number } = {},
  ) => {
    const q = new URLSearchParams();
    if (opts.year) q.set("year", String(opts.year));
    if (opts.month) q.set("month", String(opts.month));
    if (opts.limit) q.set("limit", String(opts.limit));
    if (opts.offset) q.set("offset", String(opts.offset));
    const qs = q.toString() ? `?${q.toString()}` : "";
    return http<TransactionsPage>(`/api/groups/${gid}/transactions${qs}`);
  },
};
