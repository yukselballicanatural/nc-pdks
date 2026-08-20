"use client";

// Açık/koyu tema anahtarı (DESIGN_SYSTEM.md §5.4).
//
// İKİ İKON DA HER ZAMAN DOM'DA: hangisinin görüneceğini CSS `display`
// belirliyor (globals.css'teki html[data-theme=...] kuralları). JS yalnızca
// <html data-theme> özniteliğini ve localStorage'ı günceller — ikon
// değiştirme işi CSS'in. Böylece tema değişimi tek bir öznitelik yazımı
// kadar ucuz oluyor, React yeniden render'ı beklemiyor.

import { useHtmlAttr } from "@/lib/ui/useHtmlAttr";

export default function ThemeToggle({ mini = false }: { mini?: boolean }) {
  // Tema <html data-theme> içinde; layout'taki bloklayan script ilk boyamadan
  // önce yazıyor. Buradan okumak tek doğruluk kaynağını korur.
  const tema = useHtmlAttr("data-theme", "dark") === "light" ? "light" : "dark";

  function degistir() {
    const yeni = tema === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", yeni);
    try {
      localStorage.setItem("pdks-tema", yeni);
    } catch {
      // Gizli sekmede localStorage yazılamayabilir — tema yine de değişir,
      // yalnızca kalıcı olmaz. Sessizce geçiyoruz.
    }
  }

  const etiket = tema === "dark" ? "Açık temaya geç" : "Koyu temaya geç";

  return (
    <button
      type="button"
      onClick={degistir}
      title={etiket}
      aria-label={etiket}
      className={mini ? "btn-icon" : "btn-ghost flex items-center justify-center gap-2"}
      style={mini ? undefined : { width: "100%", height: 32, fontSize: 12, fontWeight: 500 }}
    >
      {tema === "dark" ? (
        // Ay — koyu temadayken görünür, tıklayınca açığa geçer
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Güneş
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
      {!mini && <span>{tema === "dark" ? "Açık Tema" : "Koyu Tema"}</span>}
    </button>
  );
}
