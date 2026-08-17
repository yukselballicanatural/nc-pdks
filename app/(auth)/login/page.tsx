"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DotMatrixBackground from "@/components/ui/DotMatrixBackground";

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
    } finally {
      setLoading(false);
    }
  }

  // Giriş alanları: koyu zemin üzerinde ince çerçeve. Odaklanınca çerçeve
  // vurgulanır — klavyeyle gezinen kullanıcı nerede olduğunu görmeli.
  const alanStili = "w-full rounded-md px-3 py-2.5 text-sm outline-none transition-colors";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: "#000", color: "#fff" }}
    >
      <DotMatrixBackground />

      {/* Kenarları karartan geçiş — kart ortada öne çıksın. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Giriş kartı */}
      <div
        className="anim-scale-in relative z-[2] w-full max-w-[400px] rounded-xl px-8 py-9"
        style={{
          background: "#121212",
          border: "1px solid #222",
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
        }}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(56,189,248,0.20), rgba(6,214,160,0.16))",
              border: "1px solid rgba(56,189,248,0.32)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-label="PDKS Pro logo">
              <path
                d="M12 2L3 7v10l9 5 9-5V7L12 2z"
                stroke="#38bdf8"
                strokeWidth="1.6"
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

          <h1 className="text-[1.35rem] font-semibold tracking-tight">PDKS Pro</h1>
          <p className="mt-1 text-[0.85rem] leading-relaxed" style={{ color: "#888" }}>
            Natural Clinic — Personel Devam Sistemi
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="kullanici"
              className="block text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#888" }}
            >
              Kullanıcı Adı
            </label>
            <input
              id="kullanici"
              className={alanStili}
              style={{ background: "#000", border: "1px solid #333", color: "#fff" }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#333")}
              autoFocus
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sifre"
              className="block text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#888" }}
            >
              Şifre
            </label>
            <input
              id="sifre"
              type="password"
              className={alanStili}
              style={{ background: "#000", border: "1px solid #333", color: "#fff" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#333")}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md px-3.5 py-2.5 text-sm"
              style={{
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.28)",
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-md py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: "#ededed", color: "#000", border: "none" }}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
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
              </span>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-[0.75rem] leading-relaxed" style={{ color: "#666" }}>
          Yalnızca yetkili personel. Erişim sorunlarında sistem yöneticinize başvurun.
        </p>
      </div>
    </div>
  );
}
