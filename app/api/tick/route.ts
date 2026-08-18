// Canlı nabız — açık duran sayfanın kendini güncel tutması için.
//
// NEDEN GEREKLİ: Vercel Hobby planında cron günde bir kez ve saat garantisi
// olmadan çalışıyor (bkz. vercel.json) — asıl anlık güncelleme yükü BU uç
// noktaya ve `after()`'a düşüyor. Cron yalnızca kimse sayfayı açık tutmazsa
// (gece boyunca) sabah ilk kişi girene kadar arada kalan boşluğu dolduran
// bir yedek. Bu uç noktayı tarayıcı düzenli aralıkla çağırıyor
// (bkz. components/nav/LiveSync.tsx): yeni turnike kaydı varsa hemen işleniyor ve
// istemci arayüzü tazeliyor. Böylece "anlık" davranış cron aralığına ve Vercel
// planına bağlı olmaktan çıkıyor.
//
// Ucuz: yapılacak iş yoksa autoSync kilidi bile almadan iki küçük sorguyla çıkar.
// Birden fazla sekme/kullanıcı aynı anda çağırsa da veritabanı kilidi yalnızca
// birinin hesaplamasına izin verir.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { autoSync } from "@/lib/sync/autoSync";
import { syncStatus } from "@/lib/sync/runSync";
import { dataVersion } from "@/lib/data/dataVersion";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST() {
  // Oturum şart: bu uç nokta hesaplama tetikliyor, dışarıya açık olmamalı.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });
  }

  try {
    // fullRebuild=false — tam yeniden hesaplama uzun sürer, onu cron sürdürür;
    // burada yalnızca yeni kayıtların artımlı işlenmesi yapılır.
    const rapor = await autoSync({ budgetMs: 12_000, fullRebuild: false });
    const durum = await syncStatus();

    return NextResponse.json({
      // İstemci bu damganın değişmesine bakarak arayüzü tazeler. Sayfaların
      // kullandığı önbellek anahtarının aynısı olduğu için "ekranda görünen veri
      // değişti mi" sorusunun tam karşılığı: yeni turnike kaydını da, elle
      // girilen düzeltmeyi de, kapı ayarı değişikliğini de kapsıyor.
      surum: await dataVersion(),
      sonKayitNo: durum.lastSourceId,
      sonSenkronizasyon: durum.lastSyncAt,
      bekleyen: Math.max(0, durum.currentMaxSourceId - durum.lastSourceId),
      yenidenHesaplaniyor: durum.rebuilding,
      kurulumEksik: rapor.kurulumEksik,
      mesaj: durum.message,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kontrol başarısız." },
      { status: 500 }
    );
  }
}
