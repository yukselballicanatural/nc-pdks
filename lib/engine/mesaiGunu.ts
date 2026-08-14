// Kaynak: pdks_app_stabil_v8_4.py satır 1176 / 1286 (calc_shifts, record_shift_date içindeki
// tekrarlanan kural): gece vardiyasındaki biri için saat 12:00'den önceki kayıtlar bir
// önceki günün vardiyasına sayılır.
//
// DİKKAT: Tüm tarih/saat okumaları getUTC* ile yapılır — bkz. lib/engine/tz.ts
// (Date'in UTC alanları İstanbul duvar saatini taşır, sunucu TZ'sinden bağımsız).

export function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Bir kaydın hangi vardiya (mesai) gününe ait olduğunu döner. */
export function mesaiGunu(dt: Date, gece: boolean): Date {
  const gun = dateOnly(dt);
  return gece && dt.getUTCHours() < 12 ? addDays(gun, -1) : gun;
}

/** dd.MM.yyyy — Python'daki strftime("%d.%m.%Y") karşılığı, shifts anahtarı. */
export function formatGs(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
}

/** HH:mm:ss (duvar saati). */
export function formatHms(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** HH:mm (duvar saati). */
export function formatHm(d: Date): string {
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** dd.MM.yyyy HH:mm:ss */
export function formatGsHms(d: Date): string {
  return `${formatGs(d)} ${formatHms(d)}`;
}

const GUN_ADLARI = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

/** Kısa gün adı (Python'daki gn sözlüğünün karşılığı). */
export function gunAdi(d: Date): string {
  return GUN_ADLARI[d.getUTCDay()] ?? "";
}

/** Hafta içi mi (Python: weekday() < 5). */
export function isWeekday(d: Date): boolean {
  const day = d.getUTCDay(); // 0=Pazar, 6=Cumartesi
  return day !== 0 && day !== 6;
}
