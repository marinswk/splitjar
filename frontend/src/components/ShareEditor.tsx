import type { Member } from "../api/client";

export type ShareDraft = { member_id: number; percentage: string };

type Props = {
  members: Member[];
  shares: ShareDraft[];
  onChange: (shares: ShareDraft[]) => void;
};

export function ShareEditor({ members, shares, onChange }: Props) {
  const total = shares.reduce((acc, s) => acc + (parseFloat(s.percentage) || 0), 0);

  const setPct = (id: number, pct: string) => {
    const exists = shares.some((s) => s.member_id === id);
    onChange(
      exists
        ? shares.map((s) => (s.member_id === id ? { ...s, percentage: pct } : s))
        : [...shares, { member_id: id, percentage: pct }],
    );
  };

  const splitEqually = () => {
    const active = members.filter((m) => m.active);
    if (!active.length) return;
    const each = +(100 / active.length).toFixed(2);
    const result = active.map((m, i) => ({
      member_id: m.id,
      percentage: i === active.length - 1
        ? (100 - each * (active.length - 1)).toFixed(2)
        : each.toFixed(2),
    }));
    onChange(result);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label">Shares (%)</span>
        <button type="button" className="btn-ghost text-xs" onClick={splitEqually}>
          split equally
        </button>
      </div>
      <div className="space-y-1">
        {members
          .filter((m) => m.active)
          .map((m) => {
            const s = shares.find((x) => x.member_id === m.id);
            return (
              <div key={m.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{m.name}</span>
                <input
                  className="input w-24 text-right"
                  inputMode="decimal"
                  value={s?.percentage ?? ""}
                  onChange={(e) => setPct(m.id, e.target.value)}
                  placeholder="0"
                />
                <span className="w-4 text-sm text-jar-600">%</span>
              </div>
            );
          })}
      </div>
      <div className={`text-xs ${Math.abs(total - 100) > 0.01 ? "text-red-600" : "text-jar-600"}`}>
        total: {total.toFixed(2)}%
      </div>
    </div>
  );
}
