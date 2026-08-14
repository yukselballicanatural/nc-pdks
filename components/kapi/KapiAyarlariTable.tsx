"use client";

import { useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { setReaderAreaAction } from "@/app/actions/readerRules";
import type { ReaderArea } from "@/lib/engine/types";

export interface KapiRow {
  key: string;
  okuyucu: string;
  alan: ReaderArea;
  /** DB'de açık kayıt var mı (yoksa varsayılan kuraldan geliyor). */
  ozelKural: boolean;
  yon: string;
  kayitSayisi: number;
}

const ALAN_LABEL: Record<ReaderArea, string> = {
  work: "Çalışma Alanı (turnike)",
  break: "Mola / Turnike Dışı",
  ignore: "Hesaplamaya Katmama",
};

export default function KapiAyarlariTable({ rows }: { rows: KapiRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function change(row: KapiRow, value: string) {
    setError(null);
    setBusy(row.okuyucu);
    startTransition(async () => {
      const res = await setReaderAreaAction(row.okuyucu, value as ReaderArea | "default");
      if (!res.ok) setError(res.error);
      setBusy(null);
    });
  }

  const columns: Column<KapiRow>[] = [
    { key: "okuyucu", header: "Okuyucu / Kapı", cell: (r) => <span className="font-medium">{r.okuyucu}</span>, sortValue: (r) => r.okuyucu },
    {
      key: "yon",
      header: "Algılanan Yön",
      align: "center",
      cell: (r) => (
        <span className={r.yon === "Giriş" ? "text-teal-300" : r.yon === "Çıkış" ? "text-orange-300" : "text-red-400"}>
          {r.yon === "-" ? "Belirsiz" : r.yon}
        </span>
      ),
      sortValue: (r) => r.yon,
    },
    {
      key: "kayit",
      header: "Kayıt Sayısı",
      align: "right",
      cell: (r) => <span className="text-slate-400">{r.kayitSayisi.toLocaleString("tr-TR")}</span>,
      sortValue: (r) => r.kayitSayisi,
    },
    {
      key: "alan",
      header: "Alan Sınıfı",
      cell: (r) => (
        <select
          value={r.ozelKural ? r.alan : "default"}
          disabled={pending && busy === r.okuyucu}
          onChange={(e) => change(r, e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none focus:border-teal-500 disabled:opacity-50"
        >
          <option value="default">Varsayılan ({ALAN_LABEL[r.alan]})</option>
          <option value="work">{ALAN_LABEL.work}</option>
          <option value="break">{ALAN_LABEL.break}</option>
          <option value="ignore">{ALAN_LABEL.ignore}</option>
        </select>
      ),
      sortValue: (r) => r.alan,
    },
    {
      key: "durum",
      header: "Geçerli Sınıf",
      align: "center",
      cell: (r) => (
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${
            r.alan === "work"
              ? "bg-emerald-500/10 text-emerald-300"
              : r.alan === "ignore"
                ? "bg-slate-700/50 text-slate-500"
                : "bg-amber-500/10 text-amber-300"
          }`}
        >
          {r.alan === "work" ? "Çalışma" : r.alan === "ignore" ? "Yoksayılan" : "Mola/Dışı"}
          {r.ozelKural && <span className="ml-1 opacity-70">•</span>}
        </span>
      ),
      sortValue: (r) => r.alan,
    },
  ];

  return (
    <>
      {error && <p className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}
      <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
        <div className="mb-1 font-medium text-slate-300">Alan sınıfları hesaplamayı nasıl etkiler?</div>
        <ul className="space-y-0.5">
          <li>
            <span className="text-emerald-300">Çalışma Alanı</span> — giriş/çıkış çiftleri net
            çalışma süresini oluşturur. Varsayılan olarak adında &quot;Turnike&quot; geçen okuyucular.
          </li>
          <li>
            <span className="text-amber-300">Mola / Turnike Dışı</span> — net çalışmaya sayılmaz,
            Mola Detayı sayfasında ayrı gösterilir.
          </li>
          <li>
            <span className="text-slate-400">Hesaplamaya Katmama</span> — kayıt tamamen yok sayılır
            (ilk giriş / son çıkış hesabına bile girmez).
          </li>
          <li className="pt-1 text-slate-500">
            • işareti: bu okuyucu için elle özel kural tanımlanmış (varsayılandan farklı olabilir).
          </li>
        </ul>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => r.okuyucu}
        searchPlaceholder="Okuyucu ara..."
      />
    </>
  );
}
