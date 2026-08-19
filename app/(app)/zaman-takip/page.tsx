import { loadPdksData } from "@/lib/data/loadPdks";
import { loadTrackerLog } from "@/lib/data/loadTrackerLog";
import PageHeader from "@/components/ui/PageHeader";
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
          <div
            className="mb-3 rounded-xl p-3 text-xs leading-relaxed"
            style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.28)",
              color: "var(--tx-secondary)",
            }}
          >
            <strong style={{ color: "var(--cl-danger)" }}>Zaman takip verisi okunamadı:</strong>{" "}
            {log.hata}
          </div>
        ) : !log.kullanilabilir ? (
          <div
            className="mb-3 rounded-xl p-3 text-xs leading-relaxed"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--tx-secondary)",
            }}
          >
            Bu dönemde hiç zaman takip kaydı yok.
          </div>
        ) : (
          <div
            className="mb-3 rounded-xl p-3 text-xs leading-relaxed"
            style={{
              background: "rgba(6,214,160,0.07)",
              border: "1px solid rgba(6,214,160,0.2)",
              color: "var(--tx-secondary)",
            }}
          >
            Dönemde <span style={{ color: "var(--tx-primary)" }}>{log.olaySayisi}</span> ham olay
            okundu, <span style={{ color: "var(--tx-primary)" }}>{rows.length}</span> oturuma
            dönüştürüldü.
            {log.eslesmeyenOlay > 0 && (
              <>
                {" "}
                <span style={{ color: "var(--cl-warn)" }}>
                  {log.eslesmeyenOlay} olay hiçbir sicile bağlanamadı
                </span>
                .
              </>
            )}
          </div>
        )}
        <ZamanTakipTable rows={rows} />
      </div>
    </>
  );
}
