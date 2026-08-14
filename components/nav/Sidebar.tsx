"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📈" },
  { href: "/ozet", label: "Özet", icon: "📋" },
  { href: "/gunluk-detay", label: "Günlük Detay", icon: "📅" },
  { href: "/mola-detayi", label: "Mola Detayı", icon: "☕" },
  { href: "/pdks-alarm", label: "PDKS Alarm", icon: "🚨" },
  { href: "/buddy-punch", label: "Buddy Punch", icon: "⚠️" },
  { href: "/log", label: "Geçiş Kayıtları", icon: "📜" },
  { href: "/duzeltmeler", label: "Düzeltmeler", icon: "✏️" },
  { href: "/kapi-ayarlari", label: "Kapı Ayarları", icon: "🚪", adminOnly: true },
  { href: "/personel", label: "Personel", icon: "👥", adminOnly: true },
  { href: "/zoho-kullanicilar", label: "Zoho Kullanıcılar", icon: "🌐", adminOnly: true },
  { href: "/senkronizasyon", label: "Senkronizasyon", icon: "🔄", adminOnly: true },
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
      className="flex w-56 shrink-0 flex-col relative"
      style={{
        background: "rgba(6,12,24,0.75)",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Üst parıltı */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-px"
        style={{
          background:
            "linear-gradient(180deg, rgba(56,189,248,0.3) 0%, transparent 30%, transparent 70%, rgba(6,214,160,0.2) 100%)",
        }}
      />

      {/* Logo bölgesi */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs"
            style={{
              background:
                "linear-gradient(135deg, rgba(56,189,248,0.25), rgba(6,214,160,0.2))",
              border: "1px solid rgba(56,189,248,0.3)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2L3 7v10l9 5 9-5V7L12 2z"
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--ac-sky)" }}
            >
              PDKS Pro
            </div>
            <div className="text-[10px]" style={{ color: "var(--tx-muted)" }}>
              Natural Clinic
            </div>
          </div>
        </div>
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={`${item.href}${suffix}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 mb-0.5"
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(6,214,160,0.1))",
                      border: "1px solid rgba(56,189,248,0.22)",
                      color: "#e0f6ff",
                      fontWeight: 500,
                    }
                  : {
                      background: "transparent",
                      border: "1px solid transparent",
                      color: "var(--tx-secondary)",
                    }
              }
            >
              <span
                aria-hidden
                className="text-base leading-none"
                style={{ opacity: active ? 1 : 0.7 }}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {active && (
                <span
                  className="ml-auto h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: "var(--ac-sky)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Kullanıcı bölgesi */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              background: "rgba(56,189,248,0.15)",
              color: "var(--ac-sky)",
              border: "1px solid rgba(56,189,248,0.2)",
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
            <div className="text-[10px]" style={{ color: "var(--tx-muted)" }}>
              {role === "admin" ? "Yönetici" : "Takım Lideri"}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full rounded-lg py-1.5 text-xs transition-all duration-150"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--tx-secondary)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(248,113,113,0.1)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(248,113,113,0.25)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--cl-danger)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(255,255,255,0.08)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--tx-secondary)";
          }}
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
