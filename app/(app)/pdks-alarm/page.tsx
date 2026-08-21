import { loadPdksData } from "@/lib/data/loadPdks";
import { ALARM_TIPLERI } from "@/lib/engine/constants";
import { formatGs, formatHms } from "@/lib/engine/mesaiGunu";
import PageHeader from "@/components/ui/PageHeader";
import Notice, { Vurgu } from "@/components/ui/Notice";
import AlarmTable, { type AlarmRow } from "@/components/alarm/AlarmTable";

export const dynamic = "force-dynamic";

export default async function PdksAlarmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { range, alarms, alarmCounts, alarmTotal, alarmTruncated, personByS, tlFilter } = data;

  // Alarmlar en yeniden eskiye sıralı gelir ve sayı sınırlıdır (açıklama metinleri
  // hacimli); tip bazlı sayaçlar dönemin tamamı üzerinden ayrı hesaplanır.
  const rows: AlarmRow[] = alarms
    .filter((a) => !tlFilter || personByS.get(a.sicil)?.unvan === tlFilter)
    .map((a, i) => {
      const p = personByS.get(a.sicil);
      return {
        key: `${a.sicil}-${a.dt.getTime()}-${a.tip}-${i}`,
        tip: a.tip,
        tipLabel: ALARM_TIPLERI[a.tip],
        sicil: a.sicil,
        adSoyad: p ? `${p.ad} ${p.soyad}`.trim() || a.sicil : a.sicil,
        unvan: p?.unvan || "Bilinmiyor",
        tarih: formatGs(a.mg),
        saat: formatHms(a.dt),
        okuyucu: a.ok,
        detay: a.detay,
      };
    });

  const totalCounts = {
    TURNIKESIZ_CIKIS: alarmCounts.TURNIKESIZ_CIKIS ?? 0,
    KART_BASMA: alarmCounts.KART_BASMA ?? 0,
    TURNIKE_ATLAMA: alarmCounts.TURNIKE_ATLAMA ?? 0,
  };
  const truncated = alarmTruncated;

  return (
    <>
      <PageHeader
        title="PDKS Alarm"
        description="Turnikesiz çıkış, kart basma şüphesi ve turnike atlama tespitleri"
        range={range}
      />
      <div className="p-6">
        {truncated && (
          <Notice ton="warn" className="mb-3">
            Bu dönemde <Vurgu>{alarmTotal.toLocaleString("tr-TR")}</Vurgu> alarm var; performans
            için en yeni <Vurgu>{rows.length.toLocaleString("tr-TR")}</Vurgu> tanesi listeleniyor
            (kartlardaki sayılar dönemin tamamını gösterir). Tamamını incelemek için dönemi
            daraltın.
          </Notice>
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
