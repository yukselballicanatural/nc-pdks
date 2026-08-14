import { loadPdksData } from "@/lib/data/loadPdks";
import { ALARM_TIPLERI } from "@/lib/engine/constants";
import { formatGs, formatHms } from "@/lib/engine/mesaiGunu";
import PageHeader from "@/components/ui/PageHeader";
import AlarmTable, { type AlarmRow } from "@/components/alarm/AlarmTable";

export const dynamic = "force-dynamic";

// Alarm açıklamaları uzun metinler; binlerce satır sayfayı megabaytlara çıkarıyor.
// En yeni N alarm gönderilir, geri kalanı için dönem daraltılır.
const MAX_ROWS = 1200;

export default async function PdksAlarmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { range, alarms, personByS, tlFilter } = data;

  const inRange = alarms.filter((a) => {
    if (a.mg < range.sd || a.mg > range.ed) return false;
    if (tlFilter && personByS.get(a.sicil)?.takimLideri !== tlFilter) return false;
    return true;
  });

  // Sayaçlar dönemin TAMAMI üzerinden hesaplanır; tablo kısaltılsa da doğru kalır.
  const totalCounts = {
    TURNIKESIZ_CIKIS: inRange.filter((a) => a.tip === "TURNIKESIZ_CIKIS").length,
    KART_BASMA: inRange.filter((a) => a.tip === "KART_BASMA").length,
    TURNIKE_ATLAMA: inRange.filter((a) => a.tip === "TURNIKE_ATLAMA").length,
  };

  const truncated = inRange.length > MAX_ROWS;

  const rows: AlarmRow[] = inRange
    .slice(-MAX_ROWS) // en yeni alarmlar
    .reverse()
    .map((a, i) => {
      const p = personByS.get(a.sicil);
      return {
        key: `${a.sicil}-${a.dt.getTime()}-${a.tip}-${i}`,
        tip: a.tip,
        tipLabel: ALARM_TIPLERI[a.tip],
        sicil: a.sicil,
        adSoyad: p ? `${p.ad} ${p.soyad}`.trim() || a.sicil : a.sicil,
        takimLideri: p?.takimLideri ?? "Bilinmiyor",
        tarih: formatGs(a.mg),
        saat: formatHms(a.dt),
        okuyucu: a.ok,
        detay: a.detay,
      };
    });

  return (
    <>
      <PageHeader
        title="PDKS Alarm"
        description="Turnikesiz çıkış, kart basma şüphesi ve turnike atlama tespitleri"
        range={range}
      />
      <div className="p-6">
        {truncated && (
          <p className="mb-3 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-200">
            Bu dönemde {inRange.length.toLocaleString("tr-TR")} alarm var; performans için en yeni{" "}
            {MAX_ROWS.toLocaleString("tr-TR")} tanesi listeleniyor (kartlardaki sayılar dönemin
            tamamını gösterir). Tamamını incelemek için dönemi daraltın.
          </p>
        )}
        <AlarmTable
          rows={rows}
          totalCounts={totalCounts}
          sd={range.sdParam}
          ed={range.edParam}
        />
      </div>
    </>
  );
}
