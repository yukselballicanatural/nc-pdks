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
    {
      key: "adSoyad",
      header: "Kişi",
      cell: (r) => <span className="font-medium">{r.adSoyad}</span>,
      sortValue: (r) => r.adSoyad,
    },
    {
      key: "tarih",
      header: "Tarih",
      cell: (r) => r.tarih,
      sortValue: (r) => r.tarih.split(".").reverse().join("-"),
    },
    {
      key: "tl",
      header: "Takım Lideri",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{r.takimLideri}</span>,
      sortValue: (r) => r.takimLideri,
    },
    {
      key: "net",
      header: "Turnike İçi",
      align: "right",
      cell: (r) => dkp(r.net),
      sortValue: (r) => r.net,
    },
    {
      key: "mola",
      header: "Turnike Dışı",
      align: "right",
      cell: (r) => (
        <span
          className={r.mola > 120 ? "font-semibold" : ""}
          style={{ color: r.mola > 120 ? "var(--cl-warn)" : "var(--tx-secondary)" }}
        >
          {dkp(r.mola)}
        </span>
      ),
      sortValue: (r) => r.mola,
    },
    {
      key: "toplam",
      header: "Toplam",
      align: "right",
      cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{dkp(r.toplam)}</span>,
      sortValue: (r) => r.toplam,
    },
    {
      key: "diger",
      header: "Diğer Okuyucu Süresi",
      align: "right",
      cell: (r) =>
        r.digerDakika > 0 ? (
          <span style={{ color: "var(--tx-secondary)" }}>{dkp(r.digerDakika)}</span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.digerDakika,
    },
    {
      key: "ozet",
      header: "Dışarıda Kalınan Aralıklar",
      cell: (r) => (
        <span className="text-xs" style={{ color: "var(--tx-secondary)" }}>
          {r.molaAraliklari.slice(0, 3).join(" · ") || "-"}
          {r.molaAraliklari.length > 3 && (
            <span style={{ color: "var(--tx-muted)" }}>
              {" "}+{r.molaAraliklari.length - 3} aralık
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <p className="mb-3 text-xs" style={{ color: "var(--tx-muted)" }}>
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

      {/* Modal */}
      {detay && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setDetay(null)}
        >
          <div
            className="modal-panel glass-modal relative max-h-[85vh] w-full max-w-xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[18px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(6,214,160,0.5) 50%, transparent)",
              }}
            />

            <div className="text-lg font-semibold" style={{ color: "var(--tx-primary)" }}>
              {detay.adSoyad}
            </div>
            <div className="mb-5 text-sm" style={{ color: "var(--tx-secondary)" }}>
              {detay.tarih} · {detay.vardiya} · Turnike içi {dkp(detay.net)} / dışı {dkp(detay.mola)}
            </div>

            {/* Çalışma aralıkları */}
            <div className="mb-2 text-sm font-semibold" style={{ color: "var(--cl-ok)" }}>
              Turnike İçi Çalışma Aralıkları ({detay.calismaAraliklari.length})
            </div>
            <ul className="mb-5 space-y-1 text-sm">
              {detay.calismaAraliklari.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg px-3 py-1.5 tabular-nums"
                  style={{
                    background: "rgba(52,211,153,0.06)",
                    border: "1px solid rgba(52,211,153,0.12)",
                    color: "var(--tx-primary)",
                  }}
                >
                  {a}
                </li>
              ))}
              {detay.calismaAraliklari.length === 0 && (
                <li style={{ color: "var(--tx-disabled)" }}>Yok</li>
              )}
            </ul>

            {/* Mola aralıkları */}
            <div className="mb-2 text-sm font-semibold" style={{ color: "var(--cl-warn)" }}>
              Turnike Dışında Kalınan Aralıklar ({detay.molaAraliklari.length})
            </div>
            <ul className="mb-5 space-y-1 text-sm">
              {detay.molaAraliklari.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg px-3 py-1.5 tabular-nums"
                  style={{
                    background: "rgba(251,191,36,0.06)",
                    border: "1px solid rgba(251,191,36,0.12)",
                    color: "var(--tx-primary)",
                  }}
                >
                  {a}
                </li>
              ))}
              {detay.molaAraliklari.length === 0 && (
                <li style={{ color: "var(--tx-disabled)" }}>Yok</li>
              )}
            </ul>

            {/* Diğer okuyucular */}
            {detay.digerOkuyucular.length > 0 && (
              <>
                <div className="mb-2 text-sm font-semibold" style={{ color: "var(--tx-primary)" }}>
                  Turnike Dışı Okutulan Okuyucular
                </div>
                <div className="mb-5 flex flex-wrap gap-1.5">
                  {detay.digerOkuyucular.map((o) => (
                    <span
                      key={o}
                      className="rounded-lg px-2 py-0.5 text-xs"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "var(--tx-secondary)",
                      }}
                    >
                      {o}
                    </span>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={() => setDetay(null)}
              className="w-full rounded-xl py-2 text-sm transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--tx-secondary)",
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
