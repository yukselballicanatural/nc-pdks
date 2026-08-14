// Kaynak: pdks_app_stabil_v8_4.py satır 1176 / 1286 (calc_shifts, record_shift_date içindeki
// tekrarlanan kural): gece vardiyasındaki biri için saat 12:00'den önceki kayıtlar bir
// önceki günün vardiyasına sayılır. Tarih-only (saat/dakika sıfırlanmış) Date döner.

export function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Bir kaydın hangi vardiya (mesai) gününe ait olduğunu döner. */
export function mesaiGunu(dt: Date, gece: boolean): Date {
  const gun = dateOnly(dt);
  return gece && dt.getHours() < 12 ? addDays(gun, -1) : gun;
}

/** dd.MM.yyyy formatı — Python'daki strftime("%d.%m.%Y") karşılığı, shifts anahtarı. */
export function formatGs(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}
