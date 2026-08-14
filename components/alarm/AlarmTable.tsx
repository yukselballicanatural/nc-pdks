"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { type Column } from "@/components/ui/DataTable";
import StatCard from "@/components/ui/StatCard";
import { ALARM_TIPLERI, type AlarmTip } from "@/lib/engine/constants";
import { getAlarmDayRecordsAction } from "@/app/actions/alarmDetail";

export interface AlarmRow {
  key: string;
  tip: AlarmTip;
  tipLabel: string;
  sicil: string;
  adSoyad: string;
  takimLideri: string;
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

const TONE: Record<AlarmTip, { bg: string; border: string; color: string }> = {
  TURNIKESIZ_CIKIS: {
    bg: "rgba(248,113,113,0.08)",
    border: "rgba(248,113,113,0.2)",
    color: "#f87171",
  },
  KART_BASMA: {
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
    color: "#fbbf24",
  },
  TURNIKE_ATLAMA: {
    bg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.2)",
    color: "#a78bfa",
  },
};

// legacy string tone for DataTable cells (unchanged logic)
const TONE_CLASS: Record<AlarmTip, string> = {
  TURNIKESIZ_CIKIS: "text-red-300 bg-red-500/10",
  KART_BASMA: "text-amber-300 bg-amber-500/10",
  TURNIKE_ATLAMA: "text-violet-300 bg-violet-500/10",
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

  useEffect(() => {
    if (!detay) return;
    let cancelled = false;
    setDayRecords(null);
    setDetayError(null);
    getAlarmDayRecordsAction(detay.sicil, detay.tarih, sd, ed).then((res) => {
      if (cancelled) return;
      if (res.ok) setDayRecords(res.records);
      else setDetayError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [detay, sd, ed]);

  const counts = useMemo(() => {
    if (!tl) return totalCounts;
    const c: Record<AlarmTip, number> = { TURNIKESIZ_CIKIS: 0, KART_BASMA: 0, TURNIKE_ATLAMA: 0 };
    for (const r of rows) if (r.takimLideri === tl) c[r.tip]++;
    return c;
  }, [rows, tl, totalCounts]);

  const tlList = useMemo(
    () => [...new Set(rows.map((r) => r.takimLideri).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    [rows]
  );

  const filtered = useMemo(
    () => rows.filter((r) => aktif[r.tip] && (!tl || r.takimLideri === tl)),
    [rows, aktif, tl]
  );

  const columns: Column<AlarmRow>[] = [
    {
      key: "tip",
      header: "Alarm",
      cell: (r) => (
        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[r.tip]}`}>
          {r.tipLabel}
        </span>
      ),
      sortValue: (r) => r.tipLabel,
    },
    {
      key: "sicil",
      header: "Sicil",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{r.sicil}</span>,
      sortValue: (r) => Number(r.sicil) || r.sicil,
    },
    {
      key: "adSoyad",
      header: "Ad Soyad",
      cell: (r) => <span className="font-medium">{r.adSoyad}</span>,
      sortValue: (r) => r.adSoyad,
    },
    { key: "tarih", header: "Tarih", cell: (r) => r.tarih, sortValue: (r) => r.tarih.split(".").reverse().join("-") },
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
      cell: (r) => <span className="text-xs" style={{ color: "var(--tx-secondary)" }}>{r.detay}</span>,
    },
    {
      key: "tl",
      header: "Takım Lideri",
      cell: (r) => <span style={{ color: "var(--tx-muted)" }}>{r.takimLideri}</span>,
      sortValue: (r) => r.takimLideri,
    },
  ];

  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Turnikesiz Çıkış" value={counts.TURNIKESIZ_CIKIS} icon="🚨" tone="red" />
        <StatCard label="Kart Basma Şüphesi" value={counts.KART_BASMA} icon="👥" tone="amber" />
        <StatCard label="Turnike Atlama" value={counts.TURNIKE_ATLAMA} icon="⚠️" tone="violet" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4">
        {(Object.keys(ALARM_TIPLERI) as AlarmTip[]).map((t) => (
          <label
            key={t}
            className="flex cursor-pointer items-center gap-2 text-sm"
            style={{ color: "var(--tx-secondary)" }}
          >
            <input
              type="checkbox"
              checked={aktif[t]}
              onChange={(e) => setAktif((s) => ({ ...s, [t]: e.target.checked }))}
              className="h-4 w-4 accent-sky-400"
            />
            {ALARM_TIPLERI[t]}
          </label>
        ))}
      </div>

      <p className="mb-3 text-xs" style={{ color: "var(--tx-muted)" }}>
        🚨 Şüpheli geçişler. Satıra tıkla = o kişinin o günündeki TÜM geçiş kayıtlarını gör.
      </p>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.key}
        searchText={(r) => `${r.sicil} ${r.adSoyad} ${r.okuyucu} ${r.tarih}`}
        searchPlaceholder="Ad, soyad, sicil veya okuyucu ara..."
        filters={[{ label: "Tüm Takım Liderleri", options: tlList, value: tl, onChange: setTl }]}
        onRowClick={(r) => setDetay(r)}
        emptyText="Seçili filtrelerde alarm yok."
        pageSize={150}
      />

      {/* Modal */}
      {detay && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setDetay(null)}
        >
          <div
            className="modal-panel glass-modal relative max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[18px]"
              style={{
                background: `linear-gradient(90deg, transparent, ${TONE[detay.tip].color}80 50%, transparent)`,
              }}
            />

            <div className="text-lg font-semibold" style={{ color: "var(--tx-primary)" }}>
              {detay.adSoyad}
            </div>
            <div className="mb-4 text-sm" style={{ color: "var(--tx-secondary)" }}>
              {detay.tarih} vardiya günü · Sicil {detay.sicil} · {detay.takimLideri}
            </div>

            <div
              className="mb-5 rounded-xl p-4 text-sm"
              style={{
                background: TONE[detay.tip].bg,
                border: `1px solid ${TONE[detay.tip].border}`,
              }}
            >
              <div className="mb-1 font-semibold" style={{ color: TONE[detay.tip].color }}>
                {detay.tipLabel}
              </div>
              <div className="text-xs opacity-90" style={{ color: "var(--tx-secondary)" }}>
                {detay.detay}
              </div>
            </div>

            <div className="mb-3 text-sm font-semibold" style={{ color: "var(--tx-primary)" }}>
              O Günün Tüm Geçiş Kayıtları
              {dayRecords && (
                <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--tx-muted)" }}>
                  ({dayRecords.length})
                </span>
              )}
            </div>

            {detayError ? (
              <div
                className="rounded-xl p-3 text-sm"
                style={{
                  background: "var(--cl-danger-dim)",
                  border: "1px solid rgba(248,113,113,0.25)",
                  color: "var(--cl-danger)",
                }}
              >
                {detayError}
              </div>
            ) : dayRecords === null ? (
              <p className="py-6 text-center text-sm" style={{ color: "var(--tx-muted)" }}>
                Kayıtlar yükleniyor…
              </p>
            ) : (
              <div
                className="overflow-hidden rounded-xl"
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <table className="w-full text-xs">
                  <thead
                    style={{
                      background: "rgba(7,14,26,0.96)",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <tr>
                      {["Saat", "Okuyucu", "Alan", "Yön"].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-medium uppercase tracking-wider"
                          style={{ color: "var(--tx-secondary)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayRecords.map((rec, i) => (
                      <tr
                        key={i}
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                          background:
                            rec.saat === detay.saat
                              ? "rgba(56,189,248,0.08)"
                              : "transparent",
                        }}
                      >
                        <td
                          className="px-3 py-1.5 tabular-nums font-medium"
                          style={{ color: rec.saat === detay.saat ? "var(--ac-sky)" : "var(--tx-primary)" }}
                        >
                          {rec.saat}
                        </td>
                        <td className="px-3 py-1.5" style={{ color: "var(--tx-primary)" }}>{rec.okuyucu}</td>
                        <td className="px-3 py-1.5" style={{ color: "var(--tx-secondary)" }}>{rec.alan}</td>
                        <td className="px-3 py-1.5" style={{ color: "var(--tx-secondary)" }}>{rec.yon}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
