import { NextResponse } from "next/server";
import { autoSync } from "@/lib/sync/autoSync";

// Zamanlanmış senkronizasyon. Vercel cron GET ile çağırır (bkz. vercel.json).
// Parçalı çalıştığı için tek turda bitmeyen iş sonraki turda kaldığı yerden sürer.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Yetki, üç yoldan biriyle:
 *   1. CRON_SECRET tanımlıysa Vercel `Authorization: Bearer <secret>` başlığını
 *      kendisi ekler — en güvenli yol, kurulması önerilir.
 *   2. x-sync-secret başlığı (elle/dış tetikleme, yerel test).
 *   3. CRON_SECRET yoksa: Vercel'in kendi cron çağrıları
 *      (`user-agent: vercel-cron/...`). Böylece kullanıcı ek ortam değişkeni
 *      kurmadan da otomasyon çalışır.
 *
 * 3. yol bilinçli bir ödünç: uç nokta veri SİLMİYOR, yalnızca eksik hesabı
 * tamamlıyor ve veritabanı kilidi + tazelik kontrolü sayesinde tekrar tekrar
 * çağrılması boşa iş yapmıyor. Yine de CRON_SECRET kurmak tercih edilir.
 *
 * DİKKAT — burada bir hata yapıldı ve otomasyon sessizce hiç çalışmadı: 3. yolun
 * koşulu önce `!cronSecret && !syncSecret` idi. Projede SYNC_SECRET (elle
 * tetikleme için) zaten tanımlı olduğundan bu koşul hep false kalıyor, Vercel'in
 * cron isteği hiçbir dala uymuyor ve her turda 401 dönüyordu. Koşul yalnızca
 * CRON_SECRET'e bakmalı: SYNC_SECRET'in varlığı Vercel cron'unu dışlamamalı.
 * Bu uç noktanın 401 dönmesi hiçbir yerde görünmediği için hata fark edilmedi.
 */
function authorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const syncSecret = process.env.SYNC_SECRET;

  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return true;
  if (syncSecret && req.headers.get("x-sync-secret") === syncSecret) return true;
  if (!cronSecret) {
    return (req.headers.get("user-agent") ?? "").toLowerCase().startsWith("vercel-cron");
  }
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  try {
    // Cron tam yeniden hesaplamayı da sürdürür (bütçe içinde kaç parça sığarsa).
    const rapor = await autoSync({ budgetMs: 45_000, fullRebuild: true });
    return NextResponse.json(rapor);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Senkronizasyon hatası" },
      { status: 500 }
    );
  }
}
