"use client";

import { useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";

export interface IzinRow {
  key: string;
  sicil: string | null;
  adSoyad: string;
  tur: string;
  baslangic: string;
  bitis: string;
  gunSayisi: number;
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
          <span className="tabular-nums" style={{ color: "var(--tx-secondary)" }}>
            {r.sicil}
          </span>
        ) : (
          <span style={{ color: "var(--cl-warn)" }}>—</span>
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
            <span
              title="Kısmi isim eşleşmesi — doğruluğu kontrol edilmeli"
              className="rounded-full px-1.5 py-0.5 text-[10px]"
              style={{
                background: "rgba(251,191,36,0.12)",
                border: "1px solid rgba(251,191,36,0.3)",
                color: "#fbbf24",
              }}
            >
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
      header: "Gün",
      type: "num",
      align: "right",
      cell: (r) => <span className="tabular-nums">{r.gunSayisi}</span>,
      sortValue: (r) => r.gunSayisi,
    },
    {
      key: "durum",
      header: "Durum",
      cell: (r) => DURUM_ETIKET[r.durum] ?? r.durum,
      sortValue: (r) => r.durum,
    },
  ];

  if (!kullanilabilir) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold" style={{ color: "var(--cl-warn)" }}>
          {yetkiEksik ? "İzin verisi için API yetkisi gerekiyor" : "İzin verisi alınamadı"}
        </h3>

        {yetkiEksik ? (
          <div className="mt-3 space-y-3 text-xs leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
            <p>
              Kolay İK bağlantısı <span style={{ color: "var(--cl-ok)" }}>kuruldu</span> ve çalışan
              listesi başarıyla okunuyor. Ancak aynı token ile{" "}
              <span style={{ color: "var(--tx-primary)" }}>leave/list</span> (izin listesi) uç noktası
              çağrıldığında Kolay şu yanıtı veriyor:
            </p>
            <p
              className="rounded-lg px-3 py-2 font-mono text-[11px]"
              style={{ background: "rgba(0,0,0,0.3)", color: "var(--cl-danger)" }}
            >
              Geçersiz API bilgisi, lütfen API anahtarını kontrol edin.
            </p>
            <p>
              Bu, token&apos;ın geçersiz olduğu anlamına gelmiyor — çalışan listesi tam olarak aynı
              anahtarla sorunsuz geliyor. Eksik olan şey token&apos;ın{" "}
              <span style={{ color: "var(--tx-primary)" }}>izin okuma kapsamı</span>.
            </p>
            <div
              className="rounded-xl p-3.5"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
            >
              <p className="mb-2 font-semibold" style={{ color: "var(--tx-primary)" }}>
                Yapılması gereken
              </p>
              <ol className="list-inside list-decimal space-y-1">
                <li>
                  Kolay İK&apos;da{" "}
                  <span style={{ color: "var(--ac-sky)" }}>Ayarlar → Geliştirici Ayarları</span>{" "}
                  sayfasını açın (app.kolayik.com/settings/developer-settings).
                </li>
                <li>Bu token&apos;ı düzenleyin.</li>
                <li>
                  İzin / <span className="font-mono">leave</span> yetkisini işaretleyip kaydedin.
                </li>
                <li>Bu sayfayı yenileyin — kod tarafında değişiklik gerekmiyor.</li>
              </ol>
            </div>
            <p style={{ color: "var(--tx-muted)" }}>
              Not: <span className="font-mono">person/bulk-view</span> ve{" "}
              <span className="font-mono">unit/show-unit-tree</span> uç noktaları da kapalı. Vardiya
              ve birim bilgisi yalnızca bu uç noktalarda bulunduğu için vardiya verisi şu an Kolay&apos;dan
              çekilemiyor; izinle birlikte bu yetkiler de açılırsa vardiyayı da buradan alabiliriz.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs" style={{ color: "var(--tx-secondary)" }}>
            {hata ?? "Bilinmeyen hata."}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed" style={{ color: "var(--tx-muted)" }}>
        İzin kayıtları Kolay İK&apos;dan canlı okunur ve isim üzerinden PDKS siciline bağlanır.
        Çalışma süresi hesabı bu sayfadan <span style={{ color: "var(--tx-secondary)" }}>etkilenmez</span>{" "}
        — izin bilgisi şimdilik yalnızca görüntüleniyor. İzinli günlerin eksik saat hesabından
        düşülmesini isterseniz söylemeniz yeterli.
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
