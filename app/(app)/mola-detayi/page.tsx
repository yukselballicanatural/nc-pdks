import { loadPdksData, visiblePeople } from "@/lib/data/loadPdks";
import { loadTrackerData } from "@/lib/data/loadTracker";
import { getEffectiveMola, getNet } from "@/lib/engine/summary";
import { addDays, formatGs, formatHm } from "@/lib/engine/mesaiGunu";
import { shiftKey } from "@/lib/engine/calcShifts";
import { araligiAcikla, type AciklananAralik } from "@/lib/tracker/araliklar";
import { dkp } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import MolaTable, { type MolaRow } from "@/components/mola/MolaTable";

export const dynamic = "force-dynamic";

function aralikMetni(a: Date, b: Date): string {
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

  // Tracker verisi olmasa da sayfa tam çalışır; yalnızca "neden" kolonu boş kalır.
  const tracker = await loadTrackerData(range);

  const rows: MolaRow[] = [];
  for (const p of visiblePeople(data)) {
    const gece = isGece(p.sicil);
    const adSoyad = `${p.ad} ${p.soyad}`.trim() || p.sicil;
    const aralar = tracker.bySicil.get(p.sicil) ?? [];

    for (let d = range.sd; d <= range.ed; d = addDays(d, 1)) {
      const gs = formatGs(d);
      const key = shiftKey(p.sicil, gs);
      const sh = shifts.get(key);
      if (!sh) continue;

      // Her turnike dışı aralık için tracker ne diyor? Saat çakışmasıyla
      // eşleştiriliyor — gün sınırı/gece vardiyası kuralları tekrarlanmıyor.
      const molaAraliklari = sh.outsideIntervals.map(([a, b]) => ({
        metin: aralikMetni(a, b),
        dk: Math.round((b.getTime() - a.getTime()) / 60000),
        aciklama: aralar.length > 0 ? araligiAcikla(a, b, aralar) : [],
      }));

      // Günün tamamı için tür bazında toplam (tablo kolonunda gösterilir).
      const gunToplam = new Map<string, number>();
      for (const m of molaAraliklari) {
        for (const a of m.aciklama) {
          gunToplam.set(a.etiket, (gunToplam.get(a.etiket) ?? 0) + a.dk);
        }
      }
      const nedenOzet: AciklananAralik[] = [...gunToplam.entries()]
        .map(([etiket, dk]) => ({ etiket, dk }))
        .sort((x, y) => y.dk - x.dk);

      const aciklananDk = nedenOzet.reduce((t, a) => t + a.dk, 0);
      const molaDk = getEffectiveMola(p.sicil, gs, shifts, corLookup);

      rows.push({
        key: `${p.sicil}-${gs}`,
        sicil: p.sicil,
        adSoyad,
        unvan: p.unvan || "Bilinmiyor",
        tarih: gs,
        vardiya: gece ? "Gece" : "Gündüz",
        net: getNet(p.sicil, gs, shifts, corLookup),
        mola: molaDk,
        toplam: sh.brut,
        calismaAraliklari: sh.pairs.map(([a, b]) => aralikMetni(a, b)),
        molaAraliklari,
        digerOkuyucular: otherReadersByKey.get(key) ?? [],
        digerDakika: sh.otherMin,
        nedenOzet,
        aciklananDk,
        aciklanmayanDk: Math.max(0, molaDk - aciklananDk),
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Mola Detayı"
        description="Turnike dışında geçirilen süreler, nedenleri ve gün içi çalışma aralıkları"
        range={range}
      />
      <div className="p-6">
        <MolaTable
          rows={rows}
          tracker={{
            kullanilabilir: tracker.kullanilabilir,
            hata: tracker.hata,
            olaySayisi: tracker.olaySayisi,
            eslesmeyenOlay: tracker.eslesmeyenOlay,
            eslesmeyenAdlar: tracker.eslesmeyenAdlar,
            kapanmamis: tracker.kapanmamis,
            kisiSayisi: tracker.bySicil.size,
          }}
        />
      </div>
    </>
  );
}
