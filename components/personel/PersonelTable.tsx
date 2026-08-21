"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Notice, { Vurgu } from "@/components/ui/Notice";

export interface PersonelRow {
  key: string;
  sicil: string;
  adSoyad: string;
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
    () => [...new Set(rows.map((r) => r.unvan).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.unvan !== tl) return false;
        if (eslesme === "Sicil ile eşleşti" && r.zohoEslesme !== "employment_no") return false;
        if (eslesme === "İsim ile eşleşti" && r.zohoEslesme !== "name") return false;
        if (eslesme === "Eşleşmedi" && r.zohoEslesme !== null) return false;
        return true;
      }),
    [rows, tl, eslesme]
  );

  const columns: Column<PersonelRow>[] = [
    { key: "sicil", header: "Sicil", cell: (r) => <span className="cell-code">{r.sicil}</span>, sortValue: (r) => Number(r.sicil) || r.sicil },
    { key: "adSoyad", header: "PDKS Adı", cell: (r) => <span className="font-medium">{r.adSoyad}</span>, sortValue: (r) => r.adSoyad },
    {
      key: "zoho",
      header: "Zoho Görünen Ad",
      cell: (r) =>
        r.zohoTakmaAd ? (
          <span style={{ color: "var(--ac-cyan)" }}>{r.zohoTakmaAd}</span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.zohoTakmaAd ?? "",
    },
    {
      key: "eslesme",
      header: "Eşleşme",
      align: "center",
      cell: (r) =>
        r.zohoEslesme === "employment_no" ? (
          <span className="pill pill-ok">Sicil</span>
        ) : r.zohoEslesme === "name" ? (
          <span className="pill pill-warn">İsim</span>
        ) : (
          <span className="pill pill-mute">Yok</span>
        ),
      sortValue: (r) => (r.zohoEslesme === "employment_no" ? 0 : r.zohoEslesme === "name" ? 1 : 2),
    },
    {
      key: "unvan",
      header: "Ünvan",
      cell: (r) => (
        <span
          style={{
            color: r.unvan === "Bilinmiyor" ? "var(--cl-danger)" : "var(--tx-primary)",
          }}
        >
          {r.unvan}
        </span>
      ),
      sortValue: (r) => r.unvan,
    },
    { key: "bolum", header: "Bölüm", cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{r.bolum || "-"}</span>, sortValue: (r) => r.bolum },
    { key: "firma", header: "Firma", cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{r.firma || "-"}</span>, sortValue: (r) => r.firma },
    {
      key: "vardiya",
      header: "Vardiya",
      align: "center",
      cell: (r) => (
        <span className={`pill ${r.vardiya === "Gece" ? "pill-violet" : "pill-warn"}`}>
          {r.vardiya}
        </span>
      ),
      sortValue: (r) => r.vardiya,
    },
    {
      key: "kayit",
      header: "Geçiş Kaydı",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums" style={{ color: "var(--tx-secondary)" }}>
          {r.kayitSayisi.toLocaleString("tr-TR")}
        </span>
      ),
      sortValue: (r) => r.kayitSayisi,
    },
  ];

  return (
    <>
      <Notice ton="info" className="mb-4">
        Personel listesi <Vurgu>turnike_gecisler</Vurgu> tablosundan canlı türetilir; ünvan bilgisi
        her geçiş kaydındaki <Vurgu>alt_firma</Vurgu>{" "}
        alanından gelir. Zoho eşleşmesi önce sicil (Employment No), bulunamazsa gerçek isim
        (Original Agent Name) üzerinden yapılır.
      </Notice>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.zohoTakmaAd ?? ""} ${r.unvan} ${r.bolum}`}
        searchPlaceholder="Ad, sicil, ünvan veya bölüm ara..."
        filters={[
          { label: "Tüm Ünvanlar", options: tlList, value: tl, onChange: setTl },
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
