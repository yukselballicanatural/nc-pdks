import { loadPdksData, visiblePeople } from "@/lib/data/loadPdks";
import { summary, getMissingDays } from "@/lib/engine/summary";
import { gunAdi } from "@/lib/engine/mesaiGunu";
import PageHeader from "@/components/ui/PageHeader";
import OzetTable, { type OzetRow } from "@/components/ozet/OzetTable";

export const dynamic = "force-dynamic";

export default async function OzetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await loadPdksData(sp);
  const { range, shifts, corLookup, startEndLookup, isGece, turnikeCountByS, leaveLookup, izinVerisiVar } =
    data;

  const rows: OzetRow[] = visiblePeople(data).map((p) => {
    const gece = isGece(p.sicil);
    const s = summary(p.sicil, range.sd, range.ed, shifts, corLookup, startEndLookup, gece, leaveLookup);
    const missing = getMissingDays(
      p.sicil,
      range.sd,
      range.ed,
      shifts,
      corLookup,
      startEndLookup,
      leaveLookup
    );
    return {
      sicil: p.sicil,
      adSoyad: `${p.ad} ${p.soyad}`.trim() || p.sicil,
      unvan: p.unvan || "Bilinmiyor",
      bolum: p.bolum,
      vardiya: gece ? "GECE" : "GUNDUZ",
      gerekenGun: s.bg,
      izinliGun: s.izinliGun,
      ucretsizIzinGun: s.ucretsizIzinGun,
      gelinenGun: s.cg,
      turnikeIci: s.net,
      turnikeDisi: s.mola,
      toplamSure: s.total,
      beklenenNet: s.bek,
      netFark: -s.eksik, // eksik>0 => negatif fark
      hafta: s.cpd,
      turnikeKaydi: turnikeCountByS.get(p.sicil) ?? 0,
      // Ücretli izinli günler gereken günden düşüldüğü için eksik listesinde
      // görünmemeli; ücretsiz izin görünür ve sebebi etiketlenir.
      eksikGunler: missing
        .filter((m) => m.izin !== "ucretli")
        .map((m) => ({ gs: m.gs, gun: gunAdi(m.date), izin: m.izin })),
    };
  });

  return (
    <>
      <PageHeader
        title="Özet"
        description="Dönem bazında kişi başı çalışma süresi ve eksik/fazla durumu"
        range={range}
      />
      <div className="p-6">
        <OzetTable rows={rows} izinVerisiVar={izinVerisiVar} />
      </div>
    </>
  );
}
