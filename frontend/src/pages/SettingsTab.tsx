import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, type Group } from "../api/client";

const COMMON_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "SEK", "NOK", "DKK", "CZK", "PLN"];

export default function SettingsTab({ group }: { group: Group }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: members = [] } = useQuery({
    queryKey: ["members", group.id],
    queryFn: () => api.listMembers(group.id),
  });

  const [newName, setNewName] = useState("");
  const [name, setName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency);

  const addMember = useMutation({
    mutationFn: () => api.createMember(group.id, { name: newName.trim() }),
    onSuccess: () => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["members", group.id] });
    },
  });

  const renameMember = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.updateMember(id, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", group.id] }),
  });

  const removeMember = useMutation({
    mutationFn: (id: number) => api.deleteMember(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", group.id] }),
  });

  const saveGroup = useMutation({
    mutationFn: () => api.updateGroup(group.id, { name: name.trim(), currency }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group", group.id] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: () => api.deleteGroup(group.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      navigate("/");
    },
  });

  return (
    <div className="space-y-4">
      <section className="card space-y-3">
        <h3 className="text-sm font-semibold">Group</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {COMMON_CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full sm:w-auto" onClick={() => saveGroup.mutate()}>
              Save
            </button>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="text-sm font-semibold">Members</h3>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Add member…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && addMember.mutate()}
          />
          <button
            className="btn-primary"
            disabled={!newName.trim() || addMember.isPending}
            onClick={() => addMember.mutate()}
          >
            Add
          </button>
        </div>
        <ul className="divide-y divide-white/5">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 py-2">
              <input
                className="input flex-1"
                defaultValue={m.name}
                disabled={!m.active}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== m.name) renameMember.mutate({ id: m.id, name: v });
                }}
              />
              {m.active ? (
                <button
                  className="text-xs text-red-400 hover:underline"
                  onClick={() => removeMember.mutate(m.id)}
                >
                  remove
                </button>
              ) : (
                <span className="text-xs text-slate-400">inactive</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2 border-red-500/30">
        <h3 className="text-sm font-semibold text-red-300">Danger zone</h3>
        <button
          className="btn bg-red-500 text-white hover:bg-red-600"
          onClick={() => {
            if (confirm(`Delete group "${group.name}" and all its expenses?`)) deleteGroup.mutate();
          }}
        >
          Delete group
        </button>
      </section>
    </div>
  );
}
