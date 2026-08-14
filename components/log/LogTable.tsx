"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";

export interface LogRow {
  key: string;
  tarih: string;
  saat: string;
  okuyucu: string;
  alan: string;
  yon: string;
  sicil: string;
  adSoyad: string;
  takimLideri: string;
  buddy: boolean;
}

export default function LogTable({ rows, showBuddyFlag }: { rows: LogRow[]; showBuddyFlag?: boolean }) {
  const [tl, setTl] = useState("");
  const [okuyucu, setOkuyucu] = useState("");
  const [alan, setAlan] = useState("");

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.takimLideri).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );
  const okuyucuList = useMemo(
    () => [...new Set(rows.map((r) => r.okuyucu).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.takimLideri !== tl) return false;
        if (okuyucu && r.okuyucu !== okuyucu) return false;
        if (alan && r.alan !== alan) return false;
        return true;
      }),
    [rows, tl, okuyucu, alan]
  );

  const columns: Column<LogRow>[] = [
    { key: "tarih", header: "Vardiya Günü", cell: (r) => r.tarih, sortValue: (r) => r.tarih.split(".").reverse().join("-") },
    { key: "saat", header: "Saat", align: "center", cell: (r) => <span className="tabular-nums">{r.saat}</span>, sortValue: (r) => r.saat },
    { key: "sicil", header: "Sicil", cell: (r) => <span className="text-slate-500">{r.sicil}</span>, sortValue: (r) => Number(r.sicil) || r.sicil },
    { key: "adSoyad", header: "Ad Soyad", cell: (r) => <span className="font-medium">{r.adSoyad}</span>, sortValue: (r) => r.adSoyad },
    { key: "okuyucu", header: "Okuyucu", cell: (r) => r.okuyucu, sortValue: (r) => r.okuyucu },
    {
      key: "alan",
      header: "Alan",
      align: "center",
      cell: (r) => (
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${
            r.alan === "Çalışma"
              ? "bg-emerald-500/10 text-emerald-300"
              : r.alan === "Yoksayılan"
                ? "bg-slate-700/50 text-slate-500"
                : "bg-amber-500/10 text-amber-300"
          }`}
        >
          {r.alan}
        </span>
      ),
      sortValue: (r) => r.alan,
    },
    {
      key: "yon",
      header: "Yön",
      align: "center",
      cell: (r) => (
        <span className={r.yon === "Giriş" ? "text-teal-300" : r.yon === "Çıkış" ? "text-orange-300" : "text-slate-600"}>
          {r.yon}
        </span>
      ),
      sortValue: (r) => r.yon,
    },
    { key: "tl", header: "Takım Lideri", cell: (r) => <span className="text-slate-500">{r.takimLideri}</span>, sortValue: (r) => r.takimLideri },
    ...(showBuddyFlag
      ? [
          {
            key: "buddy",
            header: "Şüpheli",
            align: "center" as const,
            cell: (r: LogRow) =>
              r.buddy ? <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-300">Buddy</span> : <span className="text-slate-700">-</span>,
            sortValue: (r: LogRow) => (r.buddy ? 0 : 1),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      rows={filtered}
      columns={columns}
      rowKey={(r) => r.key}
      searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.okuyucu} ${r.tarih} ${r.saat}`}
      searchPlaceholder="Ad, soyad, sicil, okuyucu veya tarih ara..."
      filters={[
        { label: "Tüm Takım Liderleri", options: tlList, value: tl, onChange: setTl },
        { label: "Tüm Okuyucular", options: okuyucuList, value: okuyucu, onChange: setOkuyucu },
        { label: "Tüm Alanlar", options: ["Çalışma", "Mola/Dışı", "Yoksayılan"], value: alan, onChange: setAlan },
      ]}
      rowClass={(r) => (r.buddy && showBuddyFlag ? "bg-red-950/15" : "")}
      pageSize={250}
    />
  );
}
