"use client";

// Bir işaretin yanında açılan açıklama balonu (tooltip / popover).
//
// NEDEN MODAL DEĞİL: tablo taranırken "bu satırda ne var" sorusuna cevap
// vermek için sayfayı karartıp odak çalmak fazla ağır bir hamle. Balon,
// bakışı satırdan koparmadan açılır ve fare çekilince kapanır.
//
// ETKİLEŞİMLİ TOOLTIP: içinde bağlantı (konum linki) olabildiği için fare
// balonun üstüne geçtiğinde kapanmaması gerekiyor. Bu yüzden kapanış küçük
// bir gecikmeyle planlanıyor; imleç balona girerse iptal ediliyor. Tıklama
// ise balonu "sabitler" — dokunmatik ekranda ve klavyeyle tek yol bu.
//
// Konumlandırma takvim/modal ile aynı dersi izliyor: panel createPortal ile
// <body>'ye taşınıp position:fixed oluyor, böylece backdrop-filter taşıyan
// bir ata (başlık şeridi, kart) yeni bir yığın bağlamı açtığında balon
// tablonun altında kalmıyor.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Fare tetikleyiciden çıkınca kapanmadan önceki tolerans (ms). */
const KAPANMA_GECIKMESI = 160;
const BOSLUK = 8;

export default function InfoTip({
  children,
  etiket = "Ayrıntı",
}: {
  /** Balonun içeriği. */
  children: React.ReactNode;
  /** Erişilebilirlik etiketi ve native title. */
  etiket?: string;
}) {
  const [acik, setAcik] = useState(false);
  const [sabit, setSabit] = useState(false);
  const [konum, setKonum] = useState<{ top: number; left: number } | null>(null);

  const tetikRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  const iptalKapanma = useCallback(() => {
    if (zamanlayici.current) {
      clearTimeout(zamanlayici.current);
      zamanlayici.current = null;
    }
  }, []);

  const kapat = useCallback(() => {
    iptalKapanma();
    setAcik(false);
    setSabit(false);
  }, [iptalKapanma]);

  const kapanmaPlanla = useCallback(() => {
    iptalKapanma();
    zamanlayici.current = setTimeout(() => {
      // Sabitlenmişse (tıklanmışsa) fare çekilse de açık kalır.
      setSabit((s) => {
        if (!s) setAcik(false);
        return s;
      });
    }, KAPANMA_GECIKMESI);
  }, [iptalKapanma]);

  /** Balonu tetikleyicinin ÜSTÜNE yerleştirir; yer yoksa altına çevirir. */
  const konumHesapla = useCallback(() => {
    const t = tetikRef.current;
    const p = panelRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    // Panel henüz ölçülmediyse makul bir varsayımla başla, sonraki karede düzelir.
    const pg = p?.offsetWidth ?? 320;
    const py = p?.offsetHeight ?? 90;

    let left = r.left + r.width / 2 - pg / 2;
    if (left + pg > window.innerWidth - BOSLUK) left = window.innerWidth - pg - BOSLUK;
    if (left < BOSLUK) left = BOSLUK;

    let top = r.top - py - BOSLUK;
    if (top < BOSLUK) top = r.bottom + BOSLUK; // üstte yer yok → alta aç

    setKonum({ top, left });
  }, []);

  // Boyamadan ÖNCE konumlan; yoksa balon bir kare sol üstte görünüp yerine sıçrar.
  useLayoutEffect(() => {
    if (acik) konumHesapla();
  }, [acik, konumHesapla]);

  useEffect(() => {
    if (!acik) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") kapat();
    };
    const onDown = (e: MouseEvent) => {
      const h = e.target as Node;
      if (panelRef.current?.contains(h) || tetikRef.current?.contains(h)) return;
      kapat();
    };
    // Sayfa/tablo kaydırılınca balon tetikleyiciden kopmasın.
    const onScroll = () => konumHesapla();

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [acik, kapat, konumHesapla]);

  useEffect(() => () => iptalKapanma(), [iptalKapanma]);

  return (
    <>
      <button
        ref={tetikRef}
        type="button"
        className="info-dot"
        title={etiket}
        aria-label={etiket}
        aria-expanded={acik}
        onMouseEnter={() => {
          iptalKapanma();
          setAcik(true);
        }}
        onMouseLeave={kapanmaPlanla}
        onFocus={() => setAcik(true)}
        onBlur={kapanmaPlanla}
        onClick={(e) => {
          // Satır tıklaması (düzeltme modalı) tetiklenmesin.
          e.stopPropagation();
          if (sabit) {
            kapat();
          } else {
            setAcik(true);
            setSabit(true);
          }
        }}
      >
        !
      </button>

      {acik && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="tooltip"
              className="tip-panel z-popover"
              style={{
                top: konum?.top ?? -9999,
                left: konum?.left ?? -9999,
                visibility: konum ? "visible" : "hidden",
              }}
              onMouseEnter={iptalKapanma}
              onMouseLeave={kapanmaPlanla}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
