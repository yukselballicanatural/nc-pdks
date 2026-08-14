// Kaynak: pdks_app_stabil_v8_4.py satır 67-80.
// UYARI (CLAUDE.md): bu sabitler şirketin gerçek vardiya politikasını yansıtıyor.
// Değiştirmeden önce kullanıcıya doğrulatılmalı — "iyileştirme" amaçlı dokunulmaz.

export const DEF_GECE_TL = ["Ahmed Anwar", "Joel Awudu", "Ahmed Ismaeel"];

export const G_NET = 450; // Gündüz net çalışma (dakika) = 7.5 saat
export const N_NET = 390; // Gece net çalışma (dakika) = 6.5 saat
export const G_MOLA = 90; // Gündüz beklenen mola (dakika)
export const N_MOLA = 90; // Gece beklenen mola (dakika)

// Aynı turnikede/aynı yönde bu süre içinde FARKLI sicillerin geçmesi "kart basma" şüphesi.
export const ALARM_KART_SN = 15;
// Aynı sicil/aynı yön/aynı turnike tekrar kaydı (calc_shifts'teki 60 sn kuralı ile aynı).
export const ALARM_DEDUP_SN = 60;
// calc_shifts / detect_buddy içindeki buddy-punch tekilleştirme eşiği (saniye).
export const BUDDY_DEDUP_SN = 60;

export const ALARM_TIPLERI = {
  TURNIKESIZ_CIKIS: "Turnikesiz Cikis",
  KART_BASMA: "Kart Basma Suphesi",
  TURNIKE_ATLAMA: "Turnike Atlama",
} as const;

export type AlarmTip = keyof typeof ALARM_TIPLERI;

export const REASONS = [
  "Yillik Izin",
  "Klinik/Hastane",
  "Toplanti",
  "Egitim",
  "Idari Izin",
  "Uzaktan Calisma",
  "Resmi Tatil",
  "Raporlu",
  "Bilinmiyor",
  "Diger",
];
