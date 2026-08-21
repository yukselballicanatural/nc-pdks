// Bilgi / uyarı / hata şeridi — sayfaların üstündeki açıklama kutuları.
//
// Bu kalıp her sayfada ham rgba renklerle elle yazılıyordu; hem tutarsızdı
// hem de açık temada okunmuyordu. Renkler artık token, dolayısıyla iki temada
// da doğru kontrastta.

export type NoticeTon = "info" | "warn" | "danger" | "ok";

const TON = {
  info:   { bg: "var(--cl-info-dim)",   edge: "var(--cl-info-edge)",   fg: "var(--cl-info)" },
  warn:   { bg: "var(--cl-warn-dim)",   edge: "var(--cl-warn-edge)",   fg: "var(--cl-warn)" },
  danger: { bg: "var(--cl-danger-dim)", edge: "var(--cl-danger-edge)", fg: "var(--cl-danger)" },
  ok:     { bg: "var(--cl-ok-dim)",     edge: "var(--cl-ok-edge)",     fg: "var(--cl-ok)" },
} as const;

const IKON: Record<NoticeTon, React.ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  warn: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  danger: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>
  ),
  ok: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </>
  ),
};

export default function Notice({
  ton = "info",
  baslik,
  children,
  className = "",
}: {
  ton?: NoticeTon;
  baslik?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TON[ton];
  return (
    <div
      className={`flex gap-2.5 p-3.5 text-[11.5px] leading-relaxed ${className}`}
      style={{
        background: t.bg,
        border: `1px solid ${t.edge}`,
        borderRadius: "var(--r-sm)",
        color: "var(--tx-secondary)",
      }}
      role={ton === "danger" ? "alert" : undefined}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="mt-px shrink-0"
        style={{ color: t.fg }}
      >
        {IKON[ton]}
      </svg>
      <div className="min-w-0">
        {baslik && (
          <div className="mb-1 text-[12.5px] font-semibold" style={{ color: t.fg }}>
            {baslik}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Şerit içinde vurgulanacak kelime — tekrar eden <strong> stilini tek yerde tutar. */
export function Vurgu({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{ color: "var(--tx-primary)", fontWeight: 600 }}>{children}</strong>
  );
}
