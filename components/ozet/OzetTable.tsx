"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Notice, { Vurgu } from "@/components/ui/Notice";
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
            className="pill pill-mute"
            title="Bu kişinin dönemde hiç turnike kaydı yok — turnike dışı kapıları kullanıyor, bu yüzden turnike bazlı çalışma süresi hesaplanamaz."
          >
            Turnike kaydı yok
          </span>
        ) : r.gelinenGun === 0 ? (
          <span className="pill pill-violet">Hiç gelmemiş</span>
        ) : r.netFark < 0 ? (
          <span className="pill pill-danger">Eksik</span>
        ) : (
          <span className="pill pill-ok">Tamam</span>
        ),
      sortValue: (r) => (r.turnikeKaydi === 0 ? -1 : r.gelinenGun === 0 ? 0 : r.netFark < 0 ? 1 : 2),
    },
  ];

  return (
    <>
      {turnikesizSayisi > 0 && (
        <Notice ton="info" className="mb-3">
          Bu dönemde <Vurgu>{turnikesizSayisi}</Vurgu> kişinin hiç turnike kaydı yok
          (teknik/depo/klinik personeli genelde &quot;Personel GİRİŞ&quot;, &quot;Soyunma
          Odası&quot;, &quot;Lobi geçiş&quot; kapılarını kullanıyor). Turnike bazlı çalışma süresi
          bu kişiler için hesaplanamaz; <Vurgu>Turnike kaydı yok</Vurgu> olarak işaretlendiler.
          Sadece turnike kullananları görmek için durum filtresinden{" "}
          <Vurgu>Turnike Kullananlar</Vurgu> seçin.
        </Notice>
      )}

      {izinVerisiVar ? (
        <p className="mb-3 text-[11px] leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
          Sütun başlığına tıkla = sırala · Satıra tıkla = eksik günleri gör ·{" "}
          <span style={{ color: "var(--ac-cyan)", fontWeight: 600 }}>−Ni</span> = o kadar gün
          ücretli izin (yıllık/raporlu/mazeret) gereken günden düşüldü. Ücretsiz izin düşülmez,
          eksik yazar.
        </p>
      ) : (
        <Notice ton="warn" baslik="İzin verisi okunamıyor" className="mb-3">
          Kolay İK izin verisi şu an alınamıyor; eksik saat hesabı izinleri{" "}
          <Vurgu>dikkate almıyor</Vurgu>. Ücretli izinli günler de eksik olarak görünür. Bağlantı
          düzeldiğinde kendiliğinden toparlar (bkz. İzinler sayfası).
        </Notice>
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

      {detay && (
        <Modal
          baslik={detay.adSoyad}
          altBaslik={`${detay.unvan} · Sicil ${detay.sicil}`}
          onClose={() => setDetay(null)}
          genislik={520}
          footer={
            <button onClick={() => setDetay(null)} className="btn-ghost px-5" style={{ height: 34 }}>
              Kapat
            </button>
          }
        >
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <OzetKutu etiket="Turnike İçi" deger={dkp(detay.turnikeIci)} ton="sky" />
            <OzetKutu etiket="Beklenen" deger={dkp(detay.beklenenNet)} />
            <OzetKutu
              etiket="Fark"
              deger={dks(detay.netFark)}
              ton={detay.netFark < 0 ? "danger" : "ok"}
            />
          </div>

          <div className="mb-2 text-[13px] font-semibold" style={{ color: "var(--tx-primary)" }}>
            Gelmediği İş Günleri ({detay.eksikGunler.length})
          </div>

          {(detay.izinliGun > 0 || detay.ucretsizIzinGun > 0) && (
            <p className="mb-2.5 text-[11.5px] leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
              {detay.izinliGun > 0 && (
                <>
                  <span style={{ color: "var(--ac-cyan)", fontWeight: 600 }}>
                    {detay.izinliGun} gün ücretli izin
                  </span>{" "}
                  gereken günden düşüldü, eksik saate yansımadı.{" "}
                </>
              )}
              {detay.ucretsizIzinGun > 0 && (
                <>
                  <span style={{ color: "var(--cl-warn)", fontWeight: 600 }}>
                    {detay.ucretsizIzinGun} gün ücretsiz izin
                  </span>{" "}
                  eksik saat olarak sayıldı.
                </>
              )}
            </p>
          )}

          {detay.eksikGunler.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--cl-ok)" }}>
              Tüm iş günlerinde kayıt var.
            </p>
          ) : (
            <ul className="space-y-1">
              {detay.eksikGunler.map((d) => (
                <li
                  key={d.gs}
                  className="flex items-center justify-between px-3 py-1.5 text-xs"
                  style={{
                    background: "var(--cl-danger-dim)",
                    border: "1px solid var(--cl-danger-edge)",
                    borderRadius: "var(--r-xs)",
                  }}
                >
                  <span className="tabular-nums" style={{ color: "var(--tx-primary)" }}>
                    {d.gs}
                  </span>
                  <span className="flex items-center gap-2">
                    {d.izin === "ucretsiz" && (
                      <span className="pill pill-warn" title="Ücretsiz izin — eksik saat olarak sayılır">
                        ücretsiz izin
                      </span>
                    )}
                    <span style={{ color: "var(--tx-secondary)" }}>{d.gun}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </>
  );
}

/** Modal içindeki küçük ölçüm kutusu. */
function OzetKutu({
  etiket,
  deger,
  ton,
}: {
  etiket: string;
  deger: string;
  ton?: "sky" | "ok" | "danger";
}) {
  const renk =
    ton === "sky"
      ? { bg: "var(--ac-sky-dim)", edge: "var(--ac-sky-edge)", fg: "var(--ac-sky)" }
      : ton === "ok"
        ? { bg: "var(--cl-ok-dim)", edge: "var(--cl-ok-edge)", fg: "var(--cl-ok)" }
        : ton === "danger"
          ? { bg: "var(--cl-danger-dim)", edge: "var(--cl-danger-edge)", fg: "var(--cl-danger)" }
          : { bg: "var(--sf-2)", edge: "var(--edge-soft)", fg: "var(--tx-primary)" };

  return (
    <div
      className="px-3 py-2.5"
      style={{ background: renk.bg, border: `1px solid ${renk.edge}`, borderRadius: "var(--r-xs)" }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tx-secondary)" }}>
        {etiket}
      </div>
      <div className="mt-1 text-[15px] font-bold tabular-nums" style={{ color: renk.fg }}>
        {deger}
      </div>
    </div>
  );
}
