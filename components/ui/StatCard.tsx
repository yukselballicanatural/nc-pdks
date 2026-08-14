// Kaynak: pdks_app_stabil_v8_4.py satır 1398 (StatCard) — dashboard istatistik kartı.

const TONES = {
  teal: {
    glow:    "rgba(56,189,248,0.22)",
    border:  "rgba(56,189,248,0.28)",
    bg:      "rgba(56,189,248,0.08)",
    accent:  "#38bdf8",
    topLine: "rgba(56,189,248,0.55)",
    inset:   "rgba(56,189,248,0.06)",
  },
  green: {
    glow:    "rgba(52,211,153,0.22)",
    border:  "rgba(52,211,153,0.28)",
    bg:      "rgba(52,211,153,0.08)",
    accent:  "#34d399",
    topLine: "rgba(52,211,153,0.55)",
    inset:   "rgba(52,211,153,0.06)",
  },
  red: {
    glow:    "rgba(248,113,113,0.22)",
    border:  "rgba(248,113,113,0.28)",
    bg:      "rgba(248,113,113,0.08)",
    accent:  "#f87171",
    topLine: "rgba(248,113,113,0.55)",
    inset:   "rgba(248,113,113,0.06)",
  },
  amber: {
    glow:    "rgba(251,191,36,0.22)",
    border:  "rgba(251,191,36,0.28)",
    bg:      "rgba(251,191,36,0.08)",
    accent:  "#fbbf24",
    topLine: "rgba(251,191,36,0.55)",
    inset:   "rgba(251,191,36,0.06)",
  },
  violet: {
    glow:    "rgba(167,139,250,0.22)",
    border:  "rgba(167,139,250,0.28)",
    bg:      "rgba(167,139,250,0.08)",
    accent:  "#a78bfa",
    topLine: "rgba(167,139,250,0.55)",
    inset:   "rgba(167,139,250,0.06)",
  },
  slate: {
    glow:    "rgba(148,163,184,0.12)",
    border:  "rgba(255,255,255,0.11)",
    bg:      "rgba(255,255,255,0.048)",
    accent:  "#94a3b8",
    topLine: "rgba(255,255,255,0.20)",
    inset:   "rgba(255,255,255,0.025)",
  },
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
  const t = TONES[tone];

  return (
    <div
      className="stat-card relative overflow-hidden rounded-2xl p-5"
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: `0 1px 0 ${t.inset} inset, 0 8px 32px ${t.glow}`,
      }}
    >
      {/* Üst kenar parıltı çizgisi */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, transparent 10%, ${t.topLine} 50%, transparent 90%)`,
        }}
      />

      {/* Köşe radyal parıltı */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full"
        style={{
          background: `radial-gradient(circle, ${t.accent}30 0%, transparent 70%)`,
        }}
      />

      {/* Etiket satırı */}
      <div
        className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.10em]"
        style={{ color: t.accent }}
      >
        {icon && (
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded-md text-sm leading-none"
            style={{
              background: `${t.accent}1a`,
              border: `1px solid ${t.accent}30`,
            }}
          >
            {icon}
          </span>
        )}
        <span>{label}</span>
      </div>

      {/* Değer — büyük, tabular */}
      <div
        className="mt-3 text-3xl font-bold tabular-nums tracking-tight leading-none"
        style={{ color: "var(--tx-primary)", fontFeatureSettings: '"tnum"' }}
      >
        {value}
      </div>

      {/* Hint */}
      {hint && (
        <div
          className="mt-2 text-xs leading-relaxed"
          style={{ color: "var(--tx-secondary)" }}
        >
          {hint}
        </div>
      )}

      {/* Alt gradient çizgi */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${t.accent}50, transparent)`,
        }}
      />
    </div>
  );
}
