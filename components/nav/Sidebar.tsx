"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useHtmlAttr } from "@/lib/ui/useHtmlAttr";

/**
 * Tıklanan bağlantıda gezinme sürerken görünen ince süpürme çizgisi.
 */
function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden className="link-pending absolute inset-0 rounded-xl" />;
}

/* ─── Inline SVG ikonları — tüm emoji'ler kaldırıldı ─── */
function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="17" y="4" width="4" height="17" rx="1"/>
    </svg>
  );
}
function IconOzet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6M9 16h4"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2.5"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
    </svg>
  );
}
function IconCoffee() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 8h1a4 4 0 0 1 0 8h-1"/>
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
      <path d="M6 2v3M10 2v3M14 2v3"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconDoor() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/>
      <path d="M2 20h20"/>
      <circle cx="14" cy="12" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconPerson() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
function IconSync() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
}
function IconFingerprint() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10"/>
      <path d="M5 15.5c.5-2 2.5-4 7-4s6.5 2 7 4"/>
      <path d="M8 18.5c.5-1 2-2 4-2s3.5 1 4 2"/>
      <path d="M12 22v-1"/>
    </svg>
  );
}

function IconLeave() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4.5" width="18" height="17" rx="2.5"/>
      <path d="M16 2.5v4M8 2.5v4M3 10h18"/>
      <path d="M9.5 15.5l1.8 1.8 3.4-3.6"/>
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3.5 2"/>
    </svg>
  );
}

function IconTeams() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2"/>
      <path d="M2.5 20v-1.4A4.1 4.1 0 0 1 6.6 14.5h4.8a4.1 4.1 0 0 1 4.1 4.1V20"/>
      <path d="M17 4.2a3.2 3.2 0 0 1 0 6.2M18.5 14.7A4.1 4.1 0 0 1 21.5 18.6V20"/>
    </svg>
  );
}

export type NavIconKey =
  | "dashboard" | "ozet" | "gunluk-detay" | "mola-detayi"
  | "pdks-alarm" | "buddy-punch" | "log" | "duzeltmeler"
  | "kapi-ayarlari" | "personel" | "zoho-kullanicilar" | "senkronizasyon"
  | "takimlar" | "izinler" | "zaman-takip";

function NavIcon({ name }: { name: NavIconKey }) {
  switch (name) {
    case "dashboard":        return <IconDashboard />;
    case "ozet":             return <IconOzet />;
    case "gunluk-detay":     return <IconCalendar />;
    case "mola-detayi":      return <IconCoffee />;
    case "pdks-alarm":       return <IconBell />;
    case "buddy-punch":      return <IconFingerprint />;
    case "log":              return <IconList />;
    case "duzeltmeler":      return <IconEdit />;
    case "kapi-ayarlari":    return <IconDoor />;
    case "personel":         return <IconPerson />;
    case "zoho-kullanicilar":return <IconGlobe />;
    case "senkronizasyon":   return <IconSync />;
    case "takimlar":         return <IconTeams />;
    case "izinler":          return <IconLeave />;
    case "zaman-takip":      return <IconActivity />;
    default:                 return null;
  }
}

export interface NavItem {
  href: string;
  label: string;
  icon: NavIconKey;
  adminOnly?: boolean;
}

export interface NavGroup {
  /** Bölüm başlığı — mini modda gizlenir. */
  baslik: string;
  items: NavItem[];
}

/**
 * Menü bölümlere ayrıldı: 15 düz öğe taranması zor bir listeydi, artık
 * "ne aradığıma göre nereye bakacağım" belli. Sıra bilinçli — günlük
 * kullanımda en sık açılanlar en üstte.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    baslik: "Analiz",
    items: [
      { href: "/dashboard",    label: "Dashboard",       icon: "dashboard" },
      { href: "/ozet",         label: "Özet",            icon: "ozet" },
      { href: "/gunluk-detay", label: "Günlük Detay",    icon: "gunluk-detay" },
    ],
  },
  {
    baslik: "Kayıtlar",
    items: [
      { href: "/mola-detayi",  label: "Mola Detayı",     icon: "mola-detayi" },
      { href: "/zaman-takip",  label: "Zaman Takip",     icon: "zaman-takip" },
      { href: "/log",          label: "Geçiş Kayıtları", icon: "log" },
      { href: "/izinler",      label: "İzinler",         icon: "izinler" },
    ],
  },
  {
    baslik: "Denetim",
    items: [
      { href: "/pdks-alarm",   label: "PDKS Alarm",      icon: "pdks-alarm" },
      { href: "/buddy-punch",  label: "Buddy Punch",     icon: "buddy-punch" },
      { href: "/duzeltmeler",  label: "Düzeltmeler",     icon: "duzeltmeler" },
    ],
  },
  {
    baslik: "Yönetim",
    items: [
      { href: "/takimlar",          label: "Takımlar",          icon: "takimlar" },
      { href: "/kapi-ayarlari",     label: "Kapı Ayarları",     icon: "kapi-ayarlari",     adminOnly: true },
      { href: "/personel",          label: "Personel",          icon: "personel",          adminOnly: true },
      { href: "/zoho-kullanicilar", label: "Zoho Kullanıcılar", icon: "zoho-kullanicilar", adminOnly: true },
      { href: "/senkronizasyon",    label: "Senkronizasyon",    icon: "senkronizasyon",    adminOnly: true },
    ],
  },
];

/** Genişlet/daralt oku — <html data-sidebar> yazar, gerisini CSS halleder. */
function DaraltDugmesi() {
  const mini = useHtmlAttr("data-sidebar", "full") === "mini";

  function degistir() {
    document.documentElement.setAttribute("data-sidebar", mini ? "full" : "mini");
    try {
      localStorage.setItem("pdks-sidebar", mini ? "full" : "mini");
    } catch {
      // Gizli sekmede yazılamaz — menü yine daralır, yalnızca kalıcı olmaz.
    }
  }

  return (
    <button
      type="button"
      onClick={degistir}
      title={mini ? "Menüyü genişlet" : "Menüyü daralt"}
      aria-label={mini ? "Menüyü genişlet" : "Menüyü daralt"}
      className="btn-icon shrink-0"
      style={{ width: 26, height: 26 }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        style={{
          transform: mini ? "rotate(180deg)" : "none",
          transition: "transform 0.28s var(--ease)",
        }}
      >
        <path d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

export default function Sidebar({
  role,
  username,
}: {
  role: "admin" | "tl";
  username: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cikisYapiliyor, setCikisYapiliyor] = useState(false);

  // Dönem seçimi sayfalar arasında korunmalı — aksi hâlde her menü
  // tıklamasında kullanıcı seçtiği tarih aralığını kaybederdi.
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  const gruplar = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.adminOnly || role === "admin"),
  })).filter((g) => g.items.length > 0);

  async function logout() {
    setCikisYapiliyor(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setCikisYapiliyor(false);
    }
  }

  return (
    <aside
      className="app-sidebar glass sticky top-0 flex h-screen shrink-0 flex-col"
      style={{
        background: "var(--sf-1)",
        borderRight: "1px solid var(--edge-soft)",
        borderTop: 0,
        borderLeft: 0,
        borderBottom: 0,
      }}
    >
      {/* ── Logo + daralt oku ── */}
      <div
        className="sb-pad flex items-center gap-2.5 px-4 py-3.5"
        style={{ borderBottom: "1px solid var(--edge-soft)" }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center"
          style={{
            borderRadius: "var(--r-btn)",
            background: "var(--ac-sky-dim)",
            border: "1px solid var(--ac-sky-edge)",
            boxShadow: "var(--sheen)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2L3 7v10l9 5 9-5V7L12 2z" stroke="var(--ac-sky)" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M12 7v10M7 9.5l5 2.5 5-2.5" stroke="var(--ac-cyan)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="sb-full-only min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight" style={{ color: "var(--tx-primary)" }}>
            PDKS Pro
          </div>
          <div className="truncate text-[10px] leading-tight" style={{ color: "var(--tx-secondary)" }}>
            Natural Clinic
          </div>
        </div>

        <span className="sb-full-only">
          <DaraltDugmesi />
        </span>
      </div>

      {/* Mini modda daralt oku kendi satırında ortalanır */}
      <div
        className="sb-mini-only justify-center px-2 py-2"
        style={{ borderBottom: "1px solid var(--edge-soft)" }}
      >
        <DaraltDugmesi />
      </div>

      {/* ── Navigasyon ── */}
      <nav className="sb-pad flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3" aria-label="Ana menü">
        {gruplar.map((grup, gi) => (
          <div key={grup.baslik} className={gi > 0 ? "mt-4" : undefined}>
            <div
              className="sb-full-only px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em]"
              style={{ color: "var(--tx-muted)" }}
            >
              {grup.baslik}
            </div>
            {/* Mini modda başlık yerine ince ayraç — gruplar yine ayrışsın */}
            {gi > 0 && (
              <div
                aria-hidden
                className="sb-mini-only mx-auto mb-2"
                style={{ width: 20, height: 1, background: "var(--edge-soft)" }}
              />
            )}

            <div className="flex flex-col gap-0.5">
              {grup.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={`${item.href}${suffix}`}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    className={`sb-nav-item sb-row ${active ? "sb-on" : ""}`}
                  >
                    <span className="shrink-0">
                      <NavIcon name={item.icon} />
                    </span>
                    <span className="sb-full-only truncate">{item.label}</span>
                    <LinkPending />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Alt blok: kullanıcı · tema · çıkış ── */}
      <div className="sb-pad px-3 py-3" style={{ borderTop: "1px solid var(--edge-soft)" }}>
        <div className="sb-row mb-2.5 flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold"
            style={{
              borderRadius: "var(--r-pill)",
              background: "var(--ac-sky-dim)",
              color: "var(--ac-sky)",
              border: "1px solid var(--ac-sky-edge)",
            }}
          >
            {username.charAt(0).toLocaleUpperCase("tr-TR")}
          </div>
          <div className="sb-full-only min-w-0">
            <div className="truncate text-xs font-semibold" style={{ color: "var(--tx-primary)" }}>
              {username}
            </div>
            <div className="truncate text-[10px]" style={{ color: "var(--tx-secondary)" }}>
              {role === "admin" ? "Yönetici" : "Takım Lideri"}
            </div>
          </div>
        </div>

        {/* Full: tam genişlik düğmeler alt alta */}
        <div className="sb-full-only flex flex-col gap-1.5">
          <ThemeToggle />
          <button
            onClick={logout}
            disabled={cikisYapiliyor}
            className="btn-danger-ghost flex w-full items-center justify-center gap-1.5 text-xs font-medium"
            style={{ height: 32 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {cikisYapiliyor ? "Çıkılıyor…" : "Çıkış Yap"}
          </button>
        </div>

        {/* Mini: yalnızca ikonlar, alt alta ortalı */}
        <div className="sb-mini-only flex-col items-center gap-1.5">
          <ThemeToggle mini />
          <button
            onClick={logout}
            disabled={cikisYapiliyor}
            title="Çıkış Yap"
            aria-label="Çıkış Yap"
            className="btn-icon"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
