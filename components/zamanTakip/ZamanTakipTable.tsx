"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { araTuruPill } from "@/components/ui/AraTuru";
import { dkp } from "@/lib/format";
import type { TrackerLogRow } from "@/lib/data/loadTrackerLog";

const YOL_ADI: Record<string, string> = {
  zuid: "Zoho kimliği",
  zoho_id: "Zoho ID",
  eposta: "E-posta",
  isim: "İsim",
};

export default function ZamanTakipTable({ rows }: { rows: TrackerLogRow[] }) {
  const [tl, setTl] = useState("");
  const [tur, setTur] = useState("");
  const [durum, setDurum] = useState("");

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.unvan).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );
  const turList = useMemo(
    () => [...new Set(rows.map((r) => r.tur))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.unvan !== tl) return false;
        if (tur && r.tur !== tur) return false;
        if (durum === "Açık" && !r.acik) return false;
        if (durum === "Kapandı" && r.acik) return false;
        if (durum === "Eşleşmedi" && r.eslesme !== null) return false;
        return true;
      }),
    [rows, tl, tur, durum]
  );

  const columns: Column<TrackerLogRow>[] = [
    {
      key: "adSoyad",
      header: "Kişi",
      cell: (r) => (
        <span className="font-medium" style={r.eslesme === null ? { color: "var(--tx-muted)" } : undefined}>
          {r.adSoyad}
          {r.eslesme === null && (
            <span className="pill pill-danger ml-1.5">eşleşmedi</span>
          )}
        </span>
      ),
      sortValue: (r) => r.adSoyad,
    },
    {
      key: "sicil",
      header: "Sicil",
      cell: (r) => <span className="cell-code">{r.sicil ?? "-"}</span>,
      sortValue: (r) => (r.sicil ? Number(r.sicil) || r.sicil : "zzz"),
    },
    {
      key: "unvan",
      header: "Ünvan",
      cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{r.unvan ?? "-"}</span>,
      sortValue: (r) => r.unvan ?? "",
    },
    { key: "tarih", header: "Tarih", cell: (r) => r.tarih, sortValue: (r) => r.tarih.split(".").reverse().join("-") },
    {
      key: "tur",
      header: "Tür",
      cell: (r) => <span className={`pill ${araTuruPill(r.tur)}`}>{r.tur}</span>,
      sortValue: (r) => r.tur,
    },
    {
      key: "baslangic",
      header: "Başlangıç",
      align: "center",
      cell: (r) => <span className="tabular-nums">{r.baslangic}</span>,
      sortValue: (r) => r.baslangic,
    },
    {
      key: "bitis",
      header: "Bitiş",
      align: "center",
      cell: (r) =>
        r.bitis ? (
          <span className="tabular-nums">{r.bitis}</span>
        ) : (
          <span style={{ color: "var(--cl-warn)" }}>Açık</span>
        ),
      sortValue: (r) => r.bitis ?? "zz",
    },
    {
      key: "sure",
      header: "Süre",
      align: "right",
      cell: (r) => (r.sureDk != null ? dkp(r.sureDk) : <span style={{ color: "var(--tx-disabled)" }}>-</span>),
      sortValue: (r) => r.sureDk ?? -1,
    },
    {
      key: "eslesme",
      header: "Nasıl Bulundu",
      cell: (r) => (
        <span className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>
          {r.eslesme ? YOL_ADI[r.eslesme] ?? r.eslesme : "-"}
        </span>
      ),
      sortValue: (r) => r.eslesme ?? "",
    },
    {
      key: "konum",
      header: "Konum",
      align: "center",
      cell: (r) =>
        r.konumLink ? (
          <a
            href={r.konumLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="pill pill-sky"
            style={{ textDecoration: "none" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Konuma Git
          </a>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => (r.konumLink ? 0 : 1),
    },
  ];

  return (
    <>
      <p className="mb-3 text-[11px] leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
        Uygulamadan bildirilen mesai (check-in/check-out) ve mola/klinik/toplantı/yemek
        oturumları — başlangıç, bitiş ve süresiyle. &quot;Eşleşmedi&quot; etiketi olan kayıtlar
        henüz hiçbir sicile bağlanamadı; sistemi kullanan kişinin Zoho kaydı ya da satış
        kapsamı dışında olması muhtemel.
      </p>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil ?? ""} ${r.adSoyad} ${r.tarih} ${r.tur}`}
        searchPlaceholder="Ad, soyad, sicil, tarih veya tür ara..."
        filters={[
          { label: "Tüm Ünvanlar", options: tlList, value: tl, onChange: setTl },
          { label: "Tüm Türler", options: turList, value: tur, onChange: setTur },
          { label: "Tüm Durumlar", options: ["Açık", "Kapandı", "Eşleşmedi"], value: durum, onChange: setDurum },
        ]}
        rowClass={(r) => (r.acik ? "row-warn" : r.eslesme === null ? "row-danger" : "")}
        pageSize={250}
      />
    </>
  );
}
