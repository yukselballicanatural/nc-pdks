"use client";

import { useMemo, useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { dkp, dks } from "@/lib/format";
import { REASONS } from "@/lib/engine/constants";
import { saveCorrectionAction } from "@/app/actions/corrections";

export interface DetayRow {
  key: string;
  sicil: string;
  adSoyad: string;
  takimLideri: string;
  tarih: string; // dd.MM.yyyy
  gun: string;
  giris: string | null;
  cikis: string | null;
  vardiya: "Gece" | "Gündüz";
  net: number;
  mola: number;
  brut: number;
  netFark: number;
  kayit: number | null;
  duzeltmeNeden: string | null;
  hasData: boolean;
  hafta: boolean;
}

export default function DetayTable({ rows, canEdit }: { rows: DetayRow[]; canEdit: boolean }) {
  const [tl, setTl] = useState("");
  const [tip, setTip] = useState("");
  const [edit, setEdit] = useState<DetayRow | null>(null);

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.takimLideri).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.takimLideri !== tl) return false;
        if (tip === "Kayıt Yok" && r.hasData) return false;
        if (tip === "Eksik Çalışma" && (!r.hasData || r.netFark >= 0)) return false;
        if (tip === "Düzeltilmiş" && !r.duzeltmeNeden) return false;
        if (tip === "Hafta Sonu" && !r.hafta) return false;
        return true;
      }),
    [rows, tl, tip]
  );

  const columns: Column<DetayRow>[] = [
    { key: "adSoyad", header: "Kişi", cell: (r) => <span className="font-medium">{r.adSoyad}</span>, sortValue: (r) => r.adSoyad },
    { key: "tarih", header: "Tarih", cell: (r) => r.tarih, sortValue: (r) => r.tarih.split(".").reverse().join("-") },
    {
      key: "gun",
      header: "Gün",
      align: "center",
      cell: (r) => <span className={r.hafta ? "text-amber-300" : "text-slate-400"}>{r.gun}</span>,
      sortValue: (r) => r.gun,
    },
    { key: "giris", header: "İlk Giriş", align: "center", cell: (r) => r.giris ?? <span className="text-slate-600">-</span>, sortValue: (r) => r.giris ?? "" },
    { key: "cikis", header: "Son Çıkış", align: "center", cell: (r) => r.cikis ?? <span className="text-slate-600">-</span>, sortValue: (r) => r.cikis ?? "" },
    {
      key: "net",
      header: "Turnike İçi",
      align: "right",
      cell: (r) => (r.hasData ? dkp(r.net) : <span className="text-slate-600">-</span>),
      sortValue: (r) => r.net,
    },
    {
      key: "mola",
      header: "Turnike Dışı",
      align: "right",
      cell: (r) => (r.hasData ? <span className="text-slate-400">{dkp(r.mola)}</span> : <span className="text-slate-600">-</span>),
      sortValue: (r) => r.mola,
    },
    {
      key: "brut",
      header: "Toplam",
      align: "right",
      cell: (r) => (r.hasData ? <span className="text-slate-400">{dkp(r.brut)}</span> : <span className="text-slate-600">-</span>),
      sortValue: (r) => r.brut,
    },
    {
      key: "fark",
      header: "Net Fark",
      align: "right",
      cell: (r) =>
        r.hasData ? (
          <span className={r.netFark < 0 ? "text-red-400" : "text-emerald-400"}>{dks(r.netFark)}</span>
        ) : (
          <span className="text-slate-600">-</span>
        ),
      sortValue: (r) => r.netFark,
    },
    {
      key: "kayit",
      header: "Kayıt",
      align: "center",
      cell: (r) => <span className="text-slate-500">{r.kayit ?? "-"}</span>,
      sortValue: (r) => r.kayit ?? 0,
    },
    {
      key: "cor",
      header: "Düzeltme",
      cell: (r) =>
        r.duzeltmeNeden ? (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">{r.duzeltmeNeden}</span>
        ) : (
          <span className="text-slate-700">-</span>
        ),
      sortValue: (r) => r.duzeltmeNeden ?? "",
    },
  ];

  return (
    <>
      <p className="mb-3 text-xs text-slate-500">
        💡 {canEdit ? "Satıra tıkla = o günü düzelt" : "Takım Lideri modunda düzeltme yapılamaz"} ·
        Sütun başlığına tıkla = sırala
      </p>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.tarih}`}
        searchPlaceholder="Ad, soyad, sicil veya tarih ara..."
        filters={[
          { label: "Tüm Takım Liderleri", options: tlList, value: tl, onChange: setTl },
          {
            label: "Tüm Kayıtlar",
            options: ["Kayıt Yok", "Eksik Çalışma", "Düzeltilmiş", "Hafta Sonu"],
            value: tip,
            onChange: setTip,
          },
        ]}
        onRowClick={canEdit ? (r) => setEdit(r) : undefined}
        rowClass={(r) =>
          r.duzeltmeNeden ? "bg-amber-950/20" : !r.hasData && !r.hafta ? "bg-red-950/10" : ""
        }
        pageSize={200}
      />
      {edit && <CorrectionModal row={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function CorrectionModal({ row, onClose }: { row: DetayRow; onClose: () => void }) {
  const [neden, setNeden] = useState(row.duzeltmeNeden ?? REASONS[0]);
  const [saat, setSaat] = useState(Math.floor(row.net / 60));
  const [dakika, setDakika] = useState(Math.round(row.net % 60));
  const [acik, setAcik] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveCorrectionAction({
        sicil: row.sicil,
        tarih: row.tarih,
        adSoyad: row.adSoyad,
        neden,
        origMin: row.net,
        yeniSaat: saat,
        yeniDakika: dakika,
        acik,
      });
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold">Gün Düzelt</div>
        <div className="mb-4 text-sm text-slate-400">
          {row.adSoyad} · {row.tarih} ({row.gun})
        </div>

        <label className="mb-1 block text-xs text-slate-400">Neden</label>
        <select
          value={neden}
          onChange={(e) => setNeden(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs text-slate-400">
          Sayılacak Çalışma Süresi (mevcut: {dkp(row.net)})
        </label>
        <div className="mb-3 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={24}
            value={saat}
            onChange={(e) => setSaat(Number(e.target.value))}
            className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          />
          <span className="text-sm text-slate-500">saat</span>
          <input
            type="number"
            min={0}
            max={59}
            value={dakika}
            onChange={(e) => setDakika(Number(e.target.value))}
            className="w-20 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          />
          <span className="text-sm text-slate-500">dakika</span>
        </div>

        <label className="mb-1 block text-xs text-slate-400">Açıklama (opsiyonel)</label>
        <input
          type="text"
          value={acik}
          onChange={(e) => setAcik(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
        />

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={pending}
            className="flex-1 rounded-md bg-teal-500 py-1.5 text-sm font-medium text-slate-950 hover:bg-teal-400 disabled:opacity-60"
          >
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-slate-700 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
