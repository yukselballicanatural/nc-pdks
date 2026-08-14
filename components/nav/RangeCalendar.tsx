"use client";

// Özel dönem takvimi — native <input type="date"> yerine.
//
// Native takvim tarayıcının kendi açılır penceresini kullanıyordu: koyu temayla
// uyumsuz, iki ayrı input ile aralık seçimi de sezgisel değildi. Bu bileşen tek
// açılır pencerede iki ay gösterir, aralığı tıkla-tıkla seçtirir.
//
// TARİH KONVANSİYONU: proje genelinde tarihler UTC alanlarında İstanbul duvar
// saati taşır (lib/engine/tz.ts). Burada da yalnızca Date.UTC / getUTC* kullanılır —
// yerel saat dilimi devreye girerse gün kaymaları olur.

import { useEffect, useMemo, useRef, useState } from "react";

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
/** Pazartesi başlangıçlı — Türkiye'de hafta böyle başlar. */
const GUN_KISA = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmt(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}
function human(s: string): string {
  const d = parse(s);
  return `${d.getUTCDate()} ${AY_ADLARI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

/** Bir ayın takvim ızgarası: baştaki boşluklar dahil, Pazartesi başlangıçlı. */
function monthGrid(month: Date): (Date | null)[] {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const daysInMonth = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)
  ).getUTCDate();
  // getUTCDay: 0=Pazar → Pazartesi başlangıcına çevir
  const lead = (first.getUTCDay() + 6) % 7;

  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), i)));
  }
  return cells;
}

export default function RangeCalendar({
  sd,
  ed,
  today,
  onApply,
}: {
  sd: string;
  ed: string;
  today: string;
  onApply: (sd: string, ed: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Seçim sürecinde: ilk tıklama başlangıcı belirler, ikinci tıklama bitişi.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = parse(sd);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  });
  const boxRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklama + Escape ile kapanma
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  });

  function close() {
    setOpen(false);
    setAnchor(null);
    setHover(null);
  }

  // Görsel aralık: seçim yarıda kaldıysa fareyle gezilen güne kadar göster.
  const [visFrom, visTo] = useMemo(() => {
    if (anchor) {
      const other = hover ?? anchor;
      return anchor <= other ? [anchor, other] : [other, anchor];
    }
    return [sd, ed];
  }, [anchor, hover, sd, ed]);

  const maxDay = today;

  function pick(day: string) {
    if (day > maxDay) return; // gelecek tarih seçilemez
    if (!anchor) {
      setAnchor(day);
      setHover(day);
      return;
    }
    const [a, b] = anchor <= day ? [anchor, day] : [day, anchor];
    onApply(a, b);
    close();
  }

  const months = [leftMonth, addMonths(leftMonth, 1)];

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors duration-150"
        style={{
          background: open ? "var(--glass-bg-hi)" : "var(--glass-bg-md)",
          border: `1px solid ${open ? "var(--ac-sky)" : "var(--glass-border)"}`,
          color: "var(--tx-primary)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="1.5" y="3" width="13" height="11.5" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M1.5 6.5h13M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <span>{human(sd)}</span>
        <span style={{ color: "var(--tx-muted)" }}>→</span>
        <span>{human(ed)}</span>
      </button>

      {open && (
        <div
          className="glass-modal modal-panel absolute left-0 z-50 mt-2 p-4"
          style={{ minWidth: 520 }}
        >
          {/* Ay gezinme */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setLeftMonth((m) => addMonths(m, -1))}
              aria-label="Önceki ay"
              className="rounded-lg px-2 py-1 text-sm transition-colors"
              style={{ background: "var(--glass-bg-md)", color: "var(--tx-secondary)" }}
            >
              ‹
            </button>
            <div className="flex gap-16 text-sm font-medium" style={{ color: "var(--tx-primary)" }}>
              {months.map((m) => (
                <span key={fmt(m)} style={{ minWidth: 110, textAlign: "center" }}>
                  {AY_ADLARI[m.getUTCMonth()]} {m.getUTCFullYear()}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLeftMonth((m) => addMonths(m, 1))}
              aria-label="Sonraki ay"
              className="rounded-lg px-2 py-1 text-sm transition-colors"
              style={{ background: "var(--glass-bg-md)", color: "var(--tx-secondary)" }}
            >
              ›
            </button>
          </div>

          <div className="flex gap-6">
            {months.map((m) => (
              <div key={fmt(m)} style={{ width: 224 }}>
                <div className="mb-1 grid grid-cols-7 gap-0.5">
                  {GUN_KISA.map((g) => (
                    <div
                      key={g}
                      className="text-center text-[10px] font-semibold uppercase"
                      style={{ color: "var(--tx-muted)" }}
                    >
                      {g}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {monthGrid(m).map((d, i) => {
                    if (!d) return <div key={`b${i}`} />;
                    const key = fmt(d);
                    const disabled = key > maxDay;
                    const isStart = key === visFrom;
                    const isEnd = key === visTo;
                    const inRange = key > visFrom && key < visTo;
                    const isToday = key === today;
                    const hafta = d.getUTCDay() === 0 || d.getUTCDay() === 6;

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={disabled}
                        onClick={() => pick(key)}
                        onMouseEnter={() => anchor && setHover(key)}
                        className="relative h-8 rounded-lg text-xs transition-colors duration-100"
                        style={{
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.25 : 1,
                          background:
                            isStart || isEnd
                              ? "linear-gradient(135deg, var(--ac-sky), var(--ac-cyan))"
                              : inRange
                                ? "var(--ac-sky-dim)"
                                : "transparent",
                          color:
                            isStart || isEnd
                              ? "#06091a"
                              : inRange
                                ? "#dff3ff"
                                : hafta
                                  ? "var(--tx-muted)"
                                  : "var(--tx-secondary)",
                          fontWeight: isStart || isEnd ? 600 : 400,
                          boxShadow: isToday && !isStart && !isEnd ? "inset 0 0 0 1px var(--ac-cyan)" : undefined,
                        }}
                      >
                        {d.getUTCDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px]" style={{ color: "var(--tx-muted)" }}>
            {anchor
              ? `Başlangıç ${human(anchor)} — bitiş için bir gün daha seçin`
              : "Aralık için başlangıç ve bitiş gününe tıklayın"}
          </p>
        </div>
      )}
    </div>
  );
}
