"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { dkp } from "@/lib/format";
import type { TrackerLogRow } from "@/lib/data/loadTrackerLog";

/** Tür bazlı renkler — Mola Detayı'yla aynı görsel dil. */
const TUR_RENK: Record<string, string> = {
  Mesai: "#38bdf8",
  Klinik: "#38bdf8",
  Toplantı: "#a78bfa",
  Mola: "#fbbf24",
  Yemek: "#34d399",
};

function turRengi(tur: string): string {
  return TUR_RENK[tur] ?? "#94a3b8";
}

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
            <span className="ml-1.5 rounded px-1 py-0.5 text-[10px]" style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
              eşleşmedi
            </span>
          )}
        </span>
      ),
      sortValue: (r) => r.adSoyad,
    },
    {
      key: "sicil",
      header: "Sicil",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{r.sicil ?? "-"}</span>,
      sortValue: (r) => (r.sicil ? Number(r.sicil) || r.sicil : "zzz"),
    },
    {
      key: "unvan",
      header: "Ünvan",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{r.unvan ?? "-"}</span>,
      sortValue: (r) => r.unvan ?? "",
    },
    { key: "tarih", header: "Tarih", cell: (r) => r.tarih, sortValue: (r) => r.tarih.split(".").reverse().join("-") },
    {
      key: "tur",
      header: "Tür",
      cell: (r) => {
        const renk = turRengi(r.tur);
        return (
          <span
            className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium"
            style={{ background: `${renk}1f`, border: `1px solid ${renk}44`, color: renk }}
          >
            {r.tur}
          </span>
        );
      },
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
        <span className="text-xs" style={{ color: "var(--tx-muted)" }}>
          {r.eslesme ? YOL_ADI[r.eslesme] ?? r.eslesme : "-"}
        </span>
      ),
      sortValue: (r) => r.eslesme ?? "",
    },
  ];

  return (
    <>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--tx-muted)" }}>
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
        rowClass={(r) => (r.acik ? "bg-amber-950/10" : r.eslesme === null ? "bg-red-950/10" : "")}
        pageSize={250}
      />
    </>
  );
}
