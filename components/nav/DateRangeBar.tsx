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
    { label: "Bu Ay",    sd: iso(monthStart),     ed: iso(today) },
    { label: "Geçen Ay", sd: iso(prevMonthStart), ed: iso(prevMonthEnd) },
    { label: "7 Gün",    sd: iso(shift(-6)),      ed: iso(today) },
    { label: "14 Gün",   sd: iso(shift(-13)),     ed: iso(today) },
    { label: "30 Gün",   sd: iso(shift(-29)),     ed: iso(today) },
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
      className="nc-toolbar relative px-6 py-2.5"
      style={{
        background: "var(--sf-2)",
        borderBottom: "1px solid var(--edge-soft)",
      }}
    >
      {/* Gezinme yükleniyor çizgisi */}
      {pending && (
        <span aria-hidden className="link-pending absolute inset-x-0 bottom-0 h-0.5" />
      )}

      <span
        className="text-[9.5px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "var(--tx-muted)" }}
      >
        Dönem
      </span>

      <RangeCalendar sd={sd} ed={ed} today={today} onApply={apply} />

      <div className="mx-0.5 h-4 w-px" style={{ background: "var(--edge-soft)" }} />

      {/* Hızlı seçim — segment kontrol (§5.6) */}
      <div className="seg" role="group" aria-label="Hazır dönemler">
        {ps.map((p) => {
          const active = sd === p.sd && ed === p.ed;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => apply(p.sd, p.ed)}
              aria-pressed={active}
              className={`seg-item ${active ? "seg-on" : ""}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Dönem özeti */}
      <div className="ml-auto text-[11px]" style={{ color: "var(--tx-secondary)" }}>
        {pending ? (
          <span className="flex items-center gap-1.5" style={{ color: "var(--ac-sky)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Yükleniyor…
          </span>
        ) : (
          <span className="tabular-nums">
            <strong style={{ color: "var(--tx-primary)", fontWeight: 600 }}>{dayCount}</strong>
            {" gün · "}
            <strong style={{ color: "var(--tx-primary)", fontWeight: 600 }}>{workdayCount}</strong>
            {" iş günü"}
          </span>
        )}
      </div>
    </div>
  );
}
