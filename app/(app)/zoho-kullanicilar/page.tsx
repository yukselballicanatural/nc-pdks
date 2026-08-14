import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { loadPdksData } from "@/lib/data/loadPdks";
import { fetchZohoUsers } from "@/lib/db/queries/zohoUsers";
import { textNorm } from "@/lib/engine/textNorm";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import ZohoTable, { type ZohoRow } from "@/components/zoho/ZohoTable";

export const dynamic = "force-dynamic";

export default async function ZohoKullanicilarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/ozet");

  const sp = await searchParams;
  const [data, zoho] = await Promise.all([loadPdksData(sp), fetchZohoUsers()]);

  const pdksSicils = new Set(data.personByS.keys());
  const pdksNames = new Set([...data.personByS.values()].map((p) => textNorm(`${p.ad} ${p.soyad}`)));

  const rows: ZohoRow[] = zoho.rows.map((u) => ({
    key: u.id,
    fullName: u.fullName,
    originalAgentName: u.originalAgentName,
    employmentNo: u.employmentNo,
    email: u.email,
    role: u.role,
    status: u.status,
    startDate: u.startDate,
    seniority: u.seniority,
    region: u.region,
    pdksVar:
      (u.employmentNo && pdksSicils.has(u.employmentNo)) ||
      pdksNames.has(textNorm(u.originalAgentName)),
  }));

  const aktif = rows.filter((r) => r.status === "active").length;
  const sicilEksik = rows.filter((r) => !r.employmentNo).length;
  const pdksVar = rows.filter((r) => r.pdksVar).length;

  return (
    <>
      <PageHeader
        title="Zoho Kullanıcılar"
        description="Zoho CRM'den senkronize edilen kullanıcı listesi (salt-okunur)"
        showDateBar={false}
      />
      <div className="p-6">
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          <StatCard label="Toplam Kayıt" value={rows.length} icon="🌐" tone="teal" />
          <StatCard label="Aktif" value={aktif} icon="✅" tone="green" />
          <StatCard label="Sicil No Eksik" value={sicilEksik} icon="⚠️" tone="red" hint="İsim eşleştirmeye düşüyor" />
          <StatCard label="PDKS Kaydı Olan" value={pdksVar} icon="🔗" tone="amber" />
        </div>
        <ZohoTable rows={rows} />
      </div>
    </>
  );
}
