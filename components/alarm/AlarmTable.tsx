"use client";

import { useMemo, useRef, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import StatCard from "@/components/ui/StatCard";
import Modal from "@/components/ui/Modal";
import Notice from "@/components/ui/Notice";
import { ALARM_TIPLERI, type AlarmTip } from "@/lib/engine/constants";
import { getAlarmDayRecordsAction } from "@/app/actions/alarmDetail";

export interface AlarmRow {
  key: string;
  tip: AlarmTip;
  tipLabel: string;
  sicil: string;
  adSoyad: string;
  unvan: string;
  tarih: string;
  saat: string;
  okuyucu: string;
  detay: string;
}

/** O kişinin o vardiya gününe ait tüm geçiş kayıtları (_show_alarm_detail portu). */
export interface AlarmDayRecord {
  saat: string;
  okuyucu: string;
  alan: string;
  yon: string;
}

/** Alarm tipi → görsel ton. Renkler token, açık temada da okunur. */
const TON: Record<AlarmTip, { pill: string; bg: string; edge: string; fg: string }> = {
  TURNIKESIZ_CIKIS: {
    pill: "pill-danger",
    bg: "var(--cl-danger-dim)",
    edge: "var(--cl-danger-edge)",
    fg: "var(--cl-danger)",
  },
  KART_BASMA: {
    pill: "pill-warn",
    bg: "var(--cl-warn-dim)",
    edge: "var(--cl-warn-edge)",
    fg: "var(--cl-warn)",
  },
  TURNIKE_ATLAMA: {
    pill: "pill-violet",
    bg: "var(--cl-violet-dim)",
    edge: "var(--cl-violet-edge)",
    fg: "var(--cl-violet)",
  },
};

export default function AlarmTable({
  rows,
  totalCounts,
  sd,
  ed,
}: {
  rows: AlarmRow[];
  /** Dönemin tamamındaki sayılar (tablo kısaltılmış olsa da kartlar doğru kalır). */
  totalCounts: Record<AlarmTip, number>;
  sd: string;
  ed: string;
}) {
  const [aktif, setAktif] = useState<Record<AlarmTip, boolean>>({
    TURNIKESIZ_CIKIS: true,
    KART_BASMA: true,
    TURNIKE_ATLAMA: true,
  });
  const [tl, setTl] = useState("");
  const [detay, setDetay] = useState<AlarmRow | null>(null);
  const [dayRecords, setDayRecords] = useState<AlarmDayRecord[] | null>(null);
  const [detayError, setDetayError] = useState<string | null>(null);

  /**
   * Gün kayıtları KULLANICI TIKLAMASIYLA çekiliyor, useEffect ile değil.
   *
   * Eskiden `useEffect(..., [detay])` içinde setState çağrılıyordu; bu hem
   * zincirleme render tetikliyor hem de React'in "efekt gövdesinde setState
   * çağırma" kuralını ihlal ediyordu. Veri çekme zaten bir kullanıcı olayının
   * sonucu — olay işleyicisine taşımak hem doğru hem daha yalın.
   *
   * YARIŞ KORUMASI: kullanıcı hızlıca başka bir satıra tıklarsa önceki isteğin
   * gecikmiş yanıtı yeni satırın kayıtlarını ezebilir. Her istek bir sıra
   * numarası alıyor, yalnızca en güncel olan state'e yazıyor.
   */
  const istekNo = useRef(0);

  async function ac(r: AlarmRow) {
    const no = ++istekNo.current;
    setDetay(r);
    setDayRecords(null);
    setDetayError(null);
    try {
      const res = await getAlarmDayRecordsAction(r.sicil, r.tarih, sd, ed);
      if (no !== istekNo.current) return; // eskimiş yanıt — yok say
      if (res.ok) setDayRecords(res.records);
      else setDetayError(res.error);
    } catch (e) {
      if (no !== istekNo.current) return;
      setDetayError(e instanceof Error ? e.message : "Kayıtlar alınamadı.");
    }
  }

  function kapat() {
    istekNo.current++; // uçuşta olan isteğin sonucu artık uygulanmasın
    setDetay(null);
    setDayRecords(null);
    setDetayError(null);
  }

  const counts = useMemo(() => {
    if (!tl) return totalCounts;
    const c: Record<AlarmTip, number> = { TURNIKESIZ_CIKIS: 0, KART_BASMA: 0, TURNIKE_ATLAMA: 0 };
    for (const r of rows) if (r.unvan === tl) c[r.tip]++;
    return c;
  }, [rows, tl, totalCounts]);

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.unvan).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () => rows.filter((r) => aktif[r.tip] && (!tl || r.unvan === tl)),
    [rows, aktif, tl]
  );

  const columns: Column<AlarmRow>[] = [
    {
      key: "tip",
      header: "Alarm",
      cell: (r) => <span className={`pill ${TON[r.tip].pill}`}>{r.tipLabel}</span>,
      sortValue: (r) => r.tipLabel,
    },
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
      cell: (r) => <span className="tabular-nums">{r.tarih}</span>,
      sortValue: (r) => r.tarih.split(".").reverse().join("-"),
    },
    {
      key: "saat",
      header: "Saat",
      align: "center",
      cell: (r) => <span className="tabular-nums">{r.saat}</span>,
      sortValue: (r) => r.saat,
    },
    {
      key: "okuyucu",
      header: "Kapı / Okuyucu",
      cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{r.okuyucu}</span>,
      sortValue: (r) => r.okuyucu,
    },
    {
      key: "detay",
      header: "Açıklama",
      cell: (r) => (
        <span className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>
          {r.detay}
        </span>
      ),
    },
    {
      key: "tl",
      header: "Ünvan",
      cell: (r) => <span style={{ color: "var(--tx-secondary)" }}>{r.unvan}</span>,
      sortValue: (r) => r.unvan,
    },
  ];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Turnikesiz Çıkış" value={counts.TURNIKESIZ_CIKIS} icon="🚪" tone="red" />
        <StatCard label="Kart Basma Şüphesi" value={counts.KART_BASMA} icon="🪪" tone="amber" />
        <StatCard label="Turnike Atlama" value={counts.TURNIKE_ATLAMA} icon="⚠️" tone="violet" />
      </div>

      {/* Tip açma/kapama — native checkbox yerine basılabilir çipler; accent
          rengi tarayıcıya bırakıldığında temayla uyumsuz kalıyordu. */}
      <div className="nc-toolbar mb-3">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--tx-muted)" }}>
          Alarm Tipi
        </span>
        <div className="seg" role="group" aria-label="Alarm tipi filtresi">
          {(Object.keys(ALARM_TIPLERI) as AlarmTip[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={aktif[t]}
              onClick={() => setAktif((s) => ({ ...s, [t]: !s[t] }))}
              className={`seg-item ${aktif[t] ? "seg-on" : ""}`}
            >
              {ALARM_TIPLERI[t]}
              <span className="ml-1.5 tabular-nums" style={{ opacity: 0.75 }}>
                {counts[t]}
              </span>
            </button>
          ))}
        </div>
        <span className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>
          Satıra tıkla = o kişinin o günündeki tüm geçiş kayıtları
        </span>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.okuyucu} ${r.tarih}`}
        searchPlaceholder="Ad, soyad, sicil veya okuyucu ara..."
        filters={[{ label: "Tüm Ünvanlar", options: tlList, value: tl, onChange: setTl }]}
        onRowClick={ac}
        emptyText="Seçili filtrelerde alarm yok."
        density="dense"
        pageSize={150}
      />

      {detay && (
        <Modal
          baslik={detay.adSoyad}
          altBaslik={`${detay.tarih} vardiya günü · Sicil ${detay.sicil} · ${detay.unvan}`}
          onClose={kapat}
          genislik={660}
          footer={
            <button onClick={kapat} className="btn-ghost px-5" style={{ height: 34 }}>
              Kapat
            </button>
          }
        >
          {/* Alarmın kendisi */}
          <div
            className="mb-4 p-3.5"
            style={{
              background: TON[detay.tip].bg,
              border: `1px solid ${TON[detay.tip].edge}`,
              borderRadius: "var(--r-xs)",
            }}
          >
            <div className="text-[12.5px] font-semibold" style={{ color: TON[detay.tip].fg }}>
              {detay.tipLabel}
            </div>
            <div className="mt-0.5 text-[11.5px] leading-relaxed" style={{ color: "var(--tx-secondary)" }}>
              {detay.detay}
            </div>
            <div className="mt-1.5 text-[11px] tabular-nums" style={{ color: "var(--tx-secondary)" }}>
              {detay.saat} · {detay.okuyucu}
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2">
            <span aria-hidden className="h-3 w-[3px] rounded-full" style={{ background: "var(--ac-sky)" }} />
            <span className="text-[12.5px] font-semibold" style={{ color: "var(--tx-primary)" }}>
              O Günün Tüm Geçiş Kayıtları
              {dayRecords && (
                <span className="ml-1.5 font-normal tabular-nums" style={{ color: "var(--tx-secondary)" }}>
                  ({dayRecords.length})
                </span>
              )}
            </span>
          </div>

          {detayError ? (
            <Notice ton="danger">{detayError}</Notice>
          ) : dayRecords === null ? (
            /* Yükleniyor — iskelet satırlar, "yükleniyor" metninden daha az sıçratır */
            <div className="space-y-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skel h-7" />
              ))}
            </div>
          ) : dayRecords.length === 0 ? (
            <p className="py-4 text-center text-xs" style={{ color: "var(--tx-secondary)" }}>
              Bu güne ait başka geçiş kaydı bulunamadı.
            </p>
          ) : (
            <div className="glass-table overflow-x-auto">
              <table className="tbl tbl-dense">
                <thead>
                  <tr>
                    {["Saat", "Okuyucu", "Alan", "Yön"].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayRecords.map((rec, i) => {
                    // Alarmı doğuran satırı vurgula — kullanıcının aradığı an bu.
                    const vurgu = rec.saat === detay.saat;
                    return (
                      <tr key={i} className={vurgu ? "row-info" : undefined}>
                        <td
                          className="tabular-nums font-medium"
                          style={{ color: vurgu ? "var(--ac-sky)" : "var(--tx-primary)" }}
                        >
                          {rec.saat}
                        </td>
                        <td>{rec.okuyucu}</td>
                        <td style={{ color: "var(--tx-secondary)" }}>{rec.alan}</td>
                        <td style={{ color: "var(--tx-secondary)" }}>{rec.yon}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
