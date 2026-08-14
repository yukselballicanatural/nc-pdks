import { loadPdksData } from "@/lib/data/loadPdks";
import PageHeader from "@/components/ui/PageHeader";
import DuzeltmelerTable, { type DuzeltmeRow } from "@/components/duzeltmeler/DuzeltmelerTable";
import { utcIsoToWallClock } from "@/lib/engine/tz";
import { formatGsHms } from "@/lib/engine/mesaiGunu";

export const dynamic = "force-dynamic";

export default async function DuzeltmelerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { corrections, personByS, tlFilter, session } = data;

  const rows: DuzeltmeRow[] = corrections
    .filter((c) => !tlFilter || personByS.get(c.sicil)?.takimLideri === tlFilter)
    .map((c) => ({
      key: `${c.sicil}::${c.tarih}`,
      sicil: c.sicil,
      adSoyad: c.ad_soyad || personByS.get(c.sicil)?.ad || c.sicil,
      tarih: c.tarih,
      neden: c.neden,
      origMin: Number(c.orig_min) || 0,
      yeniMin: Number(c.yeni_min) || 0,
      acik: c.acik,
      ts: formatGsHms(utcIsoToWallClock(c.ts)),
    }));

  return (
    <>
      <PageHeader
        title="Düzeltmeler"
        description="Manuel olarak düzeltilen gün kayıtları (izin, rapor, toplantı vb.)"
        showDateBar={false}
      />
      <div className="p-6">
        <DuzeltmelerTable rows={rows} canEdit={session?.role === "admin"} />
      </div>
    </>
  );
}
