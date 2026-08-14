import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { loadPdksData, visiblePeople } from "@/lib/data/loadPdks";
import { fetchZohoUsers } from "@/lib/db/queries/zohoUsers";
import { buildZohoMatchIndex, matchZohoUser } from "@/lib/matching/textMatch";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import PersonelTable, { type PersonelRow } from "@/components/personel/PersonelTable";

export const dynamic = "force-dynamic";

export default async function PersonelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/ozet");

  const sp = await searchParams;
  const [data, zoho] = await Promise.all([loadPdksData(sp), fetchZohoUsers()]);
  const { isGece, range, shifts, turnikeCountByS } = data;

  // Dönemdeki toplam kayıt sayısı (materyalize vardiya kayıtlarından).
  const counts = new Map<string, number>();
  for (const [key, sh] of shifts) {
    const sicil = key.split("::")[0];
    counts.set(sicil, (counts.get(sicil) ?? 0) + sh.cnt);
  }

  const index = buildZohoMatchIndex(zoho.raw);

  const rows: PersonelRow[] = visiblePeople(data).map((p) => {
    const m = matchZohoUser(p.sicil, p.ad, p.soyad, index);
    return {
      key: p.sicil,
      sicil: p.sicil,
      adSoyad: `${p.ad} ${p.soyad}`.trim() || p.sicil,
      takimLideri: p.takimLideri,
      unvan: p.unvan,
      bolum: p.bolum,
      firma: p.firma,
      vardiya: isGece(p.sicil) ? "Gece" : "Gündüz",
      kayitSayisi: counts.get(p.sicil) ?? 0,
      zohoTakmaAd: m?.full_name ?? null,
      zohoGercekAd: m?.original_agent_name ?? null,
      zohoEslesme: m?.matchedBy ?? null,
    };
  });

  const sicilEslesen = rows.filter((r) => r.zohoEslesme === "employment_no").length;
  const isimEslesen = rows.filter((r) => r.zohoEslesme === "name").length;
  const eslesmeyen = rows.filter((r) => r.zohoEslesme === null).length;

  return (
    <>
      <PageHeader
        title="Personel"
        description="Dönemde geçiş kaydı olan personel ve Zoho eşleşme durumu"
        range={range}
      />
      <div className="p-6">
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <StatCard label="Toplam Personel" value={rows.length} icon="👥" tone="teal" />
          <StatCard label="Sicil ile Eşleşen" value={sicilEslesen} icon="✅" tone="green" />
          <StatCard label="İsim ile Eşleşen" value={isimEslesen} icon="🔤" tone="amber" hint="Zoho'da Employment No boş" />
          <StatCard label="Eşleşmeyen" value={eslesmeyen} icon="❓" tone="slate" hint="Genelde satış dışı personel" />
        </div>
        <PersonelTable rows={rows} />
      </div>
    </>
  );
}
