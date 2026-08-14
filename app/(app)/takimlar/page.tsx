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
  const liderVar = aktifTeams.filter((t) => t.lider).length;

  return (
    <>
      <PageHeader
        title="Takımlar"
        description="Zoho'daki takım yapısı — üyelik canlı türetilir, yönetici elle düzenleyebilir"
        showDateBar={false}
      />
      <div className="space-y-5 p-7">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Takım" value={aktifTeams.length} tone="teal" hint={`${liderVar} takımın lideri atanmış`} />
          <StatCard label="Toplam Üye" value={data.toplamUye} tone="green" />
          <StatCard
            label="PDKS Eşleşmeyen"
            value={data.eslesmeyen}
            tone={data.eslesmeyen > 0 ? "amber" : "green"}
            hint="Zoho kaydı var, PDKS sicili bulunamadı"
          />
          <StatCard label="Takımsız Kişi" value={data.takimsiz.length} tone="violet" hint="Takım dışı birimler" />
        </div>

        <TakimlarPanel
          teams={data.teams}
          takimsiz={data.takimsiz}
          isAdmin={isAdmin}
          bosMu={data.bosMu}
        />
      </div>
    </>
  );
}
