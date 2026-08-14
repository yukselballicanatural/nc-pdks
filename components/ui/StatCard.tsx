// Kaynak: pdks_app_stabil_v8_4.py satır 1398 (StatCard) — dashboard istatistik kartı.

const TONES = {
  teal: "border-teal-500/30 bg-teal-500/5 text-teal-300",
  green: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  red: "border-red-500/30 bg-red-500/5 text-red-300",
  amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  violet: "border-violet-500/30 bg-violet-500/5 text-violet-300",
  slate: "border-slate-700 bg-slate-800/40 text-slate-300",
} as const;

export type StatTone = keyof typeof TONES;

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
  tone?: StatTone;
}) {
  return (
    <div className={`rounded-lg border p-4 ${TONES[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-80">
        {icon && <span aria-hidden>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs opacity-70">{hint}</div>}
    </div>
  );
}
