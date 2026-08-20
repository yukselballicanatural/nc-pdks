"use client";

// Özel dönem takvimi — native <input type="date"> yerine.
//
// Native takvim tarayıcının kendi açılır penceresini kullanıyordu: temayla
// uyumsuz, iki ayrı input ile aralık seçimi de sezgisel değildi. Bu bileşen tek
// açılır pencerede iki ay gösterir, aralığı tıkla-tıkla seçtirir.
//
// ── DÜZELTİLEN HATA: "takvim tablonun ARKASINDA kalıyor" ──
// Panel eskiden `position:absolute; z-50` ile tetikleyicinin içinde duruyordu.
// Sorun z-index değeri değil, YIĞIN BAĞLAMI (stacking context) idi: üst kap
// (DateRangeBar) `backdrop-filter` taşıdığı için YENİ bir yığın bağlamı açıyor;
// içindeki z-50 yalnızca o bağlamda geçerli oluyordu. Tablonun `sticky` başlığı
// ise ÜST bağlamda z-index taşıdığı için kabın tamamının üstüne biniyordu —
// z-50'yi ne kadar büyütsek de değişmezdi.
// Çözüm: panel createPortal ile doğrudan <body>'ye taşınıyor ve `position:fixed`
// oluyor. Böylece hiçbir ata yığın bağlamına hapsolmuyor.
//
// TARİH KONVANSİYONU: proje genelinde tarihler UTC alanlarında İstanbul duvar
// saati taşır (lib/engine/tz.ts). Burada da yalnızca Date.UTC / getUTC* kullanılır —
// yerel saat dilimi devreye girerse gün kaymaları olur.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
/** Pazartesi başlangıçlı — Türkiye'de hafta böyle başlar. */
const GUN_KISA = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

const PANEL_G = 532;
const PANEL_Y = 372;

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

interface Konum {
  top: number;
  left: number;
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
  const [konum, setKonum] = useState<Konum | null>(null);
  // Seçim sürecinde: ilk tıklama başlangıcı belirler, ikinci tıklama bitişi.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [leftMonth, setLeftMonth] = useState(() => {
    const d = parse(sd);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  });

  const tetikRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setAnchor(null);
    setHover(null);
  }, []);

  /**
   * Paneli tetikleyicinin altına yerleştirir; ekran dışına taşacaksa
   * içeri çeker / yukarı çevirir. Fixed konumlandırma kullanıldığı için
   * değerler viewport'a görelidir.
   */
  const konumHesapla = useCallback(() => {
    const t = tetikRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const bosluk = 8;

    let left = r.left;
    if (left + PANEL_G > window.innerWidth - bosluk) {
      left = window.innerWidth - PANEL_G - bosluk;
    }
    if (left < bosluk) left = bosluk;

    // Altta yer yoksa yukarı aç
    let top = r.bottom + bosluk;
    if (top + PANEL_Y > window.innerHeight - bosluk) {
      const ustte = r.top - PANEL_Y - bosluk;
      top = ustte >= bosluk ? ustte : Math.max(bosluk, window.innerHeight - PANEL_Y - bosluk);
    }

    setKonum({ top, left });
  }, []);

  // Panel açılır açılmaz, tarayıcı boyamadan ÖNCE konumlan — aksi hâlde
  // panel bir kare sol üst köşede görünüp sonra yerine sıçrar.
  useLayoutEffect(() => {
    if (open) konumHesapla();
  }, [open, konumHesapla]);

  // Dışarı tıklama, Escape, kaydırma ve yeniden boyutlandırma
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const hedef = e.target as Node;
      if (panelRef.current?.contains(hedef)) return;
      if (tetikRef.current?.contains(hedef)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // Sayfa kaydırılınca panel tetikleyiciden kopmasın diye yeniden konumlanır.
    // capture=true: iç kaydırma kaplarındaki (tablo gövdesi) kaydırmayı da yakalar.
    const onScroll = () => konumHesapla();

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, close, konumHesapla]);

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

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Dönem seç"
      className="glass-modal modal-panel z-popover fixed p-4"
      style={{
        top: konum?.top ?? -9999,
        left: konum?.left ?? -9999,
        width: PANEL_G,
        // Konum hesaplanana kadar görünmez — sıçrama olmasın
        visibility: konum ? "visible" : "hidden",
      }}
    >
      {/* Ay gezinme */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setLeftMonth((m) => addMonths(m, -1))}
          aria-label="Önceki ay"
          className="btn-icon"
          style={{ width: 28, height: 28 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-1 justify-around text-[13px] font-semibold" style={{ color: "var(--tx-primary)" }}>
          {months.map((m) => (
            <span key={fmt(m)}>
              {AY_ADLARI[m.getUTCMonth()]} {m.getUTCFullYear()}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLeftMonth((m) => addMonths(m, 1))}
          aria-label="Sonraki ay"
          className="btn-icon"
          style={{ width: 28, height: 28 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex gap-5">
        {months.map((m) => (
          <div key={fmt(m)} className="flex-1">
            <div className="mb-1.5 grid grid-cols-7 gap-0.5">
              {GUN_KISA.map((g) => (
                <div
                  key={g}
                  className="text-center text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: "var(--tx-secondary)" }}
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
                const uc = isStart || isEnd;

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(key)}
                    onMouseEnter={() => anchor && setHover(key)}
                    aria-label={human(key)}
                    aria-current={isToday ? "date" : undefined}
                    className="relative h-8 text-xs tabular-nums transition-colors duration-100"
                    style={{
                      borderRadius: uc ? "var(--r-xs)" : "var(--r-input)",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.28 : 1,
                      background: uc
                        ? "var(--ac-grad)"
                        : inRange
                          ? "var(--ac-sky-dim)"
                          : "transparent",
                      color: uc
                        ? "var(--ac-on)"
                        : inRange
                          ? "var(--ac-sky)"
                          : hafta
                            ? "var(--tx-muted)"
                            : "var(--tx-secondary)",
                      fontWeight: uc ? 700 : 500,
                      boxShadow:
                        isToday && !uc ? "inset 0 0 0 1.5px var(--ac-cyan)" : undefined,
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

      <p className="mt-3 text-[11px]" style={{ color: "var(--tx-secondary)" }}>
        {anchor
          ? `Başlangıç ${human(anchor)} — bitiş için bir gün daha seçin`
          : "Aralık için başlangıç ve bitiş gününe tıklayın"}
      </p>
    </div>
  );

  return (
    <>
      <button
        ref={tetikRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn-ghost flex items-center gap-2 text-xs font-medium"
        style={{
          height: 34,
          padding: "0 12px",
          borderColor: open ? "var(--ac-sky)" : "var(--edge-soft)",
          color: "var(--tx-primary)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--ac-sky)" }}>
          <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
          <path d="M16 2.5v4M8 2.5v4M3 10h18" />
        </svg>
        <span className="tabular-nums">{human(sd)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--tx-muted)" }}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <span className="tabular-nums">{human(ed)}</span>
      </button>

      {/* Portal: panel <body>'ye taşınıyor — ata yığın bağlamlarından kurtulur.
          typeof document kontrolü SSR için (sunucuda document yok). */}
      {open && typeof document !== "undefined"
        ? createPortal(panel, document.body)
        : null}
    </>
  );
}
