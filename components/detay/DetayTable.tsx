"use client";

import { useMemo, useState, useTransition } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import InfoTip from "@/components/ui/InfoTip";
import Notice from "@/components/ui/Notice";
import { araTuruToken } from "@/components/ui/AraTuru";
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
  /** Düzeltmeye yazılan serbest açıklama — ipucu balonunda gösterilir. */
  duzeltmeAcik: string | null;
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
            className={`pill ${r.izinUcretli ? "pill-ok" : "pill-warn"}`}
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
                className="info-dot"
                title={`${dkp(r.krediDk)} klinik/toplantı bildirimiyle çalışmaya eklendi — ayrıntı "Düzeltme" sütunundaki bilgi ikonunda`}
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
            <span className="pill pill-violet">{r.duzeltmeNeden}</span>
          ) : (
            <span style={{ color: "var(--tx-disabled)" }}>-</span>
          )}
          {/* Ünlem yalnızca SÖYLENECEK BİR ŞEY VARSA çizilir — eskiden her
              satırda duruyordu ve çoğunda tıklayınca boş bir pencere açıyordu. */}
          {bilgiVar(r) && (
            <InfoTip etiket="Gün bilgisi">
              <GunBilgisi row={r} />
            </InfoTip>
          )}
        </span>
      ),
      sortValue: (r) => r.duzeltmeNeden ?? "",
    },
  ];

  return (
    <>
      {!izinVerisiVar && (
        <Notice ton="warn" baslik="İzin verisi yüklenemedi" className="mb-3">
          Yıllık izin, rapor ve ücretsiz izin bilgisi Kolay İK&apos;dan okunamadığı için
          &quot;İzin&quot; sütunu boş; izinli kişiler bu tabloda <em>gelmemiş</em> gibi görünür ve
          eksik saat hesabı da izinleri düşmez. Sebebini İzinler sayfasında görebilirsiniz.
        </Notice>
      )}
      <p className="mb-3 text-[11px]" style={{ color: "var(--tx-secondary)" }}>
        {canEdit ? "Satıra tıkla = o günü düzelt" : "Takım Lideri modunda düzeltme yapılamaz"} ·
        Sütun başlığına tıkla = sırala · Satır sonundaki{" "}
        <span className="info-dot" style={{ width: 14, height: 14, fontSize: 9 }}>!</span>{" "}
        üzerine gel = o günün dökümü (düzeltme açıklaması, saat bazlı hareketler, izin sebebi)
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
                className={`pill ${r.izinUcretli ? "pill-ok" : "pill-warn"}`}
                style={{ fontSize: 13, padding: "3px 12px" }}
              >
                {r.izinTuru}
              </span>
              <InfoTip etiket="Gün bilgisi">
                <GunBilgisi row={r} />
              </InfoTip>
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
    </>
  );
}

/**
 * Bir satırda gösterilecek bir şey var mı?
 *
 * Ünlem eskiden HER satırda duruyordu; çoğunda tıklandığında söyleyecek bir
 * şey olmadığı için boş bir pencere açıyordu. Artık yalnızca gerçekten bir
 * açıklama varsa çiziliyor.
 */
function bilgiVar(r: DetayRow): boolean {
  return (
    r.duzeltmeNeden !== null || // elle düzeltme (ve varsa açıklaması)
    r.gunOlaylari.length > 0 || // klinik/toplantı/mola/yemek bildirimi
    r.izinTuru !== null || // izin sebebi
    (!r.hasData && !r.hafta) // hafta içi gelmemiş — sebebi söylenmeli
  );
}

/**
 * Gün dökümü — ipucu balonunun içeriği.
 *
 * Eskiden bu bir MODAL'dı: sayfayı karartıp odak çalıyordu, oysa tablo
 * taranırken sorulan soru ("bu satırda ne var?") o kadar ağır bir hamleyi
 * hak etmiyor. Artık ünlemin yanında açılan küçük bir balon.
 *
 * İçerik sırası bilinçli — en çok aranan bilgi en üstte:
 *   1. Düzeltme açıklaması (yönetici neden elle değiştirdi?)
 *   2. Devamsızlık sebebi (izinli mi?)
 *   3. Saat bazlı hareketler (nerede geçirdi?)
 *   4. Çalışmaya eklenen süre
 */
function GunBilgisi({ row }: { row: DetayRow }) {
  return (
    <div className="space-y-2.5">
      <div className="text-[11px] font-semibold" style={{ color: "var(--tx-secondary)" }}>
        {row.tarih} · {row.gun}
      </div>

      {/* 1) Elle düzeltme — açıklaması varsa asıl aradığımız metin bu */}
      {row.duzeltmeNeden && (
        <div>
          <span className="pill pill-violet">{row.duzeltmeNeden}</span>
          {row.duzeltmeAcik ? (
            <p className="mt-1.5" style={{ color: "var(--tx-primary)" }}>
              {row.duzeltmeAcik}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--tx-secondary)" }}>
              Açıklama yazılmamış.
            </p>
          )}
        </div>
      )}

      {/*
        2) Devamsızlık sebebi. Zaman çizelgesiyle birbirini DIŞLAMAZ: turnike
        kaydı olmayan bir günde de kişi klinik/toplantı bildirimi yapmış
        olabilir (canlı veride görüldü, 2026-08-17/19) — biri diğerini
        gizlerse o bildirimler görünmez olurdu.
      */}
      {!row.hasData && (
        <div>
          <div className="mb-1 text-[11px]" style={{ color: "var(--tx-secondary)" }}>
            Bu gün turnike kaydı yok.
          </div>
          {row.izinTuru ? (
            <div className="flex items-baseline gap-2">
              <span className={`pill ${row.izinUcretli ? "pill-ok" : "pill-warn"}`}>
                {row.izinTuru}
              </span>
              <span className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>
                {row.izinUcretli ? "eksik saate girmez" : "eksik saat sayılır"}
              </span>
            </div>
          ) : (
            <span className="pill pill-danger">Sebep bilinmiyor — kayıtsız gün</span>
          )}
        </div>
      )}

      {/* 3) Saat bazlı hareketler */}
      {row.gunOlaylari.length > 0 && (
        <ul className="space-y-1">
          {row.gunOlaylari.map((o, i) => {
            const renk = araTuruToken(o.etiket);
            return (
              <li
                key={i}
                className="flex items-center justify-between gap-2.5 px-2.5 py-1"
                style={{
                  background: renk.bg,
                  border: `1px solid ${renk.edge}`,
                  borderRadius: "var(--r-input)",
                  fontSize: 11.5,
                }}
              >
                <span style={{ color: renk.fg }}>
                  <span className="tabular-nums">
                    {o.bas}
                    {o.bit ? `–${o.bit}` : " (açık)"}
                  </span>{" "}
                  {o.etiket}
                </span>
                <span
                  className="flex shrink-0 items-center gap-2 tabular-nums"
                  style={{ color: "var(--tx-primary)" }}
                >
                  {o.dk != null ? dkp(o.dk) : "—"}
                  {o.konum && (
                    <a
                      href={o.konum}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-medium underline"
                      style={{ color: renk.fg }}
                    >
                      konum
                    </a>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* 4) Çalışmaya eklenen süre */}
      {row.krediDk > 0 && (
        <div
          className="flex items-center justify-between gap-3 px-2.5 py-1.5 text-[11.5px] font-semibold"
          style={{
            background: "var(--ac-sky-dim)",
            border: "1px solid var(--ac-sky-edge)",
            borderRadius: "var(--r-input)",
            color: "var(--ac-sky)",
          }}
        >
          <span>Çalışmaya eklendi (Klinik + Toplantı)</span>
          <span className="tabular-nums">{dkp(row.krediDk)}</span>
        </div>
      )}
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
    <Modal
      baslik="Gün Düzelt"
      altBaslik={`${row.adSoyad} · ${row.tarih} (${row.gun})`}
      onClose={onClose}
      genislik={440}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost px-5" style={{ height: 34 }}>
            İptal
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="btn-base btn-primary px-5"
            style={{ height: 34 }}
          >
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </>
      }
    >
      <label className="form-label" htmlFor="cor-neden">
        Neden
      </label>
      <select
        id="cor-neden"
        value={neden}
        onChange={(e) => setNeden(e.target.value)}
        className="input-glass mb-4 w-full px-3 text-xs"
        style={{ height: 34 }}
      >
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <label className="form-label">Sayılacak Çalışma Süresi (mevcut: {dkp(row.net)})</label>
      <div className="mb-4 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={24}
          value={saat}
          onChange={(e) => setSaat(Number(e.target.value))}
          aria-label="Saat"
          className="input-glass w-20 px-3 text-xs tabular-nums"
          style={{ height: 34 }}
        />
        <span className="text-xs" style={{ color: "var(--tx-secondary)" }}>
          saat
        </span>
        <input
          type="number"
          min={0}
          max={59}
          value={dakika}
          onChange={(e) => setDakika(Number(e.target.value))}
          aria-label="Dakika"
          className="input-glass w-20 px-3 text-xs tabular-nums"
          style={{ height: 34 }}
        />
        <span className="text-xs" style={{ color: "var(--tx-secondary)" }}>
          dakika
        </span>
      </div>

      <label className="form-label" htmlFor="cor-acik">
        Açıklama (opsiyonel)
      </label>
      <input
        id="cor-acik"
        type="text"
        value={acik}
        onChange={(e) => setAcik(e.target.value)}
        className="input-glass w-full px-3 text-xs"
        style={{ height: 34 }}
      />

      {error && (
        <Notice ton="danger" className="mt-4">
          {error}
        </Notice>
      )}
    </Modal>
  );
}
