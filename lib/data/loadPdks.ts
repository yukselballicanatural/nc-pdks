// Tüm sayfaların paylaştığı tek veri giriş noktası.
//
// ÖNEMLİ: Burada ARTIK ham turnike_gecisler taranmıyor. Sonuçlar senkronizasyon
// sırasında bir kez hesaplanıp pdks_shifts / pdks_alarms / pdks_buddy /
// pdks_personnel_cache tablolarına yazılıyor (bkz. lib/sync/runSync.ts); sayfalar
// dönem başına yalnızca birkaç bin küçük satır okuyor. Önceden her sayfa açılışında
// 60 binden fazla ham satır çekilip baştan hesaplanıyordu (~3.5 sn).
import "server-only";
import { cache } from "react";
import { addDays, dateOnly } from "../engine/mesaiGunu";
import { parseDateParam, nowWallClock, toDateParam } from "../engine/tz";
import type { Alarm, ShiftResult } from "../engine/types";
import { ReaderConfig } from "../engine/readerConfig";
import { isGece as isGeceRule } from "../engine/isGece";
import { loadReaderConfig } from "../db/queries/readerRules";
import { loadCorrections, type CorrectionRow } from "../db/queries/corrections";
import {
  fetchAlarms,
  fetchBuddy,
  fetchPersonnel,
  fetchShifts,
  type BuddyRow,
  type PersonInfo,
} from "../db/queries/materialized";
import { supabaseServer } from "../db/supabaseServer";
import type { CorrectionLookup, StartEndLookup } from "../engine/summary";
import { getSession, type SessionPayload } from "../auth/session";

export type { PersonInfo };

export interface DateRange {
  sd: Date;
  ed: Date;
  sdParam: string;
  edParam: string;
}

/**
 * URL parametrelerinden dönem çözer. Varsayılan: bulunduğumuz ayın 1'i → bugün.
 */
export function resolveRange(sp: Record<string, string | string[] | undefined>): DateRange {
  const today = dateOnly(nowWallClock());
  const rawSd = typeof sp.sd === "string" ? parseDateParam(sp.sd) : null;
  const rawEd = typeof sp.ed === "string" ? parseDateParam(sp.ed) : null;

  const defSd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  let sd = rawSd ?? defSd;
  let ed = rawEd ?? today;
  if (sd > ed) [sd, ed] = [ed, sd];

  return { sd, ed, sdParam: toDateParam(sd), edParam: toDateParam(ed) };
}

async function loadGeceTl(): Promise<string[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("gece_tl").select("tl_name");
  if (error) throw new Error(`gece_tl okunamadı: ${error.message}`);
  return ((data ?? []) as unknown as { tl_name: string }[]).map((r) => r.tl_name);
}

export interface PdksData {
  range: DateRange;
  shifts: Map<string, ShiftResult>;
  /** MolaTable için turnike dışı okutulan okuyucu adları (anahtar: sicil::gs). */
  otherReadersByKey: Map<string, string[]>;
  /**
   * Dönem içinde kişinin turnike (çalışma alanı) kayıt sayısı. 0 ise turnike bazlı
   * çalışma süresi hesaplanamaz — satış dışı personel turnikeyi kullanmıyor.
   */
  turnikeCountByS: Map<string, number>;
  alarms: Alarm[];
  buddy: BuddyRow[];
  personByS: Map<string, PersonInfo>;
  readerConfig: ReaderConfig;
  corrections: CorrectionRow[];
  corLookup: CorrectionLookup;
  startEndLookup: StartEndLookup;
  isGece: (sicil: string) => boolean;
  geceTl: string[];
  session: SessionPayload | null;
  /** TL modundaysa sadece bu TL'nin kişileri; admin'de null. */
  tlFilter: string | null;
}

export const loadPdksData = cache(async function loadPdksData(
  sp: Record<string, string | string[] | undefined>
): Promise<PdksData> {
  const range = resolveRange(sp);
  const session = await getSession();
  const tlFilter = session?.role === "tl" ? session.tlName : null;

  const [
    { shifts, otherReadersByKey, turnikeCountByS },
    alarms,
    buddy,
    personByS,
    readerConfig,
    { rows: corrections, lookup: corLookup },
    geceTl,
  ] = await Promise.all([
    fetchShifts(range.sdParam, range.edParam),
    fetchAlarms(range.sdParam, range.edParam),
    fetchBuddy(range.sdParam, range.edParam),
    fetchPersonnel(),
    loadReaderConfig(),
    loadCorrections(),
    loadGeceTl(),
  ]);

  // Vardiya bilgisi henüz Supabase'de yok (kullanıcı kararı: şimdilik herkes gündüz).
  // Vardiya alanı eklendiğinde burada okunup isGeceRule'a verilecek; TL bazlı gece
  // listesi (gece_tl) mantığı hazır bekliyor.
  const geceCache = new Map<string, boolean>();
  const isGece = (sicil: string): boolean => {
    const cached = geceCache.get(sicil);
    if (cached !== undefined) return cached;
    const p = personByS.get(sicil);
    const val = p ? isGeceRule({ vardiya: "", takim_lideri: p.takimLideri }, geceTl) : false;
    geceCache.set(sicil, val);
    return val;
  };

  // start_date/end_date bilgisi henüz yok — dönem sınırı olduğu gibi kullanılır.
  const startEndLookup: StartEndLookup = { getStartDate: () => null, getEndDate: () => null };

  return {
    range,
    shifts,
    otherReadersByKey,
    turnikeCountByS,
    alarms,
    buddy,
    personByS,
    readerConfig,
    corrections,
    corLookup,
    startEndLookup,
    isGece,
    geceTl,
    session,
    tlFilter,
  };
});

/**
 * Görünür kişiler: TL modunda yalnızca kendi takımı. Ada göre sıralı.
 * Yalnızca dönemde vardiya kaydı olan VEYA düzeltmesi olan kişiler döner —
 * personel önbelleği tüm zamanları kapsadığı için dönemle ilgisiz kişileri
 * listelemek yanıltıcı olurdu.
 */
export function visiblePeople(data: PdksData): PersonInfo[] {
  const active = new Set<string>();
  for (const key of data.shifts.keys()) active.add(key.split("::")[0]);
  for (const c of data.corrections) active.add(c.sicil);

  const all = [...data.personByS.values()].filter((p) => active.has(p.sicil));
  const filtered = data.tlFilter ? all.filter((p) => p.takimLideri === data.tlFilter) : all;

  return filtered.sort((a, b) => {
    const an = `${a.ad} ${a.soyad}`.trim();
    const bn = `${b.ad} ${b.soyad}`.trim();
    return an.localeCompare(bn, "tr");
  });
}

/** Dönemin gece vardiyası payı dahil ham veri sınırları (alarm detayı vb. için). */
export function paddedRange(range: DateRange): { start: Date; end: Date } {
  return { start: addDays(range.sd, -1), end: addDays(range.ed, 2) };
}
