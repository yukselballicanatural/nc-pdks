"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DotMatrixBackground from "@/components/ui/DotMatrixBackground";
import ThemeToggle from "@/components/nav/ThemeToggle";
import Notice from "@/components/ui/Notice";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Giriş başarısız.");
        return;
      }
      router.push("/ozet");
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Zemin gövdeden gelen mesh gradient — cam kartın kıracağı canlı renk bu.
       Eskiden burada `background: #000` vardı; düz siyah üzerinde
       backdrop-filter hiçbir şey göstermez, kart "donuk kutu" gibi durur. */
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <DotMatrixBackground />

      {/* Kenarları yumuşatan geçiş — kart ortada öne çıksın. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(circle at center, var(--sf-sunken) 0%, transparent 72%)",
        }}
      />

      {/* Tema anahtarı — giriş ekranında da erişilebilir olmalı */}
      <div className="absolute right-4 top-4 z-[3]">
        <ThemeToggle mini />
      </div>

      {/* Giriş kartı */}
      <div
        className="anim-scale-in glass-modal glass-hairline relative z-[2] w-full px-8 py-9"
        style={{ maxWidth: 400 }}
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center"
            style={{
              borderRadius: "var(--r-sm)",
              background: "var(--ac-sky-dim)",
              border: "1px solid var(--ac-sky-edge)",
              boxShadow: "var(--sheen)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="PDKS Pro logo">
              <path
                d="M12 2L3 7v10l9 5 9-5V7L12 2z"
                stroke="var(--ac-sky)"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M12 7v10M7 9.5l5 2.5 5-2.5"
                stroke="var(--ac-cyan)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="text-[22px] font-semibold" style={{ color: "var(--tx-primary)" }}>
            PDKS Pro
          </h1>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
            Natural Clinic — Personel Devam Sistemi
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label htmlFor="kullanici" className="form-label">
              Kullanıcı Adı
            </label>
            <input
              id="kullanici"
              className="input-glass w-full px-3 text-sm"
              style={{ height: 38, boxSizing: "border-box" }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="sifre" className="form-label">
              Şifre
            </label>
            <input
              id="sifre"
              type="password"
              className="input-glass w-full px-3 text-sm"
              style={{ height: 38, boxSizing: "border-box" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <Notice ton="danger">{error}</Notice>}

          <button
            type="submit"
            disabled={loading}
            className="btn-base btn-primary mt-1 w-full"
            style={{ height: 40, fontSize: 13 }}
          >
            {loading ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                  className="animate-spin"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Giriş yapılıyor…
              </>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
          Yalnızca yetkili personel. Erişim sorunlarında sistem yöneticinize başvurun.
        </p>
      </div>
    </div>
  );
}
