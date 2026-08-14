"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/** Hızlı dönem kısayolları — dönemin herkes için aynı olduğunu netleştirir. */
function presets(todayParam: string) {
  const today = new Date(todayParam + "T00:00:00Z");
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (days: number) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  };
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const prevMonthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  return [
    { label: "Bu Ay", sd: iso(monthStart), ed: iso(today) },
    { label: "Geçen Ay", sd: iso(prevMonthStart), ed: iso(prevMonthEnd) },
    { label: "Son 7 Gün", sd: iso(shift(-6)), ed: iso(today) },
    { label: "Son 14 Gün", sd: iso(shift(-13)), ed: iso(today) },
    { label: "Son 30 Gün", sd: iso(shift(-29)), ed: iso(today) },
  ];
}

export default function DateRangeBar({
  sd,
  ed,
  today,
  dayCount,
  workdayCount,
}: {
  sd: string;
  ed: string;
  today: string;
  dayCount: number;
  workdayCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSd, setLocalSd] = useState(sd);
  const [localEd, setLocalEd] = useState(ed);

  function apply(nextSd: string, nextEd: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sd", nextSd);
    params.set("ed", nextEd);
    router.push(`?${params.toString()}`);
  }

  const ps = presets(today);

  return (
    <div
      className="flex flex-wrap items-center gap-2 px-5 py-2.5"
      style={{
        background: "rgba(6,12,24,0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "var(--tx-muted)" }}
      >
        Dönem
      </span>

      {/* Tarih giriş ikilisi */}
      <div
        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
        }}
      >
        <input
          type="date"
          value={localSd}
          max={localEd}
          onChange={(e) => setLocalSd(e.target.value)}
          className="input-glass border-none bg-transparent px-0 py-0 text-sm outline-none focus:shadow-none"
          style={{ boxShadow: "none", borderRadius: 0 }}
        />
        <span style={{ color: "var(--tx-muted)" }} className="text-xs select-none">
          –
        </span>
        <input
          type="date"
          value={localEd}
          min={localSd}
          onChange={(e) => setLocalEd(e.target.value)}
          className="input-glass border-none bg-transparent px-0 py-0 text-sm outline-none focus:shadow-none"
          style={{ boxShadow: "none", borderRadius: 0 }}
        />
      </div>

      <button
        onClick={() => apply(localSd, localEd)}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide transition-all duration-150"
        style={{
          background: "linear-gradient(135deg, rgba(56,189,248,0.85), rgba(6,214,160,0.8))",
          color: "#06091a",
          boxShadow: "0 2px 8px rgba(56,189,248,0.2)",
        }}
      >
        Uygula
      </button>

      <div
        className="mx-1 h-4 w-px"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />

      {/* Segmented preset butonları */}
      <div
        className="flex items-center gap-0.5 rounded-xl p-0.5"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {ps.map((p) => {
          const active = sd === p.sd && ed === p.ed;
          return (
            <button
              key={p.label}
              onClick={() => {
                setLocalSd(p.sd);
                setLocalEd(p.ed);
                apply(p.sd, p.ed);
              }}
              className="rounded-lg px-2.5 py-1 text-xs transition-all duration-150"
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(6,214,160,0.15))",
                      border: "1px solid rgba(56,189,248,0.3)",
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
              {p.label}
            </button>
          );
        })}
      </div>

      <div
        className="ml-auto text-xs"
        style={{ color: "var(--tx-muted)" }}
      >
        {dayCount} gün ·{" "}
        <span style={{ color: "var(--tx-secondary)" }}>
          {workdayCount} iş günü
        </span>{" "}
        (herkes için aynı)
      </div>
    </div>
  );
}
