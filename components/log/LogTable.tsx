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
  unvan: string;
  buddy: boolean;
}

export default function LogTable({ rows, showBuddyFlag }: { rows: LogRow[]; showBuddyFlag?: boolean }) {
  const [tl, setTl] = useState("");
  const [okuyucu, setOkuyucu] = useState("");
  const [alan, setAlan] = useState("");

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.unvan).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );
  const okuyucuList = useMemo(
    () => [...new Set(rows.map((r) => r.okuyucu).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.unvan !== tl) return false;
        if (okuyucu && r.okuyucu !== okuyucu) return false;
        if (alan && r.alan !== alan) return false;
        return true;
      }),
    [rows, tl, okuyucu, alan]
  );

  const columns: Column<LogRow>[] = [
    { key: "tarih", header: "Vardiya Günü", cell: (r) => r.tarih, sortValue: (r) => r.tarih.split(".").reverse().join("-") },
    { key: "saat", header: "Saat", align: "center", cell: (r) => <span className="tabular-nums">{r.saat}</span>, sortValue: (r) => r.saat },
    { key: "sicil", header: "Sicil", cell: (r) => <span className="cell-code">{r.sicil}</span>, sortValue: (r) => Number(r.sicil) || r.sicil },
    { key: "adSoyad", header: "Ad Soyad", cell: (r) => <span className="font-medium">{r.adSoyad}</span>, sortValue: (r) => r.adSoyad },
    { key: "okuyucu", header: "Okuyucu", cell: (r) => r.okuyucu, sortValue: (r) => r.okuyucu },
    {
      key: "alan",
      header: "Alan",
      align: "center",
      cell: (r) => (
        <span
          className={`pill ${
            r.alan === "Çalışma"
              ? "pill-ok"
              : r.alan === "Yoksayılan"
                ? "pill-mute"
                : "pill-warn"
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
        <span
          style={{
            color:
              r.yon === "Giriş"
                ? "var(--cl-ok)"
                : r.yon === "Çıkış"
                  ? "var(--cl-warn)"
                  : "var(--tx-disabled)",
            fontWeight: 600,
          }}
        >
          {r.yon}
        </span>
      ),
      sortValue: (r) => r.yon,
    },
    { key: "tl", header: "Ünvan", cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{r.unvan}</span>, sortValue: (r) => r.unvan },
    ...(showBuddyFlag
      ? [
          {
            key: "buddy",
            header: "Şüpheli",
            align: "center" as const,
            cell: (r: LogRow) =>
              r.buddy ? (
                <span className="pill pill-danger">Buddy</span>
              ) : (
                <span style={{ color: "var(--tx-disabled)" }}>-</span>
              ),
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
        { label: "Tüm Ünvanlar", options: tlList, value: tl, onChange: setTl },
        { label: "Tüm Okuyucular", options: okuyucuList, value: okuyucu, onChange: setOkuyucu },
        { label: "Tüm Alanlar", options: ["Çalışma", "Mola/Dışı", "Yoksayılan"], value: alan, onChange: setAlan },
      ]}
      rowClass={(r) => (r.buddy && showBuddyFlag ? "row-danger" : "")}
      density="dense"
      pageSize={250}
    />
  );
}
