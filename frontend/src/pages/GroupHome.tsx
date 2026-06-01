import { NavLink, Route, Routes, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import ExpensesTab from "./ExpensesTab";
import StatsTab from "./StatsTab";
import SettingsTab from "./SettingsTab";

export default function GroupHome() {
  const { id } = useParams();
  const gid = Number(id);
  const { data: group } = useQuery({ queryKey: ["group", gid], queryFn: () => api.getGroup(gid) });

  if (!group) {
    return <p className="text-sm text-jar-600">Loading…</p>;
  }

  const tab = "rounded-md px-3 py-2 text-sm font-medium";
  const active = "bg-jar-200 text-jar-800";
  const inactive = "text-jar-600 hover:bg-jar-100";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{group.name}</h1>
          <p className="text-xs text-jar-600">{group.currency}</p>
        </div>
      </div>
      <nav className="flex gap-1 border-b border-jar-200 pb-1">
        <NavLink end to={`/groups/${gid}`} className={({ isActive }) => `${tab} ${isActive ? active : inactive}`}>
          Expenses
        </NavLink>
        <NavLink to={`/groups/${gid}/stats`} className={({ isActive }) => `${tab} ${isActive ? active : inactive}`}>
          Stats
        </NavLink>
        <NavLink to={`/groups/${gid}/settings`} className={({ isActive }) => `${tab} ${isActive ? active : inactive}`}>
          Settings
        </NavLink>
      </nav>
      <Routes>
        <Route index element={<ExpensesTab group={group} />} />
        <Route path="stats" element={<StatsTab group={group} />} />
        <Route path="settings" element={<SettingsTab group={group} />} />
      </Routes>
    </div>
  );
}
