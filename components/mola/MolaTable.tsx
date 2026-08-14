"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { dkp } from "@/lib/format";

export interface MolaRow {
  key: string;
  sicil: string;
  adSoyad: string;
  takimLideri: string;
  tarih: string;
  vardiya: string;
  net: number;
  mola: number;
  toplam: number;
  calismaAraliklari: string[];
  molaAraliklari: string[];
  digerOkuyucular: string[];
  digerDakika: number;
}

export default function MolaTable({ rows }: { rows: MolaRow[] }) {
  const [tl, setTl] = useState("");
  const [esik, setEsik] = useState("");
  const [detay, setDetay] = useState<MolaRow | null>(null);

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.takimLideri).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.takimLideri !== tl) return false;
        if (esik === "2 saatten fazla" && r.mola <= 120) return false;
        if (esik === "3 saatten fazla" && r.mola <= 180) return false;
        return true;
      }),
    [rows, tl, esik]
  );

  const columns: Column<MolaRow>[] = [
    { key: "adSoyad", header: "Kişi", cell: (r) => <span className="font-medium">{r.adSoyad}</span>, sortValue: (r) => r.adSoyad },
    { key: "tarih", header: "Tarih", cell: (r) => r.tarih, sortValue: (r) => r.tarih.split(".").reverse().join("-") },
    { key: "tl", header: "Takım Lideri", cell: (r) => <span className="text-slate-500">{r.takimLideri}</span>, sortValue: (r) => r.takimLideri },
    { key: "net", header: "Turnike İçi", align: "right", cell: (r) => dkp(r.net), sortValue: (r) => r.net },
    {
      key: "mola",
      header: "Turnike Dışı",
      align: "right",
      cell: (r) => <span className={r.mola > 120 ? "font-medium text-amber-300" : "text-slate-400"}>{dkp(r.mola)}</span>,
      sortValue: (r) => r.mola,
    },
    { key: "toplam", header: "Toplam", align: "right", cell: (r) => <span className="text-slate-400">{dkp(r.toplam)}</span>, sortValue: (r) => r.toplam },
    {
      key: "diger",
      header: "Diğer Okuyucu Süresi",
      align: "right",
      cell: (r) => (r.digerDakika > 0 ? <span className="text-slate-400">{dkp(r.digerDakika)}</span> : <span className="text-slate-600">-</span>),
      sortValue: (r) => r.digerDakika,
    },
    {
      key: "ozet",
      header: "Dışarıda Kalınan Aralıklar",
      cell: (r) => (
        <span className="text-xs text-slate-400">
          {r.molaAraliklari.slice(0, 3).join(" · ") || "-"}
          {r.molaAraliklari.length > 3 && (
            <span className="text-slate-600"> +{r.molaAraliklari.length - 3} aralık</span>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <p className="mb-3 text-xs text-slate-500">
        ☕ Turnike dışı geçen süre = brüt - net. Satıra tıkla = o günün tüm çalışma/mola aralıkları.
        2 saati aşan molalar sarı gösterilir.
      </p>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.tarih}`}
        searchPlaceholder="Ad, soyad, sicil veya tarih ara..."
        filters={[
          { label: "Tüm Takım Liderleri", options: tlList, value: tl, onChange: setTl },
          { label: "Tüm Molalar", options: ["2 saatten fazla", "3 saatten fazla"], value: esik, onChange: setEsik },
        ]}
        onRowClick={(r) => setDetay(r)}
        rowClass={(r) => (r.mola > 120 ? "bg-amber-950/15" : "")}
        pageSize={200}
      />

      {detay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetay(null)}>
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold">{detay.adSoyad}</div>
            <div className="mb-4 text-sm text-slate-400">
              {detay.tarih} · {detay.vardiya} · Turnike içi {dkp(detay.net)} / dışı {dkp(detay.mola)}
            </div>

            <div className="mb-2 text-sm font-medium text-emerald-300">
              Turnike İçi Çalışma Aralıkları ({detay.calismaAraliklari.length})
            </div>
            <ul className="mb-4 space-y-1 text-sm">
              {detay.calismaAraliklari.map((a, i) => (
                <li key={i} className="rounded bg-emerald-500/5 px-2 py-1 tabular-nums">
                  {a}
                </li>
              ))}
              {detay.calismaAraliklari.length === 0 && <li className="text-slate-600">Yok</li>}
            </ul>

            <div className="mb-2 text-sm font-medium text-amber-300">
              Turnike Dışında Kalınan Aralıklar ({detay.molaAraliklari.length})
            </div>
            <ul className="mb-4 space-y-1 text-sm">
              {detay.molaAraliklari.map((a, i) => (
                <li key={i} className="rounded bg-amber-500/5 px-2 py-1 tabular-nums">
                  {a}
                </li>
              ))}
              {detay.molaAraliklari.length === 0 && <li className="text-slate-600">Yok</li>}
            </ul>

            {detay.digerOkuyucular.length > 0 && (
              <>
                <div className="mb-2 text-sm font-medium text-slate-300">
                  Turnike Dışı Okutulan Okuyucular
                </div>
                <div className="mb-4 flex flex-wrap gap-1">
                  {detay.digerOkuyucular.map((o) => (
                    <span key={o} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                      {o}
                    </span>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => setDetay(null)}
              className="w-full rounded-md border border-slate-700 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
