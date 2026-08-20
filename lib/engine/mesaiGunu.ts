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

/**
 * KULLANICI KARARI (2026-08-20): takım liderine bağlı satış personeli her 2
 * Cumartesi'den birinde çalışmak zorunda. Şirkette hangi Cumartesi'nin
 * "zorunlu" olduğuna dair somut bir referans tarih YOK (kullanıcı doğruladı,
 * "bilmiyorum, genel kural yeterli" dedi) — bu yüzden parite (çift/tek hafta)
 * aşağıdaki TEK sabite göre hesaplanıyor.
 *
 * KALİBRASYON UYARISI: gerçek roster'la çakışmayabilir. Yanlışsa SADECE bu
 * satır değiştirilir, tüm hesap otomatik düzelir — başka hiçbir yeri
 * değiştirmeye gerek yok.
 */
const ZORUNLU_CUMARTESI_REFERANS = Date.UTC(2026, 0, 3); // 3 Ocak 2026 Cumartesi = zorunlu kabul edildi

/** Bu Cumartesi (takvime göre, herkes için aynı) zorunlu çalışma günü mü? */
export function zorunluCumartesi(d: Date): boolean {
  if (d.getUTCDay() !== 6) return false;
  const hafta = Math.round(
    (dateOnly(d).getTime() - ZORUNLU_CUMARTESI_REFERANS) / (7 * 24 * 60 * 60 * 1000)
  );
  return hafta % 2 === 0;
}

/**
 * TÜRKİYE RESMİ TATİLLERİ — YILLIK GÜNCELLEME GEREKİR.
 *
 * KULLANICI KARARI (2026-08-20): resmi tatillerde kimseden çalışma beklenmez,
 * eksik saat yazmaz. Sabit tarihli millî bayramlar her yıl aynı; Ramazan/
 * Kurban Bayramı Hicri takvime göre kaydığı için HER YIL elle eklenmesi
 * gerekir — aksi hâlde yeni yılın bayram tarihleri "normal iş günü" gibi
 * eksik saat üretir. 2026 tarihleri doğrulandı (2026-08-20, resmî tatil
 * takvimi kaynakları). dd.MM.yyyy formatı formatGs ile aynı.
 *
 * Arefe günleri (yarım gün tatil) ayrı kümede — kullanıcı kararı: o günler
 * TAM gün değil, YARIM gün beklenir (bkz. gunOrani).
 */
const RESMI_TATIL_TAM_GUN = new Set<string>([
  "01.01.2026", // Yılbaşı
  "20.03.2026",
  "21.03.2026",
  "22.03.2026", // Ramazan Bayramı
  "23.04.2026", // Ulusal Egemenlik ve Çocuk Bayramı
  "01.05.2026", // Emek ve Dayanışma Günü
  "19.05.2026", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
  "27.05.2026",
  "28.05.2026",
  "29.05.2026",
  "30.05.2026", // Kurban Bayramı
  "15.07.2026", // Demokrasi ve Milli Birlik Günü
  "30.08.2026", // Zafer Bayramı
  "29.10.2026", // Cumhuriyet Bayramı
]);

const RESMI_TATIL_YARIM_GUN = new Set<string>([
  "19.03.2026", // Ramazan Bayramı arefesi
  "26.05.2026", // Kurban Bayramı arefesi
]);

/** Tam gün resmi tatil mi (bayram arefesi hariç)? */
export function tamGunResmiTatil(d: Date): boolean {
  return RESMI_TATIL_TAM_GUN.has(formatGs(d));
}

/** Bayram arefesi (yarım gün tatil) mi? */
export function yarimGunResmiTatil(d: Date): boolean {
  return RESMI_TATIL_YARIM_GUN.has(formatGs(d));
}

/**
 * Bir günün "beklenen çalışma" oranı — tüm gün-bazlı kurallar (hafta içi,
 * zorunlu Cumartesi, resmi tatil, bayram arefesi) buradan tek noktadan
 * yönetilir; summary.ts ve Günlük Detay AYNI fonksiyonu kullanır ki ikisi
 * asla birbirinden sapmasın.
 *
 * Öncelik sırası: resmi tatil HER ZAMAN 0'a ezer (bir bayram Cumartesi'ye
 * denk gelse bile), sonra arefe 0.5, sonra hafta içi/zorunlu Cumartesi 1.
 */
export function gunOrani(d: Date, cumartesiZorunluKisiMi: boolean): 0 | 0.5 | 1 {
  if (tamGunResmiTatil(d)) return 0;
  if (yarimGunResmiTatil(d)) return 0.5;
  if (isWeekday(d)) return 1;
  if (cumartesiZorunluKisiMi && zorunluCumartesi(d)) return 1;
  return 0;
}
