"use client";

import { useMemo, useState } from "react";

export interface OzetRow {
  sicil: string;
  ad: string;
  soyad: string;
  takimLideri: string;
  cg: number;
  net: number;
  bek: number;
  eksik: number;
  mola: number;
}

function dkp(min: number): string {
  const abs = Math.abs(min);
  return `${Math.floor(abs / 60)}:${String(Math.floor(abs % 60)).padStart(2, "0")}`;
}

function norm(s: string): string {
  return s
    .toLocaleUpperCase("tr-TR")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

export default function OzetTable({ rows }: { rows: OzetRow[] }) {
  const [search, setSearch] = useState("");
  const [tl, setTl] = useState("");

  const tlList = useMemo(() => {
    const set = new Set(rows.map((r) => r.takimLideri).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "tr"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    return rows.filter((r) => {
      if (tl && r.takimLideri !== tl) return false;
      if (!q) return true;
      const hay = norm(`${r.sicil} ${r.ad} ${r.soyad}`);
      return hay.includes(q);
    });
  }, [rows, search, tl]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Ad, soyad veya sicil ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
        />
        <select
          value={tl}
          onChange={(e) => setTl(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
        >
          <option value="">Tüm Takım Liderleri</option>
          {tlList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {(search || tl) && (
          <button
            onClick={() => {
              setSearch("");
              setTl("");
            }}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            Filtreleri Temizle
          </button>
        )}
        <span className="text-sm text-slate-500">
          {filtered.length} / {rows.length} kişi
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Sicil</th>
              <th className="px-3 py-2 text-left">Ad Soyad</th>
              <th className="px-3 py-2 text-left">Takım Lideri</th>
              <th className="px-3 py-2 text-right">Gün</th>
              <th className="px-3 py-2 text-right">Net</th>
              <th className="px-3 py-2 text-right">Beklenen</th>
              <th className="px-3 py-2 text-right">Eksik</th>
              <th className="px-3 py-2 text-right">Mola</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.sicil} className="border-t border-slate-800 hover:bg-slate-900/60">
                <td className="px-3 py-2 text-slate-400">{r.sicil}</td>
                <td className="px-3 py-2">
                  {r.ad} {r.soyad}
                </td>
                <td className="px-3 py-2 text-slate-400">{r.takimLideri}</td>
                <td className="px-3 py-2 text-right">{r.cg}</td>
                <td className="px-3 py-2 text-right">{dkp(r.net)}</td>
                <td className="px-3 py-2 text-right text-slate-400">{dkp(r.bek)}</td>
                <td className={`px-3 py-2 text-right ${r.eksik > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {dkp(r.eksik)}
                </td>
                <td className="px-3 py-2 text-right text-slate-400">{dkp(r.mola)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  Sonuç bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
