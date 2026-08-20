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
  /**
   * Klinik/Toplantı bildirimlerinin bu güne eklenen çalışma kredisi (dakika,
   * tür bazında kırılım). Boşsa o gün için kredi uygulanmamış.
   */
  krediDetay: { etiket: string; dk: number }[];
  /** krediDetay toplamı — ikonun görünüp görünmeyeceğine hızlı bakış için. */
  krediDk: number;
  /**
   * Bu güne ait TÜM tracker bildirimleri (mola/klinik/toplantı/yemek),
   * kronolojik sırayla — "Gün Bilgisi" popup'ının saat bazlı zaman
   * çizelgesi için. krediDetay'in aksine saat/konum bilgisini korur.
   */
  gunOlaylari: { etiket: string; bas: string; bit: string | null; dk: number | null; konum: string | null }[];
}

export default function DetayTable({
  rows,
  canEdit,
  izinVerisiVar,
}: {
  rows: DetayRow[];
  canEdit: boolean;
  /**
   * Kolay İK izin verisi gerçekten yüklendi mi? false ise "İzin" kolonu boş
   * kalır ve izinli günler "hiç gelmemiş" gibi görünür — bu yüzden sessiz
   * kalmıyoruz, üstte uyarı gösteriyoruz.
   */
  izinVerisiVar: boolean;
}) {
  const [tl, setTl] = useState("");
  const [tip, setTip] = useState("");
  const [edit, setEdit] = useState<DetayRow | null>(null);
  const [gunBilgiRow, setGunBilgiRow] = useState<DetayRow | null>(null);

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
      cell: (r) =>
        r.hasData ? (
          <span className="inline-flex items-center justify-end gap-1.5">
            {dkp(r.net)}
            {r.krediDk > 0 && (
              <span
                title={`${dkp(r.krediDk)} klinik/toplantı bildirimiyle çalışmaya eklendi — ayrıntı "Düzeltme" sütunundaki bilgi ikonunda`}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none"
                style={{
                  background: "rgba(56,189,248,0.16)",
                  border: "1px solid rgba(56,189,248,0.45)",
                  color: "#38bdf8",
                }}
              >
                !
              </span>
            )}
          </span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
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
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.duzeltmeNeden ? (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: "var(--cl-warn-dim)", color: "var(--cl-warn)" }}
            >
              {r.duzeltmeNeden}
            </span>
          ) : (
            <span style={{ color: "var(--tx-disabled)" }}>-</span>
          )}
          <button
            type="button"
            title="Gün bilgisi: saat bazlı zaman çizelgesi ve/veya devamsızlık sebebi"
            onClick={(e) => {
              e.stopPropagation();
              setGunBilgiRow(r);
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none"
            style={{
              background: "rgba(56,189,248,0.16)",
              border: "1px solid rgba(56,189,248,0.45)",
              color: "#38bdf8",
            }}
          >
            !
          </button>
        </span>
      ),
      sortValue: (r) => r.duzeltmeNeden ?? "",
    },
  ];

  return (
    <>
      {!izinVerisiVar && (
        <div
          className="mb-3 rounded-xl p-3 text-xs leading-relaxed"
          style={{
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.28)",
            color: "var(--tx-secondary)",
          }}
        >
          <strong style={{ color: "var(--cl-warn)" }}>İzin verisi yüklenemedi.</strong> Yıllık
          izin, rapor ve ücretsiz izin bilgisi Kolay İK&apos;dan okunamadığı için &quot;İzin&quot;
          kolonu boş; izinli kişiler bu tabloda <em>gelmemiş</em> gibi görünür ve eksik saat
          hesabı da izinleri düşmez. Sebebini İzinler sayfasında görebilirsiniz.
        </div>
      )}
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
        rowOverride={(r) =>
          !r.hasData && r.izinTuru ? (
            <div className="flex items-center justify-center gap-3 py-1">
              <span className="text-sm font-medium" style={{ color: "var(--tx-secondary)" }}>
                {r.adSoyad} · {r.tarih} ({r.gun})
              </span>
              <span
                className="rounded-full px-3 py-1 text-sm font-semibold"
                style={
                  r.izinUcretli
                    ? { background: "rgba(6,214,160,0.14)", color: "#06d6a0" }
                    : { background: "rgba(251,191,36,0.14)", color: "#fbbf24" }
                }
              >
                {r.izinTuru}
              </span>
              <button
                type="button"
                title="Gün bilgisi"
                onClick={(e) => {
                  e.stopPropagation();
                  setGunBilgiRow(r);
                }}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none"
                style={{
                  background: "rgba(56,189,248,0.16)",
                  border: "1px solid rgba(56,189,248,0.45)",
                  color: "#38bdf8",
                }}
              >
                !
              </button>
            </div>
          ) : null
        }
        rowClass={(r) =>
          r.duzeltmeNeden
            ? "row-violet"
            : r.izinTuru
              ? r.izinUcretli
                ? "row-ok"
                : "row-warn"
              : !r.hasData && !r.hafta
                ? "row-danger"
                : ""
        }
        pageSize={200}
      />
      {edit && <CorrectionModal row={edit} onClose={() => setEdit(null)} />}
      {gunBilgiRow && <GunBilgiPopup row={gunBilgiRow} onClose={() => setGunBilgiRow(null)} />}
    </>
  );
}

/** Ara türü rengi — Gün Bilgisi popup'ındaki zaman çizelgesinde tür ayırt edilsin. */
const TUR_RENK: Record<string, { bg: string; border: string; tx: string }> = {
  Klinik: { bg: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.28)", tx: "#38bdf8" },
  Toplantı: { bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.28)", tx: "#a78bfa" },
  Mola: { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.28)", tx: "var(--tx-secondary)" },
  Yemek: { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.28)", tx: "#fbbf24" },
};

/**
 * Bir günün şeffaflık popup'ı: turnike kaydı varsa saat bazlı zaman
 * çizelgesi (klinik/toplantı/mola/yemek) + klinik/toplantı kredi özeti;
 * turnike kaydı yoksa "neden gelmedi" (izinli mi, hangi tür) bilgisi.
 */
function GunBilgiPopup({ row, onClose }: { row: DetayRow; onClose: () => void }) {
  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="modal-panel glass-modal relative w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold" style={{ color: "var(--tx-primary)" }}>
          {row.adSoyad} · {row.tarih}
        </div>

        <div className="mt-3">
          {/*
            Devamsızlık bilgisi ve zaman çizelgesi birbirini DIŞLAMAZ: turnike
            kaydı olmayan bir günde de (hasData=false) kişi klinik/toplantı
            bildirimi yapmış olabilir (bkz. canlı veri doğrulaması, 2026-08-19/17)
            — biri diğerini gizlerse o bildirimler görünmez olurdu.
          */}
          {!row.hasData && (
            <div className="mb-3">
              <div className="mb-2 text-xs" style={{ color: "var(--tx-secondary)" }}>
                Bu gün turnike kaydı yok.
              </div>
              {row.izinTuru ? (
                <div
                  className="rounded-xl px-4 py-3 text-center"
                  style={{
                    background: row.izinUcretli ? "rgba(6,214,160,0.1)" : "rgba(251,191,36,0.1)",
                    border: `1px solid ${row.izinUcretli ? "rgba(6,214,160,0.32)" : "rgba(251,191,36,0.32)"}`,
                  }}
                >
                  <div
                    className="text-base font-semibold"
                    style={{ color: row.izinUcretli ? "#06d6a0" : "#fbbf24" }}
                  >
                    {row.izinTuru}
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: "var(--tx-secondary)" }}>
                    {row.izinUcretli
                      ? "Ücretli — eksik saate girmez"
                      : "Ücretsiz — eksik saat olarak sayılır"}
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 py-3 text-center text-sm"
                  style={{
                    background: "rgba(248,113,113,0.08)",
                    border: "1px solid rgba(248,113,113,0.25)",
                    color: "var(--cl-danger)",
                  }}
                >
                  Sebep bilinmiyor — kayıtsız gün
                </div>
              )}
            </div>
          )}

          {row.gunOlaylari.length > 0 ? (
            <ul className="mb-3 space-y-1.5 text-sm">
              {row.gunOlaylari.map((o, i) => {
                const renk = TUR_RENK[o.etiket] ?? TUR_RENK.Mola;
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5"
                    style={{ background: renk.bg, border: `1px solid ${renk.border}` }}
                  >
                    <span style={{ color: renk.tx }}>
                      {o.bas}
                      {o.bit ? `–${o.bit}` : " (açık)"} {o.etiket}
                    </span>
                    <span className="flex items-center gap-2 tabular-nums" style={{ color: "var(--tx-primary)" }}>
                      {o.dk != null ? dkp(o.dk) : "—"}
                      {o.konum && (
                        <a
                          href={o.konum}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-medium underline"
                          style={{ color: renk.tx }}
                        >
                          konum
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            row.hasData && (
              <div className="mb-3 text-xs" style={{ color: "var(--tx-muted)" }}>
                Bu gün için klinik/toplantı/mola/yemek bildirimi yok.
              </div>
            )
          )}

          {row.krediDk > 0 && (
            <div
              className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm font-semibold"
              style={{ background: "rgba(56,189,248,0.14)", color: "#38bdf8" }}
            >
              <span>Çalışmaya eklenen (Klinik+Toplantı)</span>
              <span className="tabular-nums">{dkp(row.krediDk)}</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2 text-sm transition-all duration-150"
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
