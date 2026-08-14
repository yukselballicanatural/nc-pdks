import { loadTeamsData } from "@/lib/teams/loadTeams";
import { getSession } from "@/lib/auth/session";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import TakimlarPanel from "@/components/takimlar/TakimlarPanel";

export const dynamic = "force-dynamic";

export default async function TakimlarPage() {
  const [data, session] = await Promise.all([loadTeamsData(), getSession()]);
  const isAdmin = session?.role === "admin";

  const aktifTeams = data.teams.filter((t) => t.aktif);
  const liderVar = aktifTeams.filter((t) => t.liderAd).length;
  const kolayTeams = aktifTeams.filter((t) => t.kaynaklar.includes("kolay")).length;

  return (
    <>
      <PageHeader
        title="Takımlar"
        description="Kolay İK ve Zoho'daki takım yapısı — üyelik canlı türetilir, yönetici elle düzenleyebilir"
        showDateBar={false}
      />
      <div className="space-y-5 p-7">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Takım"
            value={aktifTeams.length}
            tone="teal"
            hint={`${kolayTeams} tanesi Kolay İK kaynaklı · ${liderVar} takımın lideri belli`}
          />
          <StatCard
            label="Takıma Yerleşen"
            value={data.toplamUye}
            tone="green"
            hint="Satış kapsamındaki personel"
          />
          <StatCard
            label="Takımsız"
            value={data.takimsiz.length}
            tone={data.takimsiz.length > 0 ? "amber" : "green"}
            hint="Hiçbir kaynakta takımı yok"
          />
          <StatCard
            label="Kolay'da Yok"
            value={data.kolaysiz}
            tone={data.kolaysiz > 0 ? "amber" : "green"}
            hint={`${data.zohosuz} kişi de Zoho'da yok`}
          />
        </div>

        <TakimlarPanel
          teams={data.teams}
          takimsiz={data.takimsiz}
          isAdmin={isAdmin}
          bosMu={data.bosMu}
          kolayBosMu={data.kolayBosMu}
          kolaySyncedAt={data.kolaySyncedAt}
        />
      </div>
    </>
  );
}
