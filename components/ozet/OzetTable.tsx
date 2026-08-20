"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { dkp, dks } from "@/lib/format";

export interface OzetRow {
  sicil: string;
  adSoyad: string;
  unvan: string;
  bolum: string;
  vardiya: "GECE" | "GUNDUZ";
  gerekenGun: number; // bg — hafta içi gün sayısı EKSİ ücretli izin günleri
  izinliGun: number; // ücretli izin nedeniyle gerekenden düşülen gün
  ucretsizIzinGun: number; // ücretsiz izin — gerekenden düşülmez, eksik yazar
  gelinenGun: number; // cg — çalışma kaydı olan gün sayısı
  turnikeIci: number; // net
  turnikeDisi: number; // mola
  toplamSure: number; // brüt
  beklenenNet: number;
  netFark: number; // net - beklenen (pozitif = fazla)
  hafta: number; // cmt/paz net
  turnikeKaydi: number; // dönemdeki turnike (çalışma alanı) kayıt sayısı
  eksikGunler: { gs: string; gun: string; izin: "ucretli" | "ucretsiz" | null }[];
}

export default function OzetTable({
  rows,
  izinVerisiVar,
}: {
  rows: OzetRow[];
  izinVerisiVar: boolean;
}) {
  const [tl, setTl] = useState("");
  const [durum, setDurum] = useState("");
  const [detay, setDetay] = useState<OzetRow | null>(null);

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.unvan).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.unvan !== tl) return false;
        if (durum === "Turnike Kullananlar" && r.turnikeKaydi === 0) return false;
        if (durum === "Turnike Kullanmayanlar" && r.turnikeKaydi > 0) return false;
        if (durum === "Eksik" && (r.netFark >= 0 || r.turnikeKaydi === 0)) return false;
        if (durum === "Tamam" && r.netFark < 0) return false;
        if (durum === "Hiç Gelmemiş" && r.gelinenGun !== 0) return false;
        return true;
      }),
    [rows, tl, durum]
  );

  const turnikesizSayisi = useMemo(() => rows.filter((r) => r.turnikeKaydi === 0).length, [rows]);

  const columns: Column<OzetRow>[] = [
    {
      key: "sicil",
      header: "Sicil",
      width: "70px",
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
      key: "tl",
      header: "Ünvan",
      cell: (r) => (
        <span style={{ color: r.unvan === "Bilinmiyor" ? "var(--cl-danger)" : "var(--tx-secondary)" }}>
          {r.unvan}
        </span>
      ),
      sortValue: (r) => r.unvan,
    },
    {
      key: "vardiya",
      header: "Vardiya",
      align: "center",
      cell: (r) => (
        <span style={{ color: r.vardiya === "GECE" ? "var(--cl-violet)" : "var(--cl-warn)" }}>
          {r.vardiya === "GECE" ? "Gece" : "Gündüz"}
        </span>
      ),
      sortValue: (r) => r.vardiya,
    },
    {
      key: "gun",
      header: "Gereken / Geldiği Gün",
      align: "center",
      cell: (r) => (
        <span>
          <span style={{ color: "var(--tx-secondary)" }}>{r.gerekenGun}</span>
          <span style={{ color: "var(--tx-disabled)" }}> / </span>
          <span style={{ color: r.gelinenGun < r.gerekenGun ? "var(--cl-danger)" : "var(--cl-ok)" }}>
            {r.gelinenGun}
          </span>
          {r.izinliGun > 0 && (
            <span
              title={`${r.izinliGun} gün ücretli izin — gereken günden düşüldü`}
              style={{ color: "var(--ac-cyan)" }}
            >
              {" "}
              −{r.izinliGun}i
            </span>
          )}
        </span>
      ),
      sortValue: (r) => r.gelinenGun,
    },
    {
      key: "net",
      header: "Turnike İçi",
      align: "right",
      cell: (r) => dkp(r.turnikeIci),
      sortValue: (r) => r.turnikeIci,
    },
    {
      key: "mola",
      header: "Turnike Dışı",
      align: "right",
      cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{dkp(r.turnikeDisi)}</span>,
      sortValue: (r) => r.turnikeDisi,
    },
    {
      key: "brut",
      header: "Toplam Süre",
      align: "right",
      cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{dkp(r.toplamSure)}</span>,
      sortValue: (r) => r.toplamSure,
    },
    {
      key: "bek",
      header: "Beklenen Net",
      align: "right",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{dkp(r.beklenenNet)}</span>,
      sortValue: (r) => r.beklenenNet,
    },
    {
      key: "fark",
      header: "Net Fark",
      align: "right",
      cell: (r) => (
        <span
          className="font-semibold"
          style={{ color: r.netFark < 0 ? "var(--cl-danger)" : "var(--cl-ok)" }}
        >
          {dks(r.netFark)}
        </span>
      ),
      sortValue: (r) => r.netFark,
    },
    {
      key: "hafta",
      header: "Cmt/Paz",
      align: "right",
      cell: (r) =>
        r.hafta > 0 ? (
          <span style={{ color: "var(--cl-warn)" }}>{dkp(r.hafta)}</span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.hafta,
    },
    {
      key: "durum",
      header: "Durum",
      align: "center",
      cell: (r) =>
        r.turnikeKaydi === 0 ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "var(--tx-secondary)",
            }}
            title="Bu kişinin dönemde hiç turnike kaydı yok — turnike dışı kapıları kullanıyor, bu yüzden turnike bazlı çalışma süresi hesaplanamaz."
          >
            Turnike kaydı yok
          </span>
        ) : r.gelinenGun === 0 ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "var(--cl-danger-dim)", color: "var(--cl-danger)" }}
          >
            Hiç gelmemiş
          </span>
        ) : r.netFark < 0 ? (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "var(--cl-danger-dim)", color: "var(--cl-danger)" }}
          >
            Eksik
          </span>
        ) : (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "var(--cl-ok-dim)", color: "var(--cl-ok)" }}
          >
            Tamam
          </span>
        ),
      sortValue: (r) => (r.turnikeKaydi === 0 ? -1 : r.gelinenGun === 0 ? 0 : r.netFark < 0 ? 1 : 2),
    },
  ];

  return (
    <>
      {turnikesizSayisi > 0 && (
        <div
          className="mb-3 rounded-xl p-3 text-xs"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--tx-secondary)",
          }}
        >
          Bu dönemde{" "}
          <span style={{ color: "var(--tx-primary)" }}>{turnikesizSayisi}</span> kişinin hiç turnike
          kaydı yok (teknik/depo/klinik personeli genelde &quot;Personel GİRİŞ&quot;, &quot;Soyunma
          Odası&quot;, &quot;Lobi geçiş&quot; kapılarını kullanıyor). Turnike bazlı çalışma süresi bu
          kişiler için hesaplanamaz;{" "}
          <span style={{ color: "var(--tx-primary)" }}>Turnike kaydı yok</span> olarak
          işaretlendiler. Sadece turnike kullananları görmek için durum filtresinden{" "}
          <span style={{ color: "var(--tx-primary)" }}>Turnike Kullananlar</span> seçin.
        </div>
      )}
      {izinVerisiVar ? (
        <p className="mb-3 text-xs" style={{ color: "var(--tx-muted)" }}>
          💡 Sütun başlığına tıkla = sırala · Satıra tıkla = eksik günleri gör ·{" "}
          <span style={{ color: "var(--ac-cyan)" }}>−Ni</span> = o kadar gün ücretli izin
          (yıllık/raporlu/mazeret) gereken günden düşüldü. Ücretsiz izin düşülmez, eksik yazar.
        </p>
      ) : (
        <p
          className="mb-3 rounded-xl px-3 py-2 text-xs leading-relaxed"
          style={{
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.25)",
            color: "#fbbf24",
          }}
        >
          Kolay İK izin verisi şu an okunamıyor; eksik saat hesabı izinleri
          <span style={{ color: "var(--tx-primary)" }}> dikkate almıyor</span>. Ücretli izinli günler
          de eksik olarak görünür. Bağlantı düzeldiğinde düzelir (bkz. İzinler sayfası).
        </p>
      )}
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.sicil}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.unvan} ${r.bolum}`}
        searchPlaceholder="Ad, soyad, sicil veya bölüm ara..."
        filters={[
          { label: "Tüm Ünvanlar", options: tlList, value: tl, onChange: setTl },
          {
            label: "Tüm Durumlar",
            options: [
              "Turnike Kullananlar",
              "Turnike Kullanmayanlar",
              "Eksik",
              "Tamam",
              "Hiç Gelmemiş",
            ],
            value: durum,
            onChange: setDurum,
          },
        ]}
        onRowClick={(r) => setDetay(r)}
        rowClass={(r) =>
          r.turnikeKaydi === 0 ? "row-mute" : r.gelinenGun === 0 ? "row-danger" : ""
        }
      />

      {/* Modal */}
      {detay && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setDetay(null)}
        >
          <div
            className="modal-panel glass-modal max-h-[80vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal üst parıltı */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[18px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(56,189,248,0.4) 50%, transparent)",
              }}
            />

            <div
              className="mb-1 text-lg font-semibold"
              style={{ color: "var(--tx-primary)" }}
            >
              {detay.adSoyad}
            </div>
            <div className="mb-5 text-sm" style={{ color: "var(--tx-secondary)" }}>
              {detay.unvan} · Sicil {detay.sicil}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div
                className="rounded-xl p-3"
                style={{
                  background: "rgba(56,189,248,0.06)",
                  border: "1px solid rgba(56,189,248,0.15)",
                }}
              >
                <div className="mb-1 text-xs" style={{ color: "var(--tx-muted)" }}>
                  Turnike İçi (Net)
                </div>
                <div className="tabular-nums font-semibold" style={{ color: "var(--tx-primary)" }}>
                  {dkp(detay.turnikeIci)}
                </div>
              </div>
              <div
                className="rounded-xl p-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="mb-1 text-xs" style={{ color: "var(--tx-muted)" }}>
                  Beklenen
                </div>
                <div className="tabular-nums font-semibold" style={{ color: "var(--tx-primary)" }}>
                  {dkp(detay.beklenenNet)}
                </div>
              </div>
            </div>

            <div
              className="mb-3 text-sm font-semibold"
              style={{ color: "var(--tx-primary)" }}
            >
              Gelmediği İş Günleri ({detay.eksikGunler.length})
            </div>
            {(detay.izinliGun > 0 || detay.ucretsizIzinGun > 0) && (
              <p className="mb-2 text-xs leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
                {detay.izinliGun > 0 && (
                  <>
                    <span style={{ color: "var(--ac-cyan)" }}>{detay.izinliGun} gün ücretli izin</span>{" "}
                    gereken günden düşüldü, eksik saate yansımadı.{" "}
                  </>
                )}
                {detay.ucretsizIzinGun > 0 && (
                  <>
                    <span style={{ color: "var(--cl-warn)" }}>
                      {detay.ucretsizIzinGun} gün ücretsiz izin
                    </span>{" "}
                    eksik saat olarak sayıldı.
                  </>
                )}
              </p>
            )}
            {detay.eksikGunler.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--cl-ok)" }}>
                Tüm iş günlerinde kayıt var.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detay.eksikGunler.map((d) => (
                  <li
                    key={d.gs}
                    className="flex justify-between rounded-lg px-3 py-1.5"
                    style={{
                      background: "rgba(248,113,113,0.06)",
                      border: "1px solid rgba(248,113,113,0.1)",
                    }}
                  >
                    <span style={{ color: "var(--tx-primary)" }}>{d.gs}</span>
                    <span className="flex items-center gap-2">
                      {d.izin === "ucretsiz" && (
                        <span
                          title="Ücretsiz izin — eksik saat olarak sayılır"
                          className="rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{
                            background: "rgba(251,191,36,0.12)",
                            border: "1px solid rgba(251,191,36,0.3)",
                            color: "#fbbf24",
                          }}
                        >
                          ücretsiz izin
                        </span>
                      )}
                      <span style={{ color: "var(--tx-muted)" }}>{d.gun}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setDetay(null)}
              className="mt-5 w-full rounded-xl py-2 text-sm transition-all duration-150"
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
