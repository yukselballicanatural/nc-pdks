"use client";

import { useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Notice, { Vurgu } from "@/components/ui/Notice";
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
      cell: (r) => <span className="cell-code">{r.sicil}</span>,
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
      cell: (r) => <span className="pill pill-violet">{r.neden}</span>,
      sortValue: (r) => r.neden,
    },
    {
      key: "orig",
      header: "Önceki",
      align: "right",
      cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{dkp(r.origMin)}</span>,
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
      cell: (r) => (
        <span className="text-[11px] tabular-nums" style={{ color: "var(--tx-secondary)" }}>
          {r.ts}
        </span>
      ),
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
                title={`${r.adSoyad} · ${r.tarih} düzeltmesini sil`}
                className="btn-base btn-danger"
                style={{ height: 26, padding: "0 10px", fontSize: 11 }}
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
        <Notice ton="danger" className="mb-3">
          {error}
        </Notice>
      )}
      <p className="mb-3 text-[11px] leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
        Düzeltmeler Özet ve Günlük Detay hesaplarına <Vurgu>doğrudan yansır</Vurgu>. Bir gün için
        yeni düzeltme girilirse eskisinin üzerine yazılır.
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
        <Modal
          baslik="Düzeltmeyi Sil"
          onClose={() => setConfirm(null)}
          genislik={400}
          footer={
            <>
              <button onClick={() => setConfirm(null)} className="btn-ghost px-5" style={{ height: 34 }}>
                İptal
              </button>
              <button
                onClick={() => remove(confirm)}
                disabled={pending}
                className="btn-base btn-danger px-5"
                style={{ height: 34 }}
              >
                {pending ? "Siliniyor…" : "Sil"}
              </button>
            </>
          }
        >
          <p className="text-xs leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
            <Vurgu>{confirm.adSoyad}</Vurgu> · <Vurgu>{confirm.tarih}</Vurgu> tarihli düzeltme
            silinecek. Bu günün süresi ham turnike verisine geri döner.
          </p>
        </Modal>
      )}
    </>
  );
}
