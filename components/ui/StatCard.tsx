// Kaynak: pdks_app_stabil_v8_4.py satır 1398 (StatCard) — dashboard istatistik kartı.

const TONES = {
  teal: {
    glow: "rgba(56,189,248,0.18)",
    border: "rgba(56,189,248,0.25)",
    bg: "rgba(56,189,248,0.07)",
    accent: "#38bdf8",
    shimmer: "rgba(56,189,248,0.06)",
  },
  green: {
    glow: "rgba(52,211,153,0.18)",
    border: "rgba(52,211,153,0.25)",
    bg: "rgba(52,211,153,0.07)",
    accent: "#34d399",
    shimmer: "rgba(52,211,153,0.06)",
  },
  red: {
    glow: "rgba(248,113,113,0.18)",
    border: "rgba(248,113,113,0.25)",
    bg: "rgba(248,113,113,0.07)",
    accent: "#f87171",
    shimmer: "rgba(248,113,113,0.06)",
  },
  amber: {
    glow: "rgba(251,191,36,0.18)",
    border: "rgba(251,191,36,0.25)",
    bg: "rgba(251,191,36,0.07)",
    accent: "#fbbf24",
    shimmer: "rgba(251,191,36,0.06)",
  },
  violet: {
    glow: "rgba(167,139,250,0.18)",
    border: "rgba(167,139,250,0.25)",
    bg: "rgba(167,139,250,0.07)",
    accent: "#a78bfa",
    shimmer: "rgba(167,139,250,0.06)",
  },
  slate: {
    glow: "rgba(148,163,184,0.1)",
    border: "rgba(255,255,255,0.1)",
    bg: "rgba(255,255,255,0.04)",
    accent: "#94a3b8",
    shimmer: "rgba(255,255,255,0.03)",
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
      className="relative overflow-hidden rounded-2xl p-4 transition-all duration-200"
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: `0 4px 24px ${t.glow}`,
      }}
    >
      {/* Köşe parıltısı */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20"
        style={{ background: `radial-gradient(circle, ${t.accent}, transparent 70%)` }}
      />

      {/* Üst etiket */}
      <div
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: t.accent, opacity: 0.85 }}
      >
        {icon && (
          <span aria-hidden className="text-sm leading-none">
            {icon}
          </span>
        )}
        <span>{label}</span>
      </div>

      {/* Değer */}
      <div
        className="mt-2.5 text-2xl font-bold tabular-nums tracking-tight"
        style={{ color: "var(--tx-primary)" }}
      >
        {value}
      </div>

      {/* Hint */}
      {hint && (
        <div
          className="mt-1 text-xs"
          style={{ color: "var(--tx-secondary)" }}
        >
          {hint}
        </div>
      )}

      {/* Alt renk çizgisi */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${t.accent}60, transparent)`,
        }}
      />
    </div>
  );
}
