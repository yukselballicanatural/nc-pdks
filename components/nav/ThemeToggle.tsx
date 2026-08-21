"use client";

// Açık/koyu tema anahtarı (DESIGN_SYSTEM.md §5.4).
//
// İKİ İKON DA HER ZAMAN DOM'DA; hangisinin "aktif" göründüğünü CSS belirliyor
// (globals.css'teki html[data-theme=...] kuralları). JS yalnızca <html>
// data-theme özniteliğini ve localStorage'ı yazar — ikon/topuz hareketi CSS'in
// işi. Böylece tema değişimi tek bir öznitelik yazımı kadar ucuz oluyor.

import { useHtmlAttr } from "@/lib/ui/useHtmlAttr";

function GunesIkonu() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 1.5v2.5M12 20v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M1.5 12h2.5M20 12h2.5M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </svg>
  );
}

function AyIkonu() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle({ mini = false }: { mini?: boolean }) {
  // Tema <html data-theme> içinde; layout'taki bloklayan script ilk boyamadan
  // önce yazıyor. Buradan okumak tek doğruluk kaynağını korur.
  const koyu = useHtmlAttr("data-theme", "dark") !== "light";

  function degistir() {
    const yeni = koyu ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", yeni);
    try {
      localStorage.setItem("pdks-tema", yeni);
    } catch {
      // Gizli sekmede localStorage yazılamayabilir — tema yine değişir,
      // yalnızca kalıcı olmaz. Sessizce geçiyoruz.
    }
  }

  const etiket = koyu ? "Açık temaya geç" : "Koyu temaya geç";

  // Mini menüde satır sığmaz: yalnızca ikon düğmesi.
  if (mini) {
    return (
      <button type="button" onClick={degistir} title={etiket} aria-label={etiket} className="btn-icon">
        {koyu ? <AyIkonu /> : <GunesIkonu />}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11.5px] font-medium" style={{ color: "var(--tx-secondary)" }}>
        Görünüm
      </span>
      <button
        type="button"
        onClick={degistir}
        role="switch"
        aria-checked={koyu}
        aria-label={etiket}
        title={etiket}
        className="sb-theme-switch"
      >
        <span aria-hidden className="sb-theme-knob" />
        <span aria-hidden className="sb-theme-ico sb-theme-ico-sun">
          <GunesIkonu />
        </span>
        <span aria-hidden className="sb-theme-ico sb-theme-ico-moon">
          <AyIkonu />
        </span>
      </button>
    </div>
  );
}
