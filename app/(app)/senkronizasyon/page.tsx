import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { syncStatus } from "@/lib/sync/runSync";
import { autoSyncHealth } from "@/lib/sync/autoSync";
import PageHeader from "@/components/ui/PageHeader";
import SyncPanel from "@/components/sync/SyncPanel";

export const dynamic = "force-dynamic";

export default async function SenkronizasyonPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/ozet");

  const [status, health] = await Promise.all([syncStatus(), autoSyncHealth()]);

  return (
    <>
      <PageHeader
        title="Veri Senkronizasyonu"
        description="Otomatik çalışır — yeni turnike kayıtları geldiğinde sistem kendisi hesaplayıp ekler"
        showDateBar={false}
      />
      <div className="p-6">
        <SyncPanel initial={status} health={health} />
      </div>
    </>
  );
}
