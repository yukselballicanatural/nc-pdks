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

  // Dönem seçimi sayfalar arasında korunur.
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === "admin");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-4">
        <div className="text-sm font-semibold text-teal-400">PDKS Pro</div>
        <div className="mt-0.5 text-xs text-slate-500">Natural Clinic</div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={`${item.href}${suffix}`}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition ${
                active
                  ? "border-l-2 border-teal-400 bg-slate-800 font-medium text-teal-300"
                  : "border-l-2 border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-4 py-3">
        <div className="text-xs text-slate-400">{username}</div>
        <div className="mb-2 text-xs text-slate-600">
          {role === "admin" ? "Yönetici" : "Takım Lideri"}
        </div>
        <button
          onClick={logout}
          className="w-full rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
