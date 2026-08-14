import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { syncStatus } from "@/lib/sync/runSync";
import PageHeader from "@/components/ui/PageHeader";
import SyncPanel from "@/components/sync/SyncPanel";

export const dynamic = "force-dynamic";

export default async function SenkronizasyonPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/ozet");

  const status = await syncStatus();

  return (
    <>
      <PageHeader
        title="Veri Senkronizasyonu"
        description="Turnike kayıtları bir kez hesaplanıp saklanır; sonrasında yalnızca yeni kayıtlar işlenir"
        showDateBar={false}
      />
      <div className="p-6">
        <SyncPanel initial={status} />
      </div>
    </>
  );
}
