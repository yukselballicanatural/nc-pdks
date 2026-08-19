// Verinin "sürümü" — dönem önbelleğinin tazeliğini örnekler arası doğru tutar.
//
// SORUN: periodCache süreç-içi bir Map. Vercel'de aynı anda birden fazla sunucu
// örneği çalışıyor. Senkronizasyon A örneğinde koştuğunda invalidateAll() yalnızca
// A'nın belleğini temizliyor; sizin sayfanızı B örneği sunuyorsa B, TTL süresi
// (60 sn) boyunca senkronizasyondan ÖNCEKİ veriyi göstermeye devam ediyordu.
// Kullanıcının "veriler anlık değil" şikâyetinin ikinci nedeni buydu.
//
// ÇÖZÜM: önbellek anahtarına veritabanından okunan bir sürüm damgası eklemek.
// Damga değiştiğinde eski anahtar artık hiçbir örnekte tutmaz — hangi örneğin
// senkronize ettiği önemsiz hale gelir. Bu, TTL'e güvenmekten farklı: TTL "en
// fazla ne kadar eski olabilir" derken, damga "değiştiyse hemen tazele" der.
//
// Maliyet: sayfa isteği başına iki küçük sorgu. React `cache()` ile sarıldığı
// için tek istekte birden çok çağrı tek sorguya iner.
import "server-only";
import { cache } from "react";
import { supabaseServer } from "../db/supabaseServer";

interface SyncStateRow {
  last_source_id: number | null;
  last_sync_at: string | null;
  config_version: string | null;
}

/**
 * Veriyi değiştiren her şeyi kapsayan kısa bir damga.
 *
 * - `last_source_id` / `last_sync_at` / `config_version`: senkronizasyonun
 *   yazdığı her şey (yeni turnike kayıtları, kapı kuralı değişikliği sonrası
 *   yeniden hesaplama, Kolay İK tazelemesi).
 * - Düzeltmeler: `ts`'in en yenisi eklemeyi/güncellemeyi, `count` ise SİLMEYİ
 *   yakalar. Silme `ts`'i geriye götürmediği için ikisi birlikte gerekli.
 *
 * Hata durumunda sabit bir değer döner: davranış eski haline (yalnızca TTL)
 * düşer, sayfa çalışmaya devam eder — durum ekranı zaten hatayı gösterir.
 */
export const dataVersion = cache(async function dataVersion(): Promise<string> {
  const sb = supabaseServer();
  try {
    const [stateRes, corRes, trackerRes] = await Promise.all([
      sb
        .from("pdks_sync_state")
        .select("last_source_id, last_sync_at, config_version")
        .eq("id", 1)
        .maybeSingle(),
      sb
        .from("corrections")
        .select("ts", { count: "exact" })
        .order("ts", { ascending: false })
        .limit(1),
      // time_tracker_events sync tablosuna hiç yazmıyor — Mola Detayı/Günlük
      // Detay bunu her istekte CANLI okuyor (bkz. lib/data/loadTracker.ts).
      // Ama dış katmandaki bu önbellek anahtarı bunu bilmiyordu: yeni bir
      // klinik/toplantı kaydı geldiğinde last_source_id/last_sync_at
      // değişmediği için damga aynı kalıyor ve 60 sn'lik TTL boyunca eski
      // (kredisiz) sonuç sunulmaya devam ediyordu. En yeni kaydın sayısı +
      // zaman damgası bunu da kapsıyor.
      sb
        .from("time_tracker_events")
        .select("occurred_at", { count: "exact" })
        .order("occurred_at", { ascending: false })
        .limit(1),
    ]);

    const s = (stateRes.data ?? null) as unknown as SyncStateRow | null;
    const corRows = (corRes.data ?? []) as unknown as { ts: string | null }[];
    const trackerRows = (trackerRes.data ?? []) as unknown as { occurred_at: string | null }[];

    return [
      s?.last_source_id ?? 0,
      s?.last_sync_at ?? "",
      s?.config_version ?? "",
      corRes.count ?? 0,
      corRows[0]?.ts ?? "",
      trackerRes.count ?? 0,
      trackerRows[0]?.occurred_at ?? "",
    ].join("~");
  } catch {
    return "?";
  }
});
