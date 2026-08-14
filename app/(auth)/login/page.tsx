"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Dekoratif blob ışıkları */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 900px 700px at 15% 25%, rgba(56,189,248,0.12), transparent)",
            "radial-gradient(ellipse 700px 600px at 85% 75%, rgba(6,214,160,0.09), transparent)",
            "radial-gradient(ellipse 600px 700px at 55% 105%, rgba(167,139,250,0.08), transparent)",
          ].join(", "),
        }}
      />

      {/* Izgara arka plan deseni — ince netlik hissi */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Giriş kartı */}
      <div className="glass-modal relative w-full max-w-sm anim-scale-in px-8 py-9">
        {/* Üst parıltı çizgisi */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[20px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, rgba(56,189,248,0.55) 40%, rgba(6,214,160,0.45) 60%, transparent 95%)",
          }}
        />

        {/* Logo + başlık */}
        <div className="mb-9 flex flex-col items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(56,189,248,0.22), rgba(6,214,160,0.18))",
              border: "1px solid rgba(56,189,248,0.35)",
              boxShadow:
                "0 0 0 6px rgba(56,189,248,0.06), 0 8px 24px rgba(56,189,248,0.20)",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-label="PDKS Pro logo">
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

          <div className="text-center">
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--tx-primary)" }}
            >
              PDKS Pro
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--tx-secondary)" }}>
              Natural Clinic — Personel Devam Sistemi
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--tx-secondary)" }}
            >
              Kullanıcı Adı
            </label>
            <input
              className="input-glass w-full px-3 py-2.5 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="block text-xs font-medium uppercase tracking-wider"
              style={{ color: "var(--tx-secondary)" }}
            >
              Şifre
            </label>
            <input
              type="password"
              className="input-glass w-full px-3 py-2.5 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              className="rounded-xl px-3.5 py-2.5 text-sm"
              style={{
                background: "var(--cl-danger-dim)",
                border: "1px solid rgba(248,113,113,0.28)",
                color: "var(--cl-danger)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="relative mt-2 w-full overflow-hidden rounded-xl py-3 text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-60"
            style={{
              background: loading
                ? "rgba(56,189,248,0.6)"
                : "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
              color: "#05091a",
              boxShadow: loading
                ? "none"
                : "0 6px 24px rgba(56,189,248,0.35), 0 1px 0 rgba(255,255,255,0.18) inset",
            }}
          >
            {/* Parlama efekti */}
            {!loading && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl"
                style={{
                  background:
                    "linear-gradient(105deg, rgba(255,255,255,0.22) 0%, transparent 50%)",
                }}
              />
            )}
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Giriş yapılıyor…
              </span>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>

        {/* Alt ince çizgi */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px rounded-b-[20px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 50%, transparent)",
          }}
        />
      </div>
    </div>
  );
}
