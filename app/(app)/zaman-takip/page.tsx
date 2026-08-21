import { loadPdksData } from "@/lib/data/loadPdks";
import { loadTrackerLog } from "@/lib/data/loadTrackerLog";
import PageHeader from "@/components/ui/PageHeader";
import Notice, { Vurgu } from "@/components/ui/Notice";
import ZamanTakipTable from "@/components/zamanTakip/ZamanTakipTable";
import type { TrackerLogRow } from "@/lib/data/loadTrackerLog";

export const dynamic = "force-dynamic";

export default async function ZamanTakipPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // loadPdksData yalnızca dönem + TL kapsamı için kullanılıyor; bu sayfanın
  // kendi verisi loadTrackerLog'dan geliyor.
  const data = await loadPdksData(sp);
  const { range, tlFilter } = data;

  const log = await loadTrackerLog(range);

  // TL modunda: sicili çözülmüş VE kendi ünvanına ait olmayan satırlar
  // gösterilmez. Sicili çözülemeyen (kimliği belirsiz) satırlar TL'ye hiç
  // gösterilmiyor — hangi ekibe ait olduğu doğrulanamadığı için başka bir
  // takımın kaydı olabilir.
  const rows: TrackerLogRow[] = tlFilter
    ? log.rows.filter((r) => r.unvan === tlFilter)
    : log.rows;

  return (
    <>
      <PageHeader
        title="Zaman Takip"
        description="Mola/klinik/toplantı/yemek uygulamasından gelen kayıtlar — kim ne yapmış"
        range={range}
      />
      <div className="p-6">
        {log.hata ? (
          <Notice ton="danger" baslik="Zaman takip verisi okunamadı" className="mb-3">
            {log.hata}
          </Notice>
        ) : !log.kullanilabilir ? (
          <Notice ton="info" className="mb-3">
            Bu dönemde hiç zaman takip kaydı yok.
          </Notice>
        ) : (
          <Notice ton="ok" className="mb-3">
            Dönemde <Vurgu>{log.olaySayisi}</Vurgu> ham olay okundu, <Vurgu>{rows.length}</Vurgu>{" "}
            oturuma dönüştürüldü.
            {log.eslesmeyenOlay > 0 && (
              <>
                {" "}
                <span style={{ color: "var(--cl-warn)", fontWeight: 600 }}>
                  {log.eslesmeyenOlay} olay hiçbir sicile bağlanamadı
                </span>
                .
              </>
            )}
          </Notice>
        )}
        <ZamanTakipTable rows={rows} />
      </div>
    </>
  );
}
