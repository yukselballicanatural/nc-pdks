// Kaynak: pdks_app_stabil_v8_4.py satır 1288-1359
// (get_net, get_effective_mola, get_effective_start/end, summary, get_missing_days).
// Birebir port.
import { G_MOLA, G_NET, N_MOLA, N_NET } from "./constants";
import { addDays, dateOnly, formatGs, gunOrani, isWeekday, zorunluCumartesi } from "./mesaiGunu";
import type { ShiftResult, SummaryResult } from "./types";
import { shiftKey } from "./calcShifts";

export interface Correction {
  sicil: string;
  tarih: string; // gs formatı, dd.MM.yyyy
  yeni: number;
  [k: string]: unknown;
}

export interface CorrectionLookup {
  get(sicil: string, gs: string): Correction | undefined;
}

export interface StartEndLookup {
  getStartDate(sicil: string): Date | null;
  getEndDate(sicil: string): Date | null;
}

/**
 * İzin sorgusu (Kolay İK'dan). Kullanıcı kararı:
 *   ÜCRETLİ izin (yıllık, raporlu, mazeret, evlilik) → o gün gereken günden
 *     düşülür, eksik saat doğurmaz. Kişi izinliyken turnikeden geçmemesi normal.
 *   ÜCRETSİZ izin → gereken gün olarak sayılmaya DEVAM eder, yani eksik yazar.
 *
 * Uygulanmayan izin verisi (lookup verilmezse) davranışı değiştirmez —
 * hesap eskisiyle birebir aynı kalır.
 */
export interface LeaveLookup {
  /** O gün ücretli izinli mi? */
  ucretliIzinli(sicil: string, gs: string): boolean;
  /** O gün ücretsiz izinli mi? */
  ucretsizIzinli(sicil: string, gs: string): boolean;
}

/** İzin verisi olmadığında kullanılan boş sorgu. */
export const NO_LEAVE: LeaveLookup = {
  ucretliIzinli: () => false,
  ucretsizIzinli: () => false,
};

/**
 * Turnike dışında geçmiş ama ÇALIŞMA sayılan dakika (time_tracker_events).
 *
 * KULLANICI KARARI (2026-08-18): çalışanın uygulamadan bildirdiği "Klinik" ve
 * "Toplantı" süreleri net çalışmaya eklenir; "Mola" ve "Yemek" mola olarak kalır.
 * Gerekçe: kişi işi için klinikte/toplantıdaysa eksik saatle cezalandırılmamalı.
 *
 * Kredi yalnızca turnike DIŞI aralıklarla çakışan kısmı kapsar (bkz.
 * lib/tracker/araliklar.ts → calismaKredisiDk); turnike içindeki süre zaten
 * sayıldığı için iki kez eklenmesi imkânsız.
 *
 * Lookup verilmezse hesap eskisiyle birebir aynı kalır.
 */
export interface WorkCreditLookup {
  /** O gün turnike dışında geçmiş ama çalışma sayılacak dakika. */
  krediDk(sicil: string, gs: string): number;
}

/** Tracker verisi olmadığında kullanılan boş sorgu. */
export const NO_CREDIT: WorkCreditLookup = { krediDk: () => 0 };

export function getNet(
  sicil: string,
  gs: string,
  shifts: Map<string, ShiftResult>,
  cor: CorrectionLookup,
  kredi: WorkCreditLookup = NO_CREDIT
): number {
  const c = cor.get(sicil, gs);
  // Elle düzeltme yöneticinin son sözü: üzerine tracker kredisi eklemek onun
  // girdiği değeri bozar, bu yüzden düzeltme varsa kredi uygulanmaz.
  if (c) return c.yeni ?? 0;
  const sh = shifts.get(shiftKey(sicil, gs));
  // KULLANICI KARARI (2026-08-20): turnike kaydı hiç olmasa da (sh yok) o gün
  // klinik/toplantı bildirimi varsa bu süre net çalışmaya sayılır — "turnike
  // dışında olsalar bile sistem eklemeli" talebi. kredi verilmezse (NO_CREDIT)
  // krediDk hep 0 döner, davranış eskisiyle birebir aynı kalır.
  if (!sh) return kredi.krediDk(sicil, gs);
  // Brütü aşamaz: aksi hâlde mola (= brüt - net) negatife düşerdi.
  return Math.min(sh.brut, sh.net + kredi.krediDk(sicil, gs));
}

/**
 * Düzeltme sonrası gösterilecek mola: brüt sabit kalır, net değiştiği için
 * mola = brüt - net olarak yeniden hesaplanır (düzeltme yoksa ham mola ile aynıdır).
 */
export function getEffectiveMola(
  sicil: string,
  gs: string,
  shifts: Map<string, ShiftResult>,
  cor: CorrectionLookup,
  kredi: WorkCreditLookup = NO_CREDIT
): number {
  const sh = shifts.get(shiftKey(sicil, gs));
  if (!sh) return 0;
  // Kredi verilirse net artar, dolayısıyla mola aynı miktarda azalır: klinik/
  // toplantı süresi "mola" hanesinden "çalışma" hanesine geçer.
  return Math.max(0, sh.brut - getNet(sicil, gs, shifts, cor, kredi));
}

/** Dönem içindeki etkili başlangıç = max(sd, start_date) */
export function getEffectiveStart(sicil: string, sd: Date, lookup: StartEndLookup): Date {
  const s = lookup.getStartDate(sicil);
  return s && s > sd ? s : sd;
}

/** Dönem içindeki etkili bitiş = min(ed, end_date) */
export function getEffectiveEnd(sicil: string, ed: Date, lookup: StartEndLookup): Date {
  const e = lookup.getEndDate(sicil);
  return e && e < ed ? e : ed;
}

export function summary(
  sicil: string,
  sd: Date,
  ed: Date,
  shifts: Map<string, ShiftResult>,
  cor: CorrectionLookup,
  lookup: StartEndLookup,
  isGeceOf: boolean,
  leave: LeaveLookup = NO_LEAVE,
  kredi: WorkCreditLookup = NO_CREDIT,
  /**
   * KULLANICI KARARI (2026-08-20): TL'ye bağlı satış personeli her 2
   * Cumartesi'den birinde çalışmak zorunda (bkz. zorunluCumartesi,
   * lib/engine/mesaiGunu.ts). Bu bayrak true ise zorunlu Cumartesi'ler de
   * hafta içi gibi "gereken güne" girer — çalışılmazsa eksik sayılır.
   */
  cumartesiZorunlu = false
): SummaryResult {
  const gece = isGeceOf;
  const std = gece ? N_NET : G_NET;
  const effSd = dateOnly(getEffectiveStart(sicil, sd, lookup));
  const effEd = dateOnly(getEffectiveEnd(sicil, ed, lookup));

  let net = 0;
  let cg = 0;
  let cpd = 0;
  let molaTotal = 0;
  let otherTotal = 0;
  let total = 0;
  let bg = 0;
  let bekDkToplam = 0;
  let bekBrutToplam = 0;
  let izinliGun = 0;
  let ucretsizIzinGun = 0;

  for (let d = effSd; d <= effEd; d = addDays(d, 1)) {
    const gs = formatGs(d);
    const n = getNet(sicil, gs, shifts, cor, kredi);
    const sh = shifts.get(shiftKey(sicil, gs));
    if (n > 0) {
      net += n;
      cg += 1;
      if (sh) {
        molaTotal += getEffectiveMola(sicil, gs, shifts, cor, kredi);
        otherTotal += sh.otherMin;
        total += sh.brut;
      } else {
        total += n + (gece ? N_MOLA : G_MOLA);
      }
      if (!isWeekday(d)) cpd += n;
    }

    // Tüm gün-bazlı kurallar (hafta içi / zorunlu Cumartesi / resmi tatil /
    // bayram arefesi) TEK bir yerden geliyor — bkz. gunOrani, mesaiGunu.ts.
    // oran: 1 = tam gün beklenir, 0.5 = yarım gün (arefe), 0 = beklenmez.
    const oran = gunOrani(d, cumartesiZorunlu);
    if (oran === 0) continue;

    // Hafta sonu/tatil gereken güne girmiyor, bu yüzden izin kontrolü
    // yalnızca gerekli (oran > 0) günler için anlamlı.
    if (n === 0 && leave.ucretliIzinli(sicil, gs)) {
      // Ücretli izinli ve gelmemiş: gereken günden düş — eksik yazmasın.
      // Geldiyse (n > 0) dokunmuyoruz; çalıştığı süre normal şekilde sayılır.
      izinliGun += 1;
      continue;
    }

    if (n === 0 && leave.ucretsizIzinli(sicil, gs)) {
      // Ücretsiz izin: gereken gün olarak sayılır, eksik yazar. Yalnızca
      // raporlama için işaretliyoruz.
      ucretsizIzinGun += 1;
    }

    bg += 1;
    bekDkToplam += std * oran;
    bekBrutToplam += (std + (gece ? N_MOLA : G_MOLA)) * oran;
  }

  const bek = bekDkToplam;
  const bekTotal = bekBrutToplam;

  return {
    gece,
    cg,
    bg,
    net,
    bek,
    eksik: bek - net,
    mola: molaTotal,
    other: otherTotal,
    total,
    bekTotal,
    totalEksik: bekTotal - total,
    cpd,
    izinliGun,
    ucretsizIzinGun,
    effSd,
    effEd,
  };
}

export interface MissingDay {
  date: Date;
  gs: string;
  cor: Correction | undefined;
  /**
   * Gelmeme sebebi izinse hangi tür. "ucretli" olanlar eksik saate girmez,
   * "ucretsiz" olanlar girer (bkz. summary).
   */
  izin: "ucretli" | "ucretsiz" | null;
  /** Bu gün zorunlu (mandatory) bir Cumartesi mi? bkz. zorunluCumartesi. */
  zorunluCumartesi: boolean;
  /** Beklenen çalışma oranı — 1 tam gün, 0.5 bayram arefesi. bkz. gunOrani. */
  oran: 0.5 | 1;
}

export function getMissingDays(
  sicil: string,
  sd: Date,
  ed: Date,
  shifts: Map<string, ShiftResult>,
  cor: CorrectionLookup,
  lookup: StartEndLookup,
  leave: LeaveLookup = NO_LEAVE,
  kredi: WorkCreditLookup = NO_CREDIT,
  cumartesiZorunlu = false
): MissingDay[] {
  const effSd = dateOnly(getEffectiveStart(sicil, sd, lookup));
  const effEd = dateOnly(getEffectiveEnd(sicil, ed, lookup));
  const missing: MissingDay[] = [];
  for (let d = effSd; d <= effEd; d = addDays(d, 1)) {
    const oran = gunOrani(d, cumartesiZorunlu);
    if (oran > 0) {
      const gs = formatGs(d);
      const n = getNet(sicil, gs, shifts, cor, kredi);
      if (n === 0) {
        const izin = leave.ucretliIzinli(sicil, gs)
          ? ("ucretli" as const)
          : leave.ucretsizIzinli(sicil, gs)
            ? ("ucretsiz" as const)
            : null;
        missing.push({
          date: d,
          gs,
          cor: cor.get(sicil, gs),
          izin,
          zorunluCumartesi: cumartesiZorunlu && zorunluCumartesi(d),
          oran: oran as 0.5 | 1,
        });
      }
    }
  }
  return missing;
}
