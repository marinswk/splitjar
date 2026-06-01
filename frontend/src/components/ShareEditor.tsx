import type { Member } from "../api/client";

export type ShareDraft = { member_id: number; percentage: string };

type Props = {
  members: Member[];
  shares: ShareDraft[];
  onChange: (shares: ShareDraft[]) => void;
};

const ROUND = (n: number) => Math.round(n * 100) / 100;

function equalShares(members: Member[]): ShareDraft[] {
  const active = members.filter((m) => m.active);
  if (!active.length) return [];
  const each = ROUND(100 / active.length);
  return active.map((m, i) => ({
    member_id: m.id,
    percentage:
      i === active.length - 1
        ? (100 - each * (active.length - 1)).toFixed(2)
        : each.toFixed(2),
  }));
}

/**
 * Rebalance: set member `editedId` to `newPct`, scale every other share so the
 * row totals 100. Proportional scaling preserves the user's prior intent when
 * other shares were already uneven; falls back to an equal split when no other
 * share has weight to scale.
 */
function rebalance(
  members: Member[],
  shares: ShareDraft[],
  editedId: number,
  newPct: number,
): ShareDraft[] {
  const active = members.filter((m) => m.active);
  const others = active.filter((m) => m.id !== editedId);
  const newOthersTotal = ROUND(100 - newPct);

  const oldOthersTotal = others.reduce((acc, m) => {
    const s = shares.find((x) => x.member_id === m.id);
    return acc + (s ? parseFloat(s.percentage) || 0 : 0);
  }, 0);

  let nextOthers: ShareDraft[];
  if (oldOthersTotal > 0.01) {
    const factor = newOthersTotal / oldOthersTotal;
    nextOthers = others.map((m) => {
      const s = shares.find((x) => x.member_id === m.id);
      const old = s ? parseFloat(s.percentage) || 0 : 0;
      return { member_id: m.id, percentage: ROUND(old * factor).toFixed(2) };
    });
  } else if (others.length > 0) {
    const each = ROUND(newOthersTotal / others.length);
    nextOthers = others.map((m) => ({
      member_id: m.id,
      percentage: each.toFixed(2),
    }));
  } else {
    nextOthers = [];
  }

  // Absorb rounding drift in the last "other" so the row sums to exactly 100.
  if (nextOthers.length > 0) {
    const sumOthers = nextOthers.reduce((a, s) => a + parseFloat(s.percentage), 0);
    const drift = ROUND(newOthersTotal - sumOthers);
    if (Math.abs(drift) > 0) {
      const last = nextOthers[nextOthers.length - 1];
      last.percentage = (parseFloat(last.percentage) + drift).toFixed(2);
    }
  }

  return [
    { member_id: editedId, percentage: newPct.toFixed(2) },
    ...nextOthers,
  ];
}

export function ShareEditor({ members, shares, onChange }: Props) {
  const total = shares.reduce((acc, s) => acc + (parseFloat(s.percentage) || 0), 0);

  const setPct = (id: number, raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) {
      // Just store the raw text in the edited field so the user can keep typing.
      const exists = shares.some((s) => s.member_id === id);
      onChange(
        exists
          ? shares.map((s) =>
              s.member_id === id ? { ...s, percentage: raw } : s,
            )
          : [...shares, { member_id: id, percentage: raw }],
      );
      return;
    }
    const clamped = Math.max(0, Math.min(100, parsed));
    onChange(rebalance(members, shares, id, clamped));
  };

  const splitEqually = () => onChange(equalShares(members));

  const totalOk = Math.abs(total - 100) < 0.05;

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
                <span className="w-4 text-sm text-slate-400">%</span>
              </div>
            );
          })}
      </div>
      <div className={`text-xs ${totalOk ? "text-slate-400" : "text-red-400"}`}>
        total: {total.toFixed(2)}%
        {!totalOk && " — must sum to 100"}
      </div>
    </div>
  );
}
