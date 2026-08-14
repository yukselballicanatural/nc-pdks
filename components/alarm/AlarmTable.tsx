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

const TONE: Record<AlarmTip, string> = {
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

  // Gün kayıtları talep üzerine çekilir (tümünü sayfayla göndermek HTML'i şişiriyordu).
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

  // TL filtresi yokken dönemin gerçek toplamları; filtre varken görünen satırlardan sayılır.
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
        <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs ${TONE[r.tip]}`}>{r.tipLabel}</span>
      ),
      sortValue: (r) => r.tipLabel,
    },
    { key: "sicil", header: "Sicil", cell: (r) => <span className="text-slate-500">{r.sicil}</span>, sortValue: (r) => Number(r.sicil) || r.sicil },
    { key: "adSoyad", header: "Ad Soyad", cell: (r) => <span className="font-medium">{r.adSoyad}</span>, sortValue: (r) => r.adSoyad },
    { key: "tarih", header: "Tarih", cell: (r) => r.tarih, sortValue: (r) => r.tarih.split(".").reverse().join("-") },
    { key: "saat", header: "Saat", align: "center", cell: (r) => <span className="tabular-nums">{r.saat}</span>, sortValue: (r) => r.saat },
    { key: "okuyucu", header: "Kapı / Okuyucu", cell: (r) => <span className="text-slate-400">{r.okuyucu}</span>, sortValue: (r) => r.okuyucu },
    { key: "detay", header: "Açıklama", cell: (r) => <span className="text-xs text-slate-400">{r.detay}</span> },
    { key: "tl", header: "Takım Lideri", cell: (r) => <span className="text-slate-500">{r.takimLideri}</span>, sortValue: (r) => r.takimLideri },
  ];

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Turnikesiz Çıkış" value={counts.TURNIKESIZ_CIKIS} icon="🚨" tone="red" />
        <StatCard label="Kart Basma Şüphesi" value={counts.KART_BASMA} icon="👥" tone="amber" />
        <StatCard label="Turnike Atlama" value={counts.TURNIKE_ATLAMA} icon="⚠️" tone="violet" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4">
        {(Object.keys(ALARM_TIPLERI) as AlarmTip[]).map((t) => (
          <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={aktif[t]}
              onChange={(e) => setAktif((s) => ({ ...s, [t]: e.target.checked }))}
              className="h-4 w-4 accent-teal-500"
            />
            {ALARM_TIPLERI[t]}
          </label>
        ))}
      </div>

      <p className="mb-3 text-xs text-slate-500">
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

      {detay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetay(null)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-semibold">{detay.adSoyad}</div>
            <div className="mb-3 text-sm text-slate-400">
              {detay.tarih} vardiya günü · Sicil {detay.sicil} · {detay.takimLideri}
            </div>
            <div className={`mb-4 rounded p-3 text-sm ${TONE[detay.tip]}`}>
              <div className="mb-1 font-medium">{detay.tipLabel}</div>
              <div className="text-xs opacity-90">{detay.detay}</div>
            </div>

            <div className="mb-2 text-sm font-medium text-slate-300">
              O Günün Tüm Geçiş Kayıtları
              {dayRecords && <span className="ml-1 text-slate-500">({dayRecords.length})</span>}
            </div>
            {detayError ? (
              <p className="rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-300">
                {detayError}
              </p>
            ) : dayRecords === null ? (
              <p className="py-4 text-center text-sm text-slate-500">Kayıtlar yükleniyor...</p>
            ) : (
              <div className="overflow-hidden rounded border border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800 text-slate-400">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Saat</th>
                      <th className="px-2 py-1.5 text-left">Okuyucu</th>
                      <th className="px-2 py-1.5 text-left">Alan</th>
                      <th className="px-2 py-1.5 text-left">Yön</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRecords.map((rec, i) => (
                      <tr
                        key={i}
                        className={`border-t border-slate-800 ${rec.saat === detay.saat ? "bg-teal-500/10" : ""}`}
                      >
                        <td className="px-2 py-1 tabular-nums">{rec.saat}</td>
                        <td className="px-2 py-1">{rec.okuyucu}</td>
                        <td className="px-2 py-1 text-slate-400">{rec.alan}</td>
                        <td className="px-2 py-1 text-slate-400">{rec.yon}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={() => setDetay(null)}
              className="mt-4 w-full rounded-md border border-slate-700 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
