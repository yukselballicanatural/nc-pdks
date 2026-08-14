// Tüm sayfaların paylaştığı tek veri/hesaplama giriş noktası.
// React cache() ile aynı istek içinde birden fazla çağrı tek fetch'e iner.
import "server-only";
import { cache } from "react";
import { calcShifts } from "../engine/calcShifts";
import { detectAlarms } from "../engine/detectAlarms";
import { detectBuddy } from "../engine/detectBuddy";
import { isGece as isGeceRule } from "../engine/isGece";
import { addDays, dateOnly, mesaiGunu } from "../engine/mesaiGunu";
import { parseDateParam, nowWallClock, toDateParam } from "../engine/tz";
import type { Alarm, PdksRawEvent, ShiftResult } from "../engine/types";
import { ReaderConfig } from "../engine/readerConfig";
import { fetchPdksEvents, type PersonInfo } from "../db/queries/pdksEvents";
import { loadReaderConfig } from "../db/queries/readerRules";
import { loadCorrections, type CorrectionRow } from "../db/queries/corrections";
import { supabaseServer } from "../db/supabaseServer";
import type { CorrectionLookup, StartEndLookup } from "../engine/summary";
import { getSession, type SessionPayload } from "../auth/session";

export interface DateRange {
  sd: Date;
  ed: Date;
  sdParam: string;
  edParam: string;
}

/**
 * URL parametrelerinden dönem çözer. Varsayılan: bulunduğumuz ayın 1'i → bugün.
 * (Önceki "son 14 gün" varsayılanı dönemi belirsiz kılıyordu.)
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
  events: PdksRawEvent[];
  /**
   * Dönem içinde kişinin ÇALIŞMA alanı (turnike) okuyucusundan kaç kaydı var.
   * 0 ise turnike bazlı çalışma süresi hesaplanamaz — satış dışı personel
   * (teknik, depo, klinik) turnikeyi kullanmıyor, "Personel GİRİŞ", "Soyunma
   * Odası", "Lobi geçiş" gibi kapılardan giriyor. Bu kişiler eksik saat
   * istatistiğinde yanıltıcı görünmemesi için ayrıca işaretlenir.
   */
  turnikeCountByS: Map<string, number>;
  /** Sadece dönem içindeki (mesai günü bazlı) kayıtlar — Log/Buddy ekranları için. */
  eventsInRange: PdksRawEvent[];
  shifts: Map<string, ShiftResult>;
  alarms: Alarm[];
  buddyIdx: number[];
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

  // Gece vardiyası kaydırması için sınırları 1 gün pay bırakarak çekiyoruz:
  // ed gününün gece vardiyası ed+1 12:00'a kadar sürebilir.
  const fetchStart = addDays(range.sd, -1);
  const fetchEnd = addDays(range.ed, 2);

  const [{ events, personByS }, readerConfig, { rows: corrections, lookup: corLookup }, geceTl] =
    await Promise.all([
      fetchPdksEvents(fetchStart, fetchEnd),
      loadReaderConfig(),
      loadCorrections(),
      loadGeceTl(),
    ]);

  // Vardiya bilgisi henüz Supabase'de yok (kullanıcı: "şuan herkesi gündüz alalım").
  // Vardiya alanı eklendiğinde burada personnel.vardiya okunup isGeceRule'a verilir;
  // TL bazlı gece listesi mantığı (gece_tl) hazır bekliyor.
  //
  // Sicil bazında memoize: isGeceRule her çağrıda Türkçe normalize (NFKD) yapıyor ve
  // bu fonksiyon on binlerce olay için çağrılıyor. Aynı girdi -> aynı sonuç olduğu
  // için önbellek davranışı değiştirmez, sadece tekrarlı işi ortadan kaldırır.
  const geceCache = new Map<string, boolean>();
  const isGece = (sicil: string): boolean => {
    const cached = geceCache.get(sicil);
    if (cached !== undefined) return cached;
    const p = personByS.get(sicil);
    const val = p ? isGeceRule({ vardiya: "", takim_lideri: p.takimLideri }, geceTl) : false;
    geceCache.set(sicil, val);
    return val;
  };

  const shifts = calcShifts(events, readerConfig, isGece);
  const alarms = detectAlarms(events, readerConfig, isGece, (sicil) => {
    const p = personByS.get(sicil);
    return p ? `${p.ad} ${p.soyad}`.trim() || sicil : sicil;
  });
  const buddyIdx = detectBuddy(events, readerConfig);

  const eventsInRange = events.filter((r) => {
    const mg = mesaiGunu(r.dt, isGece(r.sicil));
    return mg >= range.sd && mg <= range.ed;
  });

  const turnikeCountByS = new Map<string, number>();
  for (const p of personByS.keys()) turnikeCountByS.set(p, 0);
  for (const r of eventsInRange) {
    if (readerConfig.getArea(r.ok) !== "work") continue;
    turnikeCountByS.set(r.sicil, (turnikeCountByS.get(r.sicil) ?? 0) + 1);
  }

  // start_date/end_date bilgisi henüz yok — dönem sınırı olduğu gibi kullanılır.
  const startEndLookup: StartEndLookup = { getStartDate: () => null, getEndDate: () => null };

  return {
    range,
    events,
    turnikeCountByS,
    eventsInRange,
    shifts,
    alarms,
    buddyIdx,
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

/** TL modu filtresi + arama/TL parametresi uygulanmış kişi listesi (sicil sıralı). */
export function visiblePeople(data: PdksData): PersonInfo[] {
  const all = [...data.personByS.values()];
  const filtered = data.tlFilter
    ? all.filter((p) => p.takimLideri === data.tlFilter)
    : all;
  return filtered.sort((a, b) => {
    const an = `${a.ad} ${a.soyad}`.trim();
    const bn = `${b.ad} ${b.soyad}`.trim();
    return an.localeCompare(bn, "tr");
  });
}
