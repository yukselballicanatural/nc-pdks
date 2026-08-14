import { loadPdksData, paddedRange } from "@/lib/data/loadPdks";
import { formatGs, formatHms, mesaiGunu } from "@/lib/engine/mesaiGunu";
import { readerDirection } from "@/lib/engine/textNorm";
import { utcIsoToWallClock } from "@/lib/engine/tz";
import { fetchRecentRawRows } from "@/lib/db/queries/rawEvents";
import PageHeader from "@/components/ui/PageHeader";
import LogTable, { type LogRow } from "@/components/log/LogTable";

export const dynamic = "force-dynamic";

const ALAN_ADI = { work: "Çalışma", break: "Mola/Dışı", ignore: "Yoksayılan" } as const;

// Ham kayıt sayısı 2 haftada 60 bini aşabiliyor; en yeni N kayıt gösterilir
// (veritabanı tarafında sınırlanır), kalanı için kullanıcı dönemi daraltır.
const MAX_ROWS = 4000;

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { range, personByS, readerConfig, isGece, buddy, tlFilter } = data;

  const padded = paddedRange(range);
  const { rows: rawRows, total } = await fetchRecentRawRows(padded.start, padded.end, MAX_ROWS);

  // Buddy işaretlemesi: (sicil, zaman) çifti üzerinden.
  const buddySet = new Set(buddy.map((b) => `${b.sicil}::${b.dt.getTime()}`));

  const rows: LogRow[] = [];
  for (const r of rawRows) {
    const p = personByS.get(r.sicil_no);
    if (tlFilter && p?.unvan !== tlFilter) continue;

    const dt = utcIsoToWallClock(r.event_time);
    const mg = mesaiGunu(dt, isGece(r.sicil_no));
    if (mg < range.sd || mg > range.ed) continue;

    const dir = readerDirection(r.giris_kapisi);
    rows.push({
      key: `${r.source_id}`,
      tarih: formatGs(mg),
      saat: formatHms(dt),
      okuyucu: r.giris_kapisi,
      alan: ALAN_ADI[readerConfig.getArea(r.giris_kapisi)],
      yon: dir === "in" ? "Giriş" : dir === "out" ? "Çıkış" : "-",
      sicil: r.sicil_no,
      adSoyad: p
        ? `${p.ad} ${p.soyad}`.trim() || r.sicil_no
        : `${r.ad ?? ""} ${r.soyad ?? ""}`.trim() || r.sicil_no,
      unvan: p?.unvan || "Bilinmiyor",
      buddy: buddySet.has(`${r.sicil_no}::${dt.getTime()}`),
    });
  }

  const truncated = total > MAX_ROWS;

  return (
    <>
      <PageHeader
        title="Geçiş Kayıtları"
        description={`Dönemdeki ham turnike/okuyucu kayıtları (${total.toLocaleString("tr-TR")} kayıt)`}
        range={range}
      />
      <div className="p-6">
        {truncated && (
          <p
            className="mb-3 rounded-xl p-2.5 text-sm"
            style={{
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.25)",
              color: "#fbbf24",
            }}
          >
            Bu dönemde {total.toLocaleString("tr-TR")} kayıt var; performans için en yeni{" "}
            {MAX_ROWS.toLocaleString("tr-TR")} kayıt gösteriliyor. Tamamını görmek için dönemi
            daraltın.
          </p>
        )}
        <LogTable rows={rows} showBuddyFlag />
      </div>
    </>
  );
}
