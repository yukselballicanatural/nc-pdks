"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";

export interface PersonelRow {
  key: string;
  sicil: string;
  adSoyad: string;
  takimLideri: string;
  unvan: string;
  bolum: string;
  firma: string;
  vardiya: string;
  kayitSayisi: number;
  /** zoho_users eşleşmesi */
  zohoTakmaAd: string | null;
  zohoGercekAd: string | null;
  zohoEslesme: "employment_no" | "name" | null;
}

export default function PersonelTable({ rows }: { rows: PersonelRow[] }) {
  const [tl, setTl] = useState("");
  const [eslesme, setEslesme] = useState("");

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.takimLideri).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.takimLideri !== tl) return false;
        if (eslesme === "Sicil ile eşleşti" && r.zohoEslesme !== "employment_no") return false;
        if (eslesme === "İsim ile eşleşti" && r.zohoEslesme !== "name") return false;
        if (eslesme === "Eşleşmedi" && r.zohoEslesme !== null) return false;
        return true;
      }),
    [rows, tl, eslesme]
  );

  const columns: Column<PersonelRow>[] = [
    { key: "sicil", header: "Sicil", cell: (r) => <span className="text-slate-500">{r.sicil}</span>, sortValue: (r) => Number(r.sicil) || r.sicil },
    { key: "adSoyad", header: "PDKS Adı", cell: (r) => <span className="font-medium">{r.adSoyad}</span>, sortValue: (r) => r.adSoyad },
    {
      key: "zoho",
      header: "Zoho Görünen Ad",
      cell: (r) =>
        r.zohoTakmaAd ? (
          <span className="text-teal-300">{r.zohoTakmaAd}</span>
        ) : (
          <span className="text-slate-600">-</span>
        ),
      sortValue: (r) => r.zohoTakmaAd ?? "",
    },
    {
      key: "eslesme",
      header: "Eşleşme",
      align: "center",
      cell: (r) =>
        r.zohoEslesme === "employment_no" ? (
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-300">Sicil</span>
        ) : r.zohoEslesme === "name" ? (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-300">İsim</span>
        ) : (
          <span className="rounded bg-slate-700/40 px-1.5 py-0.5 text-xs text-slate-500">Yok</span>
        ),
      sortValue: (r) => (r.zohoEslesme === "employment_no" ? 0 : r.zohoEslesme === "name" ? 1 : 2),
    },
    {
      key: "tl",
      header: "Takım Lideri",
      cell: (r) => (
        <span className={r.takimLideri === "Bilinmiyor" ? "text-red-400" : "text-slate-300"}>{r.takimLideri}</span>
      ),
      sortValue: (r) => r.takimLideri,
    },
    { key: "unvan", header: "Ünvan", cell: (r) => <span className="text-slate-400">{r.unvan || "-"}</span>, sortValue: (r) => r.unvan },
    { key: "bolum", header: "Bölüm", cell: (r) => <span className="text-slate-400">{r.bolum || "-"}</span>, sortValue: (r) => r.bolum },
    { key: "firma", header: "Firma", cell: (r) => <span className="text-slate-500">{r.firma || "-"}</span>, sortValue: (r) => r.firma },
    {
      key: "vardiya",
      header: "Vardiya",
      align: "center",
      cell: (r) => <span className={r.vardiya === "Gece" ? "text-violet-300" : "text-amber-300"}>{r.vardiya}</span>,
      sortValue: (r) => r.vardiya,
    },
    {
      key: "kayit",
      header: "Geçiş Kaydı",
      align: "right",
      cell: (r) => <span className="text-slate-400">{r.kayitSayisi.toLocaleString("tr-TR")}</span>,
      sortValue: (r) => r.kayitSayisi,
    },
  ];

  return (
    <>
      <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
        Personel listesi <span className="text-slate-300">turnike_gecisler</span> tablosundan canlı
        türetilir; takım lideri bilgisi her geçiş kaydındaki <span className="text-slate-300">pozisyon</span>{" "}
        alanından gelir. Zoho eşleşmesi önce sicil (Employment No), bulunamazsa gerçek isim
        (Original Agent Name) üzerinden yapılır.
      </div>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.zohoTakmaAd ?? ""} ${r.takimLideri} ${r.unvan} ${r.bolum}`}
        searchPlaceholder="Ad, sicil, ünvan veya bölüm ara..."
        filters={[
          { label: "Tüm Takım Liderleri", options: tlList, value: tl, onChange: setTl },
          {
            label: "Tüm Eşleşmeler",
            options: ["Sicil ile eşleşti", "İsim ile eşleşti", "Eşleşmedi"],
            value: eslesme,
            onChange: setEslesme,
          },
        ]}
      />
    </>
  );
}
