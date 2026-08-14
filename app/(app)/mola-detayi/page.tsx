import { loadPdksData, visiblePeople } from "@/lib/data/loadPdks";
import { getEffectiveMola, getNet } from "@/lib/engine/summary";
import { addDays, formatGs, formatHm } from "@/lib/engine/mesaiGunu";
import { shiftKey } from "@/lib/engine/calcShifts";
import { dkp } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import MolaTable, { type MolaRow } from "@/components/mola/MolaTable";

export const dynamic = "force-dynamic";

function aralik(a: Date, b: Date): string {
  const dk = (b.getTime() - a.getTime()) / 60000;
  return `${formatHm(a)} – ${formatHm(b)}  (${dkp(dk)})`;
}

export default async function MolaDetayiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { range, shifts, corLookup, isGece, otherReadersByKey } = data;

  const rows: MolaRow[] = [];
  for (const p of visiblePeople(data)) {
    const gece = isGece(p.sicil);
    const adSoyad = `${p.ad} ${p.soyad}`.trim() || p.sicil;
    for (let d = range.sd; d <= range.ed; d = addDays(d, 1)) {
      const gs = formatGs(d);
      const key = shiftKey(p.sicil, gs);
      const sh = shifts.get(key);
      if (!sh) continue;
      rows.push({
        key: `${p.sicil}-${gs}`,
        sicil: p.sicil,
        adSoyad,
        unvan: p.unvan || "Bilinmiyor",
        tarih: gs,
        vardiya: gece ? "Gece" : "Gündüz",
        net: getNet(p.sicil, gs, shifts, corLookup),
        mola: getEffectiveMola(p.sicil, gs, shifts, corLookup),
        toplam: sh.brut,
        calismaAraliklari: sh.pairs.map(([a, b]) => aralik(a, b)),
        molaAraliklari: sh.outsideIntervals.map(([a, b]) => aralik(a, b)),
        digerOkuyucular: otherReadersByKey.get(key) ?? [],
        digerDakika: sh.otherMin,
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Mola Detayı"
        description="Turnike dışında geçirilen süreler ve gün içi çalışma aralıkları"
        range={range}
      />
      <div className="p-6">
        <MolaTable rows={rows} />
      </div>
    </>
  );
}
