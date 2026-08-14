"use client";

import { useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { dkp, dks } from "@/lib/format";
import { deleteCorrectionAction } from "@/app/actions/corrections";

export interface DuzeltmeRow {
  key: string;
  sicil: string;
  adSoyad: string;
  tarih: string;
  neden: string;
  origMin: number;
  yeniMin: number;
  acik: string;
  ts: string;
}

export default function DuzeltmelerTable({ rows, canEdit }: { rows: DuzeltmeRow[]; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<DuzeltmeRow | null>(null);

  function remove(row: DuzeltmeRow) {
    setError(null);
    startTransition(async () => {
      const res = await deleteCorrectionAction(row.sicil, row.tarih);
      if (!res.ok) setError(res.error);
      setConfirm(null);
    });
  }

  const columns: Column<DuzeltmeRow>[] = [
    { key: "sicil", header: "Sicil", cell: (r) => <span className="text-slate-500">{r.sicil}</span>, sortValue: (r) => Number(r.sicil) || r.sicil },
    { key: "adSoyad", header: "Ad Soyad", cell: (r) => <span className="font-medium">{r.adSoyad}</span>, sortValue: (r) => r.adSoyad },
    { key: "tarih", header: "Tarih", cell: (r) => r.tarih, sortValue: (r) => r.tarih.split(".").reverse().join("-") },
    {
      key: "neden",
      header: "Neden",
      cell: (r) => <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">{r.neden}</span>,
      sortValue: (r) => r.neden,
    },
    { key: "orig", header: "Önceki", align: "right", cell: (r) => <span className="text-slate-500">{dkp(r.origMin)}</span>, sortValue: (r) => r.origMin },
    { key: "yeni", header: "Yeni", align: "right", cell: (r) => <span className="font-medium">{dkp(r.yeniMin)}</span>, sortValue: (r) => r.yeniMin },
    {
      key: "delta",
      header: "Değişim",
      align: "right",
      cell: (r) => {
        const d = r.yeniMin - r.origMin;
        return <span className={d < 0 ? "text-red-400" : "text-emerald-400"}>{dks(d)}</span>;
      },
      sortValue: (r) => r.yeniMin - r.origMin,
    },
    { key: "acik", header: "Açıklama", cell: (r) => <span className="text-xs text-slate-400">{r.acik || "-"}</span> },
    { key: "ts", header: "Kayıt Zamanı", cell: (r) => <span className="text-xs text-slate-500">{r.ts}</span>, sortValue: (r) => r.ts },
    ...(canEdit
      ? [
          {
            key: "sil",
            header: "",
            align: "center" as const,
            cell: (r: DuzeltmeRow) => (
              <button
                onClick={() => setConfirm(r)}
                disabled={pending}
                className="rounded border border-red-500/40 px-2 py-0.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                Sil
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {error && <p className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
      <p className="mb-3 text-xs text-slate-500">
        ✏️ Düzeltmeler Özet ve Günlük Detay hesaplarına doğrudan yansır. Bir gün için yeni düzeltme
        girilirse eskisinin üzerine yazılır.
        {!canEdit && " Takım Lideri modunda silme yapılamaz."}
      </p>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.tarih} ${r.neden} ${r.acik}`}
        searchPlaceholder="Ad, soyad, sicil, tarih veya neden ara..."
        emptyText="Henüz düzeltme kaydı yok. Günlük Detay sayfasından bir güne tıklayarak düzeltme ekleyebilirsiniz."
      />

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirm(null)}>
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-lg font-semibold">Düzeltmeyi Sil</div>
            <p className="mb-4 text-sm text-slate-400">
              <span className="text-slate-200">{confirm.adSoyad}</span> · {confirm.tarih} tarihli
              düzeltme silinecek. Bu günün süresi ham turnike verisine geri döner.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => remove(confirm)}
                disabled={pending}
                className="flex-1 rounded-md bg-red-500 py-1.5 text-sm font-medium text-white hover:bg-red-400 disabled:opacity-60"
              >
                {pending ? "Siliniyor..." : "Sil"}
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-md border border-slate-700 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
