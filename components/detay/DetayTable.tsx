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
  unvan: string;
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
  /** Kolay İK'dan gelen izin türü ("Yıllık İzin", "Hastalık İzni (Raporlu)"...). */
  izinTuru: string | null;
  /** Ücretli izin eksik saate girmez; ücretsiz girer (bkz. lib/engine/summary.ts). */
  izinUcretli: boolean | null;
  hasData: boolean;
  hafta: boolean;
}

export default function DetayTable({ rows, canEdit }: { rows: DetayRow[]; canEdit: boolean }) {
  const [tl, setTl] = useState("");
  const [tip, setTip] = useState("");
  const [edit, setEdit] = useState<DetayRow | null>(null);

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.unvan).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.unvan !== tl) return false;
        if (tip === "Kayıt Yok" && r.hasData) return false;
        if (tip === "Eksik Çalışma" && (!r.hasData || r.netFark >= 0)) return false;
        if (tip === "Düzeltilmiş" && !r.duzeltmeNeden) return false;
        if (tip === "Hafta Sonu" && !r.hafta) return false;
        if (tip === "İzinli" && !r.izinTuru) return false;
        if (tip === "Ücretli İzin" && !(r.izinTuru && r.izinUcretli)) return false;
        if (tip === "Ücretsiz İzin" && !(r.izinTuru && r.izinUcretli === false)) return false;
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
      cell: (r) => (
        <span style={{ color: r.hafta ? "var(--cl-warn)" : "var(--tx-secondary)" }}>{r.gun}</span>
      ),
      sortValue: (r) => r.gun,
    },
    {
      key: "izin",
      header: "İzin",
      cell: (r) =>
        r.izinTuru ? (
          <span
            title={
              r.izinUcretli
                ? `${r.izinTuru} — ücretli, eksik saate girmez`
                : `${r.izinTuru} — ücretsiz, eksik saat olarak sayılır`
            }
            className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={
              r.izinUcretli
                ? {
                    background: "rgba(6,214,160,0.12)",
                    border: "1px solid rgba(6,214,160,0.32)",
                    color: "#06d6a0",
                  }
                : {
                    background: "rgba(251,191,36,0.12)",
                    border: "1px solid rgba(251,191,36,0.32)",
                    color: "#fbbf24",
                  }
            }
          >
            {r.izinTuru}
          </span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.izinTuru ?? "zzz",
    },
    {
      key: "giris",
      header: "İlk Giriş",
      align: "center",
      cell: (r) => r.giris ?? <span style={{ color: "var(--tx-disabled)" }}>-</span>,
      sortValue: (r) => r.giris ?? "",
    },
    {
      key: "cikis",
      header: "Son Çıkış",
      align: "center",
      cell: (r) => r.cikis ?? <span style={{ color: "var(--tx-disabled)" }}>-</span>,
      sortValue: (r) => r.cikis ?? "",
    },
    {
      key: "net",
      header: "Turnike İçi",
      align: "right",
      cell: (r) => r.hasData ? dkp(r.net) : <span style={{ color: "var(--tx-disabled)" }}>-</span>,
      sortValue: (r) => r.net,
    },
    {
      key: "mola",
      header: "Turnike Dışı",
      align: "right",
      cell: (r) =>
        r.hasData ? (
          <span style={{ color: "var(--tx-secondary)" }}>{dkp(r.mola)}</span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.mola,
    },
    {
      key: "brut",
      header: "Toplam",
      align: "right",
      cell: (r) =>
        r.hasData ? (
          <span style={{ color: "var(--tx-secondary)" }}>{dkp(r.brut)}</span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.brut,
    },
    {
      key: "fark",
      header: "Net Fark",
      align: "right",
      cell: (r) =>
        r.hasData ? (
          <span style={{ color: r.netFark < 0 ? "var(--cl-danger)" : "var(--cl-ok)" }}>
            {dks(r.netFark)}
          </span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.netFark,
    },
    {
      key: "kayit",
      header: "Kayıt",
      align: "center",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{r.kayit ?? "-"}</span>,
      sortValue: (r) => r.kayit ?? 0,
    },
    {
      key: "cor",
      header: "Düzeltme",
      cell: (r) =>
        r.duzeltmeNeden ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "var(--cl-warn-dim)", color: "var(--cl-warn)" }}
          >
            {r.duzeltmeNeden}
          </span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.duzeltmeNeden ?? "",
    },
  ];

  return (
    <>
      <p className="mb-3 text-xs" style={{ color: "var(--tx-muted)" }}>
        💡 {canEdit ? "Satıra tıkla = o günü düzelt" : "Takım Lideri modunda düzeltme yapılamaz"} ·
        Sütun başlığına tıkla = sırala
      </p>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.tarih} ${r.izinTuru ?? ""}`}
        searchPlaceholder="Ad, soyad, sicil veya tarih ara..."
        filters={[
          { label: "Tüm Ünvanlar", options: tlList, value: tl, onChange: setTl },
          {
            label: "Tüm Kayıtlar",
            options: [
              "Kayıt Yok",
              "Eksik Çalışma",
              "Düzeltilmiş",
              "Hafta Sonu",
              "İzinli",
              "Ücretli İzin",
              "Ücretsiz İzin",
            ],
            value: tip,
            onChange: setTip,
          },
        ]}
        onRowClick={canEdit ? (r) => setEdit(r) : undefined}
        rowClass={(r) =>
          r.duzeltmeNeden
            ? "bg-amber-950/20"
            : r.izinTuru && r.izinUcretli
              ? "bg-emerald-950/10"
              : !r.hasData && !r.hafta
                ? "bg-red-950/10"
                : ""
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
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="modal-panel glass-modal relative w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[18px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(251,191,36,0.5) 50%, transparent)",
          }}
        />

        <div className="text-lg font-semibold" style={{ color: "var(--tx-primary)" }}>
          Gün Düzelt
        </div>
        <div className="mb-5 text-sm" style={{ color: "var(--tx-secondary)" }}>
          {row.adSoyad} · {row.tarih} ({row.gun})
        </div>

        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--tx-secondary)" }}>
          Neden
        </label>
        <select
          value={neden}
          onChange={(e) => setNeden(e.target.value)}
          className="input-glass mb-4 w-full px-3 py-2 text-sm"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--tx-secondary)" }}>
          Sayılacak Çalışma Süresi (mevcut: {dkp(row.net)})
        </label>
        <div className="mb-4 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={24}
            value={saat}
            onChange={(e) => setSaat(Number(e.target.value))}
            className="input-glass w-20 px-3 py-2 text-sm"
          />
          <span className="text-sm" style={{ color: "var(--tx-muted)" }}>
            saat
          </span>
          <input
            type="number"
            min={0}
            max={59}
            value={dakika}
            onChange={(e) => setDakika(Number(e.target.value))}
            className="input-glass w-20 px-3 py-2 text-sm"
          />
          <span className="text-sm" style={{ color: "var(--tx-muted)" }}>
            dakika
          </span>
        </div>

        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--tx-secondary)" }}>
          Açıklama (opsiyonel)
        </label>
        <input
          type="text"
          value={acik}
          onChange={(e) => setAcik(e.target.value)}
          className="input-glass mb-5 w-full px-3 py-2 text-sm"
        />

        {error && (
          <div
            className="mb-4 rounded-xl px-3 py-2 text-sm"
            style={{
              background: "var(--cl-danger-dim)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "var(--cl-danger)",
            }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={pending}
            className="flex-1 rounded-xl py-2 text-sm font-semibold tracking-wide transition-all duration-150 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #38bdf8, #06d6a0)",
              color: "#06091a",
              boxShadow: "0 4px 16px rgba(56,189,248,0.25)",
            }}
          >
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button
            onClick={onClose}
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
  );
}
