"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

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
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
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

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",        label: "Dashboard",        icon: "dashboard" },
  { href: "/ozet",             label: "Özet",             icon: "ozet" },
  { href: "/gunluk-detay",     label: "Günlük Detay",     icon: "gunluk-detay" },
  { href: "/mola-detayi",      label: "Mola Detayı",      icon: "mola-detayi" },
  { href: "/zaman-takip",      label: "Zaman Takip",      icon: "zaman-takip" },
  { href: "/pdks-alarm",       label: "PDKS Alarm",       icon: "pdks-alarm" },
  { href: "/buddy-punch",      label: "Buddy Punch",      icon: "buddy-punch" },
  { href: "/log",              label: "Geçiş Kayıtları",  icon: "log" },
  { href: "/duzeltmeler",      label: "Düzeltmeler",      icon: "duzeltmeler" },
  { href: "/takimlar",         label: "Takımlar",         icon: "takimlar" },
  { href: "/izinler",          label: "İzinler",          icon: "izinler" },
  { href: "/kapi-ayarlari",    label: "Kapı Ayarları",    icon: "kapi-ayarlari",     adminOnly: true },
  { href: "/personel",         label: "Personel",         icon: "personel",          adminOnly: true },
  { href: "/zoho-kullanicilar",label: "Zoho Kullanıcılar",icon: "zoho-kullanicilar", adminOnly: true },
  { href: "/senkronizasyon",   label: "Senkronizasyon",   icon: "senkronizasyon",    adminOnly: true },
];

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

  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === "admin");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="flex w-[220px] shrink-0 flex-col relative"
      style={{
        background: "rgba(5,9,26,0.80)",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
        borderRight: "1px solid rgba(255,255,255,0.085)",
      }}
    >
      {/* Sağ kenar parıltısı — tek pikselde gradient ışık */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-px"
        style={{
          background:
            "linear-gradient(180deg, rgba(56,189,248,0.35) 0%, rgba(56,189,248,0.05) 30%, transparent 60%, rgba(6,214,160,0.20) 100%)",
        }}
      />

      {/* Logo alanı */}
      <div
        className="px-5 py-[18px]"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.065)" }}
      >
        <div className="flex items-center gap-3">
          {/* Logo ikonu */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(56,189,248,0.22), rgba(6,214,160,0.18))",
              border: "1px solid rgba(56,189,248,0.32)",
              boxShadow: "0 2px 12px rgba(56,189,248,0.20)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2L3 7v10l9 5 9-5V7L12 2z"
                stroke="#38bdf8"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M12 7v10M7 9.5l5 2.5 5-2.5"
                stroke="#06d6a0"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div
              className="text-sm font-semibold tracking-tight leading-tight"
              style={{ color: "var(--ac-sky)" }}
            >
              PDKS Pro
            </div>
            <div className="text-[10px] leading-tight mt-0.5" style={{ color: "var(--tx-muted)" }}>
              Natural Clinic
            </div>
          </div>
        </div>
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-2.5" aria-label="Ana menü">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={`${item.href}${suffix}`}
              className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] mb-0.5 group"
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(6,214,160,0.10))",
                      border: "1px solid rgba(56,189,248,0.24)",
                      color: "#dff3ff",
                      fontWeight: 500,
                    }
                  : {
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "var(--tx-secondary)",
                    }
              }
            >
              {/* Sol accent bar — aktifse görünür */}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                  style={{
                    width: 3,
                    height: 20,
                    background: "linear-gradient(180deg, var(--ac-sky), var(--ac-cyan))",
                    boxShadow: "0 0 8px rgba(56,189,248,0.5)",
                  }}
                />
              )}

              {/* İkon */}
              <span
                className="shrink-0 transition-colors duration-150"
                style={{ color: active ? "var(--ac-sky)" : "var(--tx-muted)" }}
              >
                <NavIcon name={item.icon} />
              </span>

              <span className="truncate">{item.label}</span>

              {/* Sağdaki aktif nokta */}
              {active && (
                <span
                  aria-hidden
                  className="ml-auto h-1.5 w-1.5 rounded-full shrink-0"
                  style={{
                    background: "var(--ac-sky)",
                    boxShadow: "0 0 6px var(--ac-sky-glow)",
                  }}
                />
              )}

              <LinkPending />
            </Link>
          );
        })}
      </nav>

      {/* Kullanıcı bölgesi */}
      <div
        className="px-3.5 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.065)" }}
      >
        <div className="mb-3 flex items-center gap-2.5">
          {/* Avatar */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              background: "rgba(56,189,248,0.14)",
              color: "var(--ac-sky)",
              border: "1.5px solid rgba(56,189,248,0.28)",
              boxShadow: "0 0 12px rgba(56,189,248,0.15)",
            }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div
              className="truncate text-xs font-medium"
              style={{ color: "var(--tx-primary)" }}
            >
              {username}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--tx-muted)" }}>
              {role === "admin" ? "Yönetici" : "Takım Lideri"}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn-danger-ghost w-full py-1.5 text-xs font-medium flex items-center justify-center gap-1.5"
        >
          {/* Logout icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
