import { NextResponse } from "next/server";
import { autoSync } from "@/lib/sync/autoSync";

// Senkronizasyonun tetiklendiği tek uç nokta. Üç kaynaktan çağrılır (bkz.
// lib/sync/autoSync.ts başlığı): Supabase pg_net trigger'ı (asıl yol — veri
// geldiği anda), Vercel cron (günde bir, yedek), ve elle/test amaçlı
// x-sync-secret ile. Parçalı çalıştığı için tek turda bitmeyen iş sonraki
// turda kaldığı yerden sürer.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Yetki, üç yoldan biriyle:
 *   1. CRON_SECRET tanımlıysa Vercel `Authorization: Bearer <secret>` başlığını
 *      kendisi ekler — en güvenli yol, kurulması önerilir.
 *   2. x-sync-secret başlığı — Supabase'in pg_net trigger'ı (bkz.
 *      supabase/migrations/0008_realtime_webhook.sql) ve elle/test amaçlı
 *      çağrılar bunu kullanır.
 *   3. CRON_SECRET yoksa: Vercel'in kendi cron çağrıları
 *      (`user-agent: vercel-cron/...`). Böylece kullanıcı ek ortam değişkeni
 *      kurmadan da otomasyon çalışır.
 *
 * 3. yol bilinçli bir ödünç: uç nokta veri SİLMİYOR, yalnızca eksik hesabı
 * tamamlıyor ve veritabanı kilidi + tazelik kontrolü sayesinde tekrar tekrar
 * çağrılması boşa iş yapmıyor. Yine de CRON_SECRET kurmak tercih edilir.
 *
 * DİKKAT — burada bir hata yapılmıştı ve otomasyon sessizce hiç çalışmamıştı:
 * 3. yolun koşulu önce `!cronSecret && !syncSecret` idi. SYNC_SECRET tanımlı
 * olduğunda bu koşul hep false kalıyor, Vercel'in cron isteği hiçbir dala
 * uymuyor ve her turda 401 dönüyordu. Koşul artık yalnızca CRON_SECRET'e
 * bakıyor: SYNC_SECRET'in varlığı Vercel cron'unu dışlamıyor.
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
