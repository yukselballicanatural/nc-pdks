import { loadPdksData } from "@/lib/data/loadPdks";
import { formatGs, formatHms, mesaiGunu } from "@/lib/engine/mesaiGunu";
import { readerDirection } from "@/lib/engine/textNorm";
import PageHeader from "@/components/ui/PageHeader";
import LogTable, { type LogRow } from "@/components/log/LogTable";

export const dynamic = "force-dynamic";

const ALAN_ADI = { work: "Çalışma", break: "Mola/Dışı", ignore: "Yoksayılan" } as const;

// Ham kayıt sayısı 2 haftada 60 bini aşabiliyor; hepsini tarayıcıya göndermek
// sayfayı megabaytlara çıkarıyor. En yeni N kayıt gönderilir, kalanı için
// kullanıcı dönemi daraltır (uyarı arayüzde gösteriliyor).
const MAX_ROWS = 4000;

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { range, eventsInRange, personByS, readerConfig, isGece, buddyIdx, tlFilter } = data;

  const buddySet = new Set(buddyIdx);

  const matching = eventsInRange.filter(
    (r) => !tlFilter || personByS.get(r.sicil)?.takimLideri === tlFilter
  );
  const totalCount = matching.length;
  const truncated = totalCount > MAX_ROWS;

  const rows: LogRow[] = matching
    .slice(-MAX_ROWS) // en yeni kayıtlar
    .reverse()
    .map((r) => {
      const p = personByS.get(r.sicil);
      const dir = readerDirection(r.ok);
      return {
        key: `${r.idx}`,
        tarih: formatGs(mesaiGunu(r.dt, isGece(r.sicil))),
        saat: formatHms(r.dt),
        okuyucu: r.ok,
        alan: ALAN_ADI[readerConfig.getArea(r.ok)],
        yon: dir === "in" ? "Giriş" : dir === "out" ? "Çıkış" : "-",
        sicil: r.sicil,
        adSoyad: p ? `${p.ad} ${p.soyad}`.trim() || r.sicil : `${r.ad} ${r.soyad}`.trim() || r.sicil,
        takimLideri: p?.takimLideri ?? "Bilinmiyor",
        buddy: buddySet.has(r.idx),
      };
    });

  return (
    <>
      <PageHeader
        title="Geçiş Kayıtları"
        description={`Dönemdeki ham turnike/okuyucu kayıtları (${totalCount.toLocaleString("tr-TR")} kayıt)`}
        range={range}
      />
      <div className="p-6">
        {truncated && (
          <p className="mb-3 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-sm text-amber-200">
            Bu dönemde {totalCount.toLocaleString("tr-TR")} kayıt var; performans için en yeni{" "}
            {MAX_ROWS.toLocaleString("tr-TR")} kayıt gösteriliyor. Tamamını görmek için dönemi
            daraltın.
          </p>
        )}
        <LogTable rows={rows} showBuddyFlag />
      </div>
    </>
  );
}
