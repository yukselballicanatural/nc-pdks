// Domain tipleri — pdks_app_stabil_v8_4.py'deki dict tabanlı kayıtların TS karşılığı.

export interface Personnel {
  sicil: string;
  ad: string;
  soyad: string;
  sistem_adi: string;
  takim_lideri: string;
  vardiya: "gece" | "gunduz" | "";
  start_date: string | null; // "YYYY-MM-DD"
  end_date: string | null;
  pozisyon: string;
  aktif: boolean;
  manual_match?: boolean;
}

/** Ham turnike/PDKS olay kaydı — pdks_app_stabil_v8_4.py'deki `rec` (satır ~871). */
export interface PdksRawEvent {
  sicil: string;
  ad: string;
  soyad: string;
  dt: Date;
  ok: string; // okuyucu adı
  firma: string;
  sube: string;
  dept: string;
  dir: string;
  idx: number;
}

/** _pair_giris_cikis'e verilen giriş/çıkış olayı (satır 1136). */
export interface DirectedEvent {
  dt: Date;
  in: boolean;
}

export type GirisCikisPair = [giris: Date, cikis: Date];

export interface ShiftResult {
  g: Date; // ilk giriş
  c: Date; // son çıkış
  gece: boolean;
  cnt: number;
  net: number; // net çalışma (dakika)
  brut: number; // brüt süre (dakika)
  fark: number; // net - std
  mg: Date; // mesai günü (vardiya günü)
  mola: number; // mola (dakika)
  pairs: GirisCikisPair[];
  outsideIntervals: [Date, Date][];
  others: { dt: Date; ok: string }[];
  otherMin: number;
}

export type AlarmTipVal = "TURNIKESIZ_CIKIS" | "KART_BASMA" | "TURNIKE_ATLAMA";

export interface Alarm {
  tip: AlarmTipVal;
  sicil: string;
  mg: Date;
  dt: Date;
  ok: string;
  detay: string;
  idx: number | null;
  refDt: Date | null;
}

export interface SummaryResult {
  gece: boolean;
  cg: number; // çalışılan gün sayısı
  bg: number; // beklenen gün (hafta içi)
  net: number;
  bek: number; // beklenen net (bg * std)
  eksik: number;
  mola: number;
  other: number;
  total: number; // brüt toplam
  bekTotal: number;
  totalEksik: number;
  cpd: number; // hafta sonu çalışılan net
  effSd: Date;
  effEd: Date;
}

/** ReaderConfig portu — okuyucu adı → kategori. */
export type ReaderArea = "work" | "break" | "ignore";
