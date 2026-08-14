"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import RangeCalendar from "./RangeCalendar";

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
    { label: "Bu Ay",     sd: iso(monthStart),    ed: iso(today) },
    { label: "Geçen Ay",  sd: iso(prevMonthStart), ed: iso(prevMonthEnd) },
    { label: "7 Gün",     sd: iso(shift(-6)),      ed: iso(today) },
    { label: "14 Gün",    sd: iso(shift(-13)),     ed: iso(today) },
    { label: "30 Gün",    sd: iso(shift(-29)),     ed: iso(today) },
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
  const [pending, startTransition] = useTransition();

  function apply(nextSd: string, nextEd: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sd", nextSd);
    params.set("ed", nextEd);
    startTransition(() => router.push(`?${params.toString()}`));
  }

  const ps = presets(today);

  return (
    <div
      className="relative flex flex-wrap items-center gap-2.5 px-5 py-2.5"
      style={{
        background: "rgba(5,9,26,0.55)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      {/* Gezinme yükleniyor çizgisi */}
      {pending && (
        <span
          aria-hidden
          className="link-pending absolute inset-x-0 bottom-0 h-0.5"
          style={{ background: "transparent" }}
        />
      )}

      {/* Dönem etiketi */}
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--tx-muted)" }}
      >
        Dönem
      </span>

      <RangeCalendar sd={sd} ed={ed} today={today} onApply={apply} />

      {/* Ayraç */}
      <div className="mx-0.5 h-4 w-px" style={{ background: "var(--glass-border)" }} />

      {/* Segmented preset butonlar */}
      <div
        className="flex items-center gap-0.5 rounded-xl p-0.5"
        style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
        }}
      >
        {ps.map((p) => {
          const active = sd === p.sd && ed === p.ed;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => apply(p.sd, p.ed)}
              className="rounded-[9px] px-2.5 py-1 text-xs font-medium transition-all duration-150"
              style={
                active
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(56,189,248,0.22), rgba(6,214,160,0.16))",
                      border: "1px solid rgba(56,189,248,0.28)",
                      color: "#dff3ff",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset",
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

      {/* Dönem özeti */}
      <div className="ml-auto text-xs" style={{ color: "var(--tx-muted)" }}>
        {pending ? (
          <span className="flex items-center gap-1.5" style={{ color: "var(--ac-sky)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Yükleniyor…
          </span>
        ) : (
          <span className="tabular-nums">
            <span style={{ color: "var(--tx-secondary)" }}>{dayCount}</span>
            {" gün · "}
            <span style={{ color: "var(--tx-secondary)" }}>{workdayCount}</span>
            {" iş günü"}
          </span>
        )}
      </div>
    </div>
  );
}
