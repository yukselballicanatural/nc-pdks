"use client";

import { useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Notice, { Vurgu } from "@/components/ui/Notice";

export interface IzinRow {
  key: string;
  sicil: string | null;
  adSoyad: string;
  tur: string;
  baslangic: string;
  bitis: string;
  gunSayisi: number;
  kolayGun: number | null;
  ucretli: boolean | null;
  durum: string;
  eslesme: "isim" | "isim_sirasiz" | "isim_kismi" | null;
}

const DURUM_ETIKET: Record<string, string> = {
  approved: "Onaylı",
  waiting: "Bekliyor",
  rejected: "Reddedildi",
  cancelled: "İptal",
};

function trTarih(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "-";
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

export default function IzinlerPanel({
  rows,
  kullanilabilir,
  yetkiEksik,
  hata,
}: {
  rows: IzinRow[];
  kullanilabilir: boolean;
  yetkiEksik: boolean;
  hata: string | null;
}) {
  const [tur, setTur] = useState("");

  const turler = [...new Set(rows.map((r) => r.tur).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "tr")
  );
  const filtered = rows.filter((r) => !tur || r.tur === tur);

  const columns: Column<IzinRow>[] = [
    {
      key: "sicil",
      header: "Sicil",
      width: "80px",
      cell: (r) =>
        r.sicil ? (
          <span className="cell-code">{r.sicil}</span>
        ) : (
          <span title="Bu izin kaydı bir PDKS siciline bağlanamadı" style={{ color: "var(--cl-warn)" }}>
            —
          </span>
        ),
      sortValue: (r) => r.sicil ?? "zzz",
    },
    {
      key: "ad",
      header: "Ad Soyad",
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          <span style={{ color: "var(--tx-primary)" }}>{r.adSoyad}</span>
          {r.eslesme === "isim_kismi" && (
            <span className="pill pill-warn" title="Kısmi isim eşleşmesi — doğruluğu kontrol edilmeli">
              kontrol
            </span>
          )}
        </span>
      ),
      sortValue: (r) => r.adSoyad,
    },
    { key: "tur", header: "İzin Türü", cell: (r) => r.tur, sortValue: (r) => r.tur },
    {
      key: "bas",
      header: "Başlangıç",
      type: "date",
      cell: (r) => trTarih(r.baslangic),
      sortValue: (r) => r.baslangic,
    },
    {
      key: "bit",
      header: "Bitiş",
      type: "date",
      cell: (r) => trTarih(r.bitis),
      sortValue: (r) => r.bitis,
    },
    {
      key: "gun",
      header: "İş Günü",
      type: "num",
      align: "right",
      cell: (r) => (
        <span
          className="tabular-nums"
          title={`Takvim günü: ${r.gunSayisi}`}
        >
          {r.kolayGun ?? r.gunSayisi}
        </span>
      ),
      sortValue: (r) => r.kolayGun ?? r.gunSayisi,
    },
    {
      key: "ucret",
      header: "Ücret",
      cell: (r) =>
        r.ucretli === null ? (
          <span style={{ color: "var(--tx-disabled)" }}>—</span>
        ) : (
          <span className={`pill ${r.ucretli ? "pill-ok" : "pill-warn"}`}>
            {r.ucretli ? "Ücretli" : "Ücretsiz"}
          </span>
        ),
      sortValue: (r) => (r.ucretli ? 0 : 1),
    },
    {
      key: "durum",
      header: "Durum",
      cell: (r) => (
        <span className={`pill ${r.durum === "approved" ? "pill-ok" : "pill-mute"}`}>
          {DURUM_ETIKET[r.durum] ?? r.durum}
        </span>
      ),
      sortValue: (r) => r.durum,
    },
  ];

  if (!kullanilabilir) {
    return (
      <Notice
        ton="warn"
        baslik={yetkiEksik ? "İzin verisi için API yetkisi gerekiyor" : "İzin verisi alınamadı"}
      >
        {yetkiEksik ? (
          <div className="space-y-2.5">
            <p>Kolay İK bağlantısı kuruldu ancak izin listesi uç noktası yetki hatası döndürdü:</p>
            <p
              className="px-3 py-2 font-mono text-[11px]"
              style={{
                background: "var(--sf-sunken)",
                border: "1px solid var(--cl-danger-edge)",
                borderRadius: "var(--r-input)",
                color: "var(--cl-danger)",
              }}
            >
              {hata ?? "Geçersiz API bilgisi"}
            </p>
            <p>
              Bu hata token&apos;ın geçersiz olduğunu değil, <Vurgu>izin okuma kapsamının</Vurgu>{" "}
              kapalı olduğunu gösterir. Kolay İK&apos;da{" "}
              <span style={{ color: "var(--ac-sky)", fontWeight: 600 }}>
                Ayarlar → Geliştirici Ayarları
              </span>
              &apos;ndan bu token&apos;a <span className="font-mono">leave/list</span> yetkisini
              verip sayfayı yenileyin; kod tarafında değişiklik gerekmiyor.
            </p>
          </div>
        ) : (
          <p>{hata ?? "Bilinmeyen hata."}</p>
        )}
      </Notice>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
        İzin kayıtları Kolay İK&apos;dan canlı okunur; kişiler, Takımlar sayfasındaki &quot;Kolay İK
        ile Eşitle&quot; ile alınan personel önbelleği üzerinden PDKS siciline bağlanır. Bu veri{" "}
        <Vurgu>eksik saat hesabına doğrudan giriyor</Vurgu>: <Vurgu>ücretli</Vurgu> izin günleri
        gereken günden düşülür (eksik yazmaz), <Vurgu>ücretsiz</Vurgu> izin günleri ise gereken gün
        olarak sayılmaya devam eder ve eksik yazar.
      </p>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil ?? ""} ${r.adSoyad} ${r.tur}`}
        searchPlaceholder="Ad, sicil veya izin türü ara…"
        filters={[{ label: "Tüm İzin Türleri", options: turler, value: tur, onChange: setTur }]}
        emptyText="Bu dönemde onaylı izin kaydı yok."
        pageSize={100}
      />
    </div>
  );
}
