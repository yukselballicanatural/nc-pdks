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

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/50 px-6 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Dönem</span>
      <input
        type="date"
        value={localSd}
        max={localEd}
        onChange={(e) => setLocalSd(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 outline-none focus:border-teal-500"
      />
      <span className="text-slate-500">–</span>
      <input
        type="date"
        value={localEd}
        min={localSd}
        onChange={(e) => setLocalEd(e.target.value)}
        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 outline-none focus:border-teal-500"
      />
      <button
        onClick={() => apply(localSd, localEd)}
        className="rounded-md bg-teal-500 px-3 py-1 text-sm font-medium text-slate-950 hover:bg-teal-400"
      >
        Uygula
      </button>

      <div className="mx-1 h-5 w-px bg-slate-700" />

      {presets(today).map((p) => (
        <button
          key={p.label}
          onClick={() => {
            setLocalSd(p.sd);
            setLocalEd(p.ed);
            apply(p.sd, p.ed);
          }}
          className={`rounded-md border px-2 py-1 text-xs transition ${
            sd === p.sd && ed === p.ed
              ? "border-teal-500 bg-teal-500/10 text-teal-300"
              : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          {p.label}
        </button>
      ))}

      <div className="ml-auto text-xs text-slate-500">
        {dayCount} gün · <span className="text-slate-400">{workdayCount} iş günü</span> (herkes için
        aynı)
      </div>
    </div>
  );
}
