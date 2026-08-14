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
    {
      key: "sicil",
      header: "Sicil",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{r.sicil}</span>,
      sortValue: (r) => Number(r.sicil) || r.sicil,
    },
    {
      key: "adSoyad",
      header: "Ad Soyad",
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
      key: "neden",
      header: "Neden",
      cell: (r) => (
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ background: "var(--cl-warn-dim)", color: "var(--cl-warn)" }}
        >
          {r.neden}
        </span>
      ),
      sortValue: (r) => r.neden,
    },
    {
      key: "orig",
      header: "Önceki",
      align: "right",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{dkp(r.origMin)}</span>,
      sortValue: (r) => r.origMin,
    },
    {
      key: "yeni",
      header: "Yeni",
      align: "right",
      cell: (r) => <span className="font-semibold">{dkp(r.yeniMin)}</span>,
      sortValue: (r) => r.yeniMin,
    },
    {
      key: "delta",
      header: "Değişim",
      align: "right",
      cell: (r) => {
        const d = r.yeniMin - r.origMin;
        return (
          <span style={{ color: d < 0 ? "var(--cl-danger)" : "var(--cl-ok)" }}>
            {dks(d)}
          </span>
        );
      },
      sortValue: (r) => r.yeniMin - r.origMin,
    },
    {
      key: "acik",
      header: "Açıklama",
      cell: (r) => (
        <span className="text-xs" style={{ color: "var(--tx-secondary)" }}>
          {r.acik || "-"}
        </span>
      ),
    },
    {
      key: "ts",
      header: "Kayıt Zamanı",
      cell: (r) => <span className="text-xs" style={{ color: "var(--tx-muted)" }}>{r.ts}</span>,
      sortValue: (r) => r.ts,
    },
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
                className="rounded-lg px-2 py-0.5 text-xs transition-all duration-150 disabled:opacity-50"
                style={{
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                  color: "var(--cl-danger)",
                }}
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
      {error && (
        <div
          className="mb-3 rounded-xl p-3 text-sm"
          style={{
            background: "var(--cl-danger-dim)",
            border: "1px solid rgba(248,113,113,0.25)",
            color: "var(--cl-danger)",
          }}
        >
          {error}
        </div>
      )}
      <p className="mb-3 text-xs" style={{ color: "var(--tx-muted)" }}>
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

      {/* Silme onay modalı */}
      {confirm && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setConfirm(null)}
        >
          <div
            className="modal-panel glass-modal relative w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[18px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(248,113,113,0.5) 50%, transparent)",
              }}
            />

            <div className="mb-2 text-lg font-semibold" style={{ color: "var(--tx-primary)" }}>
              Düzeltmeyi Sil
            </div>
            <p className="mb-5 text-sm" style={{ color: "var(--tx-secondary)" }}>
              <span style={{ color: "var(--tx-primary)" }}>{confirm.adSoyad}</span> · {confirm.tarih}{" "}
              tarihli düzeltme silinecek. Bu günün süresi ham turnike verisine geri döner.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => remove(confirm)}
                disabled={pending}
                className="flex-1 rounded-xl py-2 text-sm font-semibold tracking-wide transition-all duration-150 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #f87171, #ef4444)",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(248,113,113,0.25)",
                }}
              >
                {pending ? "Siliniyor…" : "Sil"}
              </button>
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 rounded-xl py-2 text-sm transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--tx-secondary)",
                }}
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
