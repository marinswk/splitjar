import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";

const COMMON_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "SEK", "NOK", "DKK", "CZK", "PLN"];

function relativeTime(iso: string): string {
  // Backend serializes naive UTC, e.g. "2026-06-01T16:12:21.040223". Treat it as UTC.
  const isoUtc = iso.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + "Z";
  const then = new Date(isoUtc).getTime();
  const diff = Date.now() - then;
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)} min ago`;
  if (diff < day) return `${Math.floor(diff / hr)} h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} days ago`;
  return new Date(isoUtc).toLocaleDateString();
}

export default function GroupsList() {
  const qc = useQueryClient();
  const { data: groups = [], isLoading } = useQuery({ queryKey: ["groups"], queryFn: api.listGroups });
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("EUR");

  const create = useMutation({
    mutationFn: () => api.createGroup({ name: name.trim(), currency }),
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">New group</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              placeholder="Trip Lisbon, Apartment 4B, …"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <select
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {COMMON_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              className="btn-primary w-full sm:w-auto"
              disabled={!name.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Create
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Your groups</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-slate-500">No groups yet. Create one above.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  to={`/groups/${g.id}`}
                  className="card block transition hover:border-emerald-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-xs text-slate-500">{g.currency}</span>
                  </div>
                  <div
                    className="mt-1 text-xs text-slate-500"
                    title={new Date(g.created_at.endsWith("Z") ? g.created_at : g.created_at + "Z").toLocaleString()}
                  >
                    Created {relativeTime(g.created_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
