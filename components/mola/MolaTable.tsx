"use client";

import { useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Notice, { Vurgu } from "@/components/ui/Notice";
import { AraRozeti } from "@/components/ui/AraTuru";
import { dkp } from "@/lib/format";

/** Bir turnike dışı aralığın tracker'a göre nasıl geçtiği. */
export interface AralikAciklamasi {
  etiket: string;
  dk: number;
}

export interface MolaAralik {
  metin: string;
  dk: number;
  /** Boşsa tracker o saatler için bir şey söylemiyor. */
  aciklama: AralikAciklamasi[];
}

export interface MolaRow {
  key: string;
  sicil: string;
  adSoyad: string;
  unvan: string;
  tarih: string;
  vardiya: string;
  net: number;
  mola: number;
  toplam: number;
  /** Turnike dışı sürenin eksik saat hesabına MOLA olarak giren kısmı. */
  molaSayilan: number;
  /** Klinik + Toplantı olarak ÇALIŞMA sayılan dakika. */
  krediDk: number;
  calismaAraliklari: string[];
  molaAraliklari: MolaAralik[];
  digerOkuyucular: string[];
  digerDakika: number;
  /** Günün tamamı için tür bazında toplam (Klinik 40dk, Yemek 30dk …). */
  nedenOzet: AralikAciklamasi[];
  aciklananDk: number;
  aciklanmayanDk: number;
}

export interface TrackerDurum {
  kullanilabilir: boolean;
  hata: string | null;
  olaySayisi: number;
  eslesmeyenOlay: number;
  eslesmeyenAdlar: string[];
  kapanmamis: number;
  kisiSayisi: number;
}

/* Tür renkleri artık components/ui/AraTuru.tsx'te — üç ekranda aynı olsun diye
   (eskiden burada "Yemek" yeşil, Günlük Detay'da sarıydı). */
const Rozet = AraRozeti;

/** Modal icindeki bolum basligi - sol aksan cubuklu (DESIGN_SYSTEM.md 11). */
function BolumBasligi({
  children,
  renk = "var(--ac-sky)",
}: {
  children: React.ReactNode;
  renk?: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span aria-hidden className="h-3 w-[3px] rounded-full" style={{ background: renk }} />
      <span className="text-[12.5px] font-semibold" style={{ color: "var(--tx-primary)" }}>
        {children}
      </span>
    </div>
  );
}

export default function MolaTable({
  rows,
  tracker,
}: {
  rows: MolaRow[];
  tracker: TrackerDurum;
}) {
  const [tl, setTl] = useState("");
  const [esik, setEsik] = useState("");
  const [neden, setNeden] = useState("");
  const [detay, setDetay] = useState<MolaRow | null>(null);

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.unvan).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  // Filtre seçenekleri veriden üretiliyor — yeni bir ara türü eklenirse
  // kendiliğinden listeye girer.
  const nedenList = useMemo(
    () =>
      [...new Set(rows.flatMap((r) => r.nedenOzet.map((n) => n.etiket)))].sort((a, b) =>
        a.localeCompare(b, "tr")
      ),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (tl && r.unvan !== tl) return false;
        if (esik === "2 saatten fazla" && r.mola <= 120) return false;
        if (esik === "3 saatten fazla" && r.mola <= 180) return false;
        if (neden === "Açıklaması olan" && r.aciklananDk === 0) return false;
        if (neden === "Açıklaması olmayan" && r.aciklananDk > 0) return false;
        if (neden && !["Açıklaması olan", "Açıklaması olmayan"].includes(neden)) {
          if (!r.nedenOzet.some((n) => n.etiket === neden)) return false;
        }
        return true;
      }),
    [rows, tl, esik, neden]
  );

  const columns: Column<MolaRow>[] = [
    {
      key: "adSoyad",
      header: "Kişi",
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
      key: "tl",
      header: "Ünvan",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{r.unvan}</span>,
      sortValue: (r) => r.unvan,
    },
    {
      key: "net",
      header: "Turnike İçi",
      align: "right",
      cell: (r) => dkp(r.net),
      sortValue: (r) => r.net,
    },
    {
      key: "mola",
      header: "Turnike Dışı",
      align: "right",
      cell: (r) => (
        <span
          className={r.mola > 120 ? "font-semibold" : ""}
          style={{ color: r.mola > 120 ? "var(--cl-warn)" : "var(--tx-secondary)" }}
        >
          {dkp(r.mola)}
        </span>
      ),
      sortValue: (r) => r.mola,
    },
    {
      key: "kredi",
      header: "Çalışma Sayıldı",
      align: "right",
      cell: (r) =>
        r.krediDk > 0 ? (
          <span style={{ color: "var(--cl-ok)" }}>{dkp(r.krediDk)}</span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.krediDk,
    },
    {
      key: "molaSayilan",
      header: "Mola Sayıldı",
      align: "right",
      cell: (r) => (
        <span
          className={r.molaSayilan > 120 ? "font-semibold" : ""}
          style={{ color: r.molaSayilan > 120 ? "var(--cl-warn)" : "var(--tx-secondary)" }}
        >
          {dkp(r.molaSayilan)}
        </span>
      ),
      sortValue: (r) => r.molaSayilan,
    },
    {
      key: "neden",
      header: "Nerede Geçti",
      cell: (r) =>
        r.nedenOzet.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {r.nedenOzet.slice(0, 3).map((n) => (
              <Rozet key={n.etiket} {...n} />
            ))}
            {r.nedenOzet.length > 3 && (
              <span className="text-[11px]" style={{ color: "var(--tx-muted)" }}>
                +{r.nedenOzet.length - 3}
              </span>
            )}
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--tx-disabled)" }}>
            {tracker.kullanilabilir ? "Bildirim yok" : "-"}
          </span>
        ),
      sortValue: (r) => r.aciklananDk,
    },
    {
      key: "aciklanmayan",
      header: "Açıklanmayan",
      align: "right",
      cell: (r) =>
        r.aciklanmayanDk > 0 && r.aciklananDk > 0 ? (
          <span style={{ color: "var(--cl-warn)" }}>{dkp(r.aciklanmayanDk)}</span>
        ) : (
          <span style={{ color: "var(--tx-disabled)" }}>-</span>
        ),
      sortValue: (r) => r.aciklanmayanDk,
    },
    {
      key: "toplam",
      header: "Toplam",
      align: "right",
      cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{dkp(r.toplam)}</span>,
      sortValue: (r) => r.toplam,
    },
    {
      key: "ozet",
      header: "Dışarıda Kalınan Aralıklar",
      cell: (r) => (
        <span className="text-xs" style={{ color: "var(--tx-secondary)" }}>
          {r.molaAraliklari.slice(0, 2).map((m) => m.metin).join(" · ") || "-"}
          {r.molaAraliklari.length > 2 && (
            <span style={{ color: "var(--tx-muted)" }}>
              {" "}+{r.molaAraliklari.length - 2} aralık
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      {/* Tracker durumu — veri yoksa/eksikse sessiz kalmıyoruz, çünkü boş bir
          "Nerede Geçti" kolonu "mola yok" gibi okunabilir. */}
      {tracker.hata ? (
        <Notice ton="danger" baslik="Mola bildirimleri okunamadı" className="mb-3">
          {tracker.hata} — &quot;Nerede Geçti&quot; sütunu bu yüzden boş. Turnike süreleri
          etkilenmedi.
        </Notice>
      ) : !tracker.kullanilabilir ? (
        <Notice ton="info" className="mb-3">
          Bu dönemde <Vurgu>mola bildirimi yok</Vurgu>. Çalışanlar uygulamadan
          mola/klinik/toplantı/yemek bildirdikçe turnike dışı sürelerin nedeni bu ekranda
          kendiliğinden görünmeye başlar.
        </Notice>
      ) : (
        <Notice ton="ok" className="mb-3">
          Dönemde <Vurgu>{tracker.olaySayisi}</Vurgu> mola bildirimi okundu,{" "}
          <Vurgu>{tracker.kisiSayisi}</Vurgu> kişiye bağlandı.
          {tracker.eslesmeyenOlay > 0 && (
            <>
              {" "}
              <span style={{ color: "var(--cl-warn)" }}>
                {tracker.eslesmeyenOlay} bildirim bir kişiye bağlanamadı
              </span>
              {tracker.eslesmeyenAdlar.length > 0 && <> ({tracker.eslesmeyenAdlar.join(", ")})</>}.
            </>
          )}
          {tracker.kapanmamis > 0 && (
            <>
              {" "}
              <span style={{ color: "var(--cl-warn)" }}>
                {tracker.kapanmamis} bildirim kapatılmamış
              </span>{" "}
              (mola başlatılmış ama bitirilmemiş) — süresi bilinmediği için hesaba katılmadı.
            </>
          )}
        </Notice>
      )}

      <p className="mb-3 text-[11px] leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
        <strong style={{ color: "var(--tx-primary)" }}>Turnike Dışı</strong>: binadan
        çıkılan tüm süre. <strong style={{ color: "var(--cl-ok)" }}>Çalışma Sayıldı</strong>:
        bunun Klinik + Toplantı olarak bildirilen kısmı — eksik saat hesabında çalışma sayılır.{" "}
        <strong style={{ color: "var(--cl-warn)" }}>Mola Sayıldı</strong>: eksik saat hesabına
        mola olarak giren kısım. Satıra tıkla = o günün tüm aralıkları ve nerede geçtiği.
      </p>
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) =>
          `${r.sicil} ${r.adSoyad} ${r.tarih} ${r.nedenOzet.map((n) => n.etiket).join(" ")}`
        }
        searchPlaceholder="Ad, soyad, sicil, tarih veya neden ara..."
        filters={[
          { label: "Tüm Ünvanlar", options: tlList, value: tl, onChange: setTl },
          { label: "Tüm Molalar", options: ["2 saatten fazla", "3 saatten fazla"], value: esik, onChange: setEsik },
          {
            label: "Tüm Nedenler",
            options: [...nedenList, "Açıklaması olan", "Açıklaması olmayan"],
            value: neden,
            onChange: setNeden,
          },
        ]}
        onRowClick={(r) => setDetay(r)}
        rowClass={(r) => (r.mola > 120 ? "row-warn" : "")}
        pageSize={200}
      />

      {detay && (
        <Modal
          baslik={detay.adSoyad}
          altBaslik={
            <>
              {detay.tarih} · {detay.vardiya} · Turnike içi {dkp(detay.net)} / dışı {dkp(detay.mola)}
              {detay.krediDk > 0 && (
                <>
                  {" · "}
                  <span style={{ color: "var(--cl-ok)", fontWeight: 600 }}>
                    {dkp(detay.krediDk)} çalışma sayıldı
                  </span>
                  {" · "}
                  <span style={{ color: "var(--cl-warn)", fontWeight: 600 }}>
                    {dkp(detay.molaSayilan)} mola sayıldı
                  </span>
                </>
              )}
            </>
          }
          onClose={() => setDetay(null)}
          genislik={580}
          footer={
            <button onClick={() => setDetay(null)} className="btn-ghost px-5" style={{ height: 34 }}>
              Kapat
            </button>
          }
        >
          {detay.nedenOzet.length > 0 && (
            <div className="mb-4">
              <BolumBasligi>Turnike Dışı Süre Nerede Geçti</BolumBasligi>
              <div className="flex flex-wrap gap-1.5">
                {detay.nedenOzet.map((n) => (
                  <Rozet key={n.etiket} {...n} />
                ))}
              </div>
              {detay.aciklanmayanDk > 0 && (
                <div className="mt-1.5 text-[11px]" style={{ color: "var(--cl-warn)" }}>
                  {dkp(detay.aciklanmayanDk)} için bildirim yok.
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <BolumBasligi renk="var(--cl-ok)">
              Turnike İçi Çalışma Aralıkları ({detay.calismaAraliklari.length})
            </BolumBasligi>
            <ul className="space-y-1 text-xs">
              {detay.calismaAraliklari.map((a, i) => (
                <li
                  key={i}
                  className="px-3 py-1.5 tabular-nums"
                  style={{
                    background: "var(--cl-ok-dim)",
                    border: "1px solid var(--cl-ok-edge)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--tx-primary)",
                  }}
                >
                  {a}
                </li>
              ))}
              {detay.calismaAraliklari.length === 0 && (
                <li style={{ color: "var(--tx-disabled)" }}>Yok</li>
              )}
            </ul>
          </div>

          <div className="mb-4">
            <BolumBasligi renk="var(--cl-warn)">
              Turnike Dışında Kalınan Aralıklar ({detay.molaAraliklari.length})
            </BolumBasligi>
            <ul className="space-y-1 text-xs">
              {detay.molaAraliklari.map((m, i) => (
                <li
                  key={i}
                  className="px-3 py-1.5"
                  style={{
                    background: "var(--cl-warn-dim)",
                    border: "1px solid var(--cl-warn-edge)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--tx-primary)",
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabular-nums">{m.metin}</span>
                    {m.aciklama.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {m.aciklama.map((a) => (
                          <Rozet key={a.etiket} {...a} />
                        ))}
                      </span>
                    ) : (
                      <span className="text-[10.5px]" style={{ color: "var(--tx-secondary)" }}>
                        bildirim yok
                      </span>
                    )}
                  </div>
                </li>
              ))}
              {detay.molaAraliklari.length === 0 && (
                <li style={{ color: "var(--tx-disabled)" }}>Yok</li>
              )}
            </ul>
          </div>

          {detay.digerOkuyucular.length > 0 && (
            <div>
              <BolumBasligi>Turnike Dışı Okutulan Okuyucular</BolumBasligi>
              <div className="flex flex-wrap gap-1.5">
                {detay.digerOkuyucular.map((o) => (
                  <span key={o} className="pill pill-mute">
                    {o}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
