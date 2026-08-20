import { redirect } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { autoSync } from "@/lib/sync/autoSync";
import { dataVersion } from "@/lib/data/dataVersion";
import Sidebar from "@/components/nav/Sidebar";
import LiveSync from "@/components/nav/LiveSync";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Bu sayfanın hangi veri sürümüyle çizildiği. LiveSync ilk kontrolünde bununla
  // karşılaştırma yapar; olmasa sayfa açılışında gelen yeni veri bir tur boyunca
  // ekrana yansımazdı.
  const surum = await dataVersion();

  // ÜÇÜNCÜ TETİKLEYİCİ (asıl yol /api/cron): yanıt gönderildikten SONRA çalışır,
  // sayfayı bekletmez. Cron gecikirse/çalışmazsa sistem kendini böyle toparlar.
  //
  // Ucuz: yapılacak iş yoksa iki küçük sorguyla çıkar. Eşzamanlı çalıştırmalar
  // veritabanı kilidiyle engellenir (bkz. lib/sync/autoSync.ts).
  //
  // fullRebuild=false — tam yeniden hesaplama uzun sürer, onu cron sürdürür;
  // burada yalnızca yeni gelen kayıtların artımlı işlenmesi yapılır.
  after(async () => {
    try {
      await autoSync({ budgetMs: 20_000, fullRebuild: false });
    } catch {
      // Sayfa görüntülemesini etkilememesi için sessizce yutuluyor;
      // hata durumu Senkronizasyon ekranında görünür.
    }
  });

  return (
    <div
      className="flex min-h-screen"
      style={{ color: "var(--tx-primary)" }}
    >
      <Suspense
        fallback={
          <div
            className="app-sidebar shrink-0"
            style={{
              background: "var(--sf-1)",
              borderRight: "1px solid var(--edge-soft)",
            }}
          />
        }
      >
        <Sidebar role={session.role} username={session.username} />
      </Suspense>
      <main className="min-w-0 flex-1">{children}</main>
      <LiveSync baslangicSurumu={surum} />
    </div>
  );
}
