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
      {/* Dekoratif ışık blob'ları */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 800px 600px at 20% 30%, rgba(56,189,248,0.1), transparent)",
            "radial-gradient(ellipse 600px 500px at 80% 70%, rgba(6,214,160,0.08), transparent)",
            "radial-gradient(ellipse 500px 600px at 55% 100%, rgba(167,139,250,0.07), transparent)",
          ].join(", "),
        }}
      />

      {/* Giriş kartı */}
      <div className="glass-modal relative w-full max-w-sm anim-scale-in p-8">
        {/* Üst parıltı çizgisi */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[18px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(56,189,248,0.5) 40%, rgba(6,214,160,0.4) 60%, transparent)",
          }}
        />

        {/* Logo / başlık */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(6,214,160,0.15))",
              border: "1px solid rgba(56,189,248,0.3)",
              boxShadow: "0 4px 16px rgba(56,189,248,0.15)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 2L3 7v10l9 5 9-5V7L12 2z"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M12 7v10M7 9.5l5 2.5 5-2.5"
                stroke="#06d6a0"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--tx-primary)" }}
          >
            PDKS Pro
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tx-secondary)" }}>
            Natural Clinic
          </p>
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
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: "var(--cl-danger-dim)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "var(--cl-danger)",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl py-2.5 text-sm font-semibold tracking-wide transition-all duration-150 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, #38bdf8, #06d6a0)",
              color: "#06091a",
              boxShadow: loading
                ? "none"
                : "0 4px 20px rgba(56,189,248,0.3), 0 1px 0 rgba(255,255,255,0.15) inset",
            }}
          >
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </form>

        {/* Alt ince çizgi */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px rounded-b-[18px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 50%, transparent)",
          }}
        />
      </div>
    </div>
  );
}
