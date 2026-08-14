// ZAMAN DİLİMİ SÖZLEŞMESİ (önemli — bozulursa tüm hesaplama sessizce kayar)
//
// Supabase `turnike_gecisler.event_time` gerçek UTC olarak saklanıyor
// (doğrulandı: raw 07:00 UTC = 10:00 İstanbul, Zoho'daki "Istanbul 10:00 - 18:30"
// vardiyasının başlangıcıyla birebir uyuşuyor).
//
// Orijinal Python uygulaması İstanbul'daki bir makinede naive local datetime ile
// çalışıyordu, yani tüm iş kuralları (gece vardiyası 12:00 sınırı, gün sınırları,
// gösterilen saatler) İSTANBUL DUVAR SAATİ üzerinden tanımlı.
//
// Sunucu zaman dilimine bağımlı olmamak için (Vercel UTC'de çalışır, bu makine
// İstanbul'da) sistemdeki TÜM Date nesneleri şu sözleşmeye uyar:
//
//   >>> Date'in UTC alanları (getUTCHours, getUTCDate, ...) İstanbul duvar
//   >>> saatini verir. Yerel getter'lar (getHours, getDate) ASLA kullanılmaz.
//
// Bu yüzden veri sınırında epoch +3 saat kaydırılır. Süre hesapları saf epoch
// aritmetiği olduğu için bu kaydırmadan etkilenmez (iki taraf da aynı kayar).
//
// İstanbul 2016'dan beri DST uygulamıyor, sabit UTC+3 — bu yüzden sabit offset
// güvenli ve deterministik.

export const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

/** UTC ISO string -> İstanbul duvar saatini UTC alanlarında taşıyan Date. */
export function utcIsoToWallClock(iso: string): Date {
  return new Date(new Date(iso).getTime() + ISTANBUL_OFFSET_MS);
}

/** Duvar saati Date -> gerçek UTC ISO (Supabase sorgu sınırları için). */
export function wallClockToUtcIso(d: Date): string {
  return new Date(d.getTime() - ISTANBUL_OFFSET_MS).toISOString();
}

/** "YYYY-MM-DD" -> o günün 00:00'ı (duvar saati sözleşmesinde). */
export function parseDateParam(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date -> "YYYY-MM-DD" (URL parametresi / input[type=date] için). */
export function toDateParam(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

/** Şu anki İstanbul duvar saati. */
export function nowWallClock(): Date {
  return new Date(Date.now() + ISTANBUL_OFFSET_MS);
}
