// Önceden hesaplanmış pdks_* tablolarından okuma. Sayfaların ana veri kaynağı.
// Ham veriye (60k+ satır) dokunmaz.
//
// Sayfalama PARALEL yapılır: önce sayım, sonra tüm sayfalar eşzamanlı. Sıralı
// döngüde 9-10 sayfa ~1.1 sn round-trip demekti.
import "server-only";
import { supabaseServer } from "../supabaseServer";
import { formatGs } from "../../engine/mesaiGunu";
import { shiftKey } from "../../engine/calcShifts";
import { parseDateParam, utcIsoToWallClock } from "../../engine/tz";
import type { Alarm, AlarmTipVal, ShiftResult } from "../../engine/types";
import { G_NET, N_NET } from "../../engine/constants";

const PAGE = 1000;
const CONCURRENCY = 10;

type Filter = { col: string; op: "gte" | "lte" | "eq"; val: string };

/** Sayım + paralel sayfa çekimi. */
async function selectPages<T>(
  table: string,
  cols: string,
  filters: Filter[],
  order: { col: string; ascending: boolean },
  limit?: number
): Promise<{ rows: T[]; total: number }> {
  const sb = supabaseServer();

  const build = (select: string, head = false) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = sb.from(table).select(select, head ? { count: "exact", head: true } : undefined);
    for (const f of filters) q = q[f.op](f.col, f.val);
    return q;
  };

  const { count, error: cErr } = await build(cols.split(",")[0].trim(), true);
  if (cErr) throw new Error(`${table} sayılamadı: ${cErr.message}`);
  const total = count ?? 0;

  const wanted = limit ? Math.min(limit, total) : total;
  const pageCount = Math.ceil(wanted / PAGE);
  const rows: T[] = [];

  for (let i = 0; i < pageCount; i += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, pageCount - i) }, (_, k) => i + k);
    const results = await Promise.all(
      batch.map((p) =>
        build(cols)
          .order(order.col, { ascending: order.ascending })
          .range(p * PAGE, p * PAGE + PAGE - 1)
      )
    );
    for (const r of results) {
      if (r.error) throw new Error(`${table} okunamadı: ${r.error.message}`);
      rows.push(...((r.data ?? []) as T[]));
    }
  }

  return { rows, total };
}

export interface PersonInfo {
  sicil: string;
  ad: string;
  soyad: string;
  takimLideri: string;
  bolum: string;
  firma: string;
  unvan: string;
}

interface PersonRow {
  sicil: string;
  ad: string;
  soyad: string;
  takim_lideri: string;
  bolum: string;
  firma: string;
  unvan: string;
}

export async function fetchPersonnel(): Promise<Map<string, PersonInfo>> {
  const { rows } = await selectPages<PersonRow>(
    "pdks_personnel_cache",
    "sicil, ad, soyad, takim_lideri, bolum, firma, unvan",
    [],
    { col: "sicil", ascending: true }
  );
  const map = new Map<string, PersonInfo>();
  for (const r of rows) {
    map.set(r.sicil, {
      sicil: r.sicil,
      ad: r.ad ?? "",
      soyad: r.soyad ?? "",
      takimLideri: r.takim_lideri || "Bilinmiyor",
      bolum: r.bolum ?? "",
      firma: r.firma ?? "",
      unvan: r.unvan ?? "",
    });
  }
  return map;
}

interface ShiftDbRow {
  sicil: string;
  mesai_gunu: string;
  gece: boolean;
  net_min: number;
  brut_min: number;
  mola_min: number;
  other_min: number;
  turnike_kayit: number;
  kayit_sayisi: number;
  ilk_giris: string | null;
  son_cikis: string | null;
  pairs: [string, string][];
  outside: [string, string][];
  other_readers: string[];
}

export interface ShiftsResult {
  shifts: Map<string, ShiftResult>;
  otherReadersByKey: Map<string, string[]>;
  turnikeCountByS: Map<string, number>;
}

export async function fetchShifts(sdParam: string, edParam: string): Promise<ShiftsResult> {
  const { rows } = await selectPages<ShiftDbRow>(
    "pdks_shifts",
    "sicil, mesai_gunu, gece, net_min, brut_min, mola_min, other_min, turnike_kayit, kayit_sayisi, ilk_giris, son_cikis, pairs, outside, other_readers",
    [
      { col: "mesai_gunu", op: "gte", val: sdParam },
      { col: "mesai_gunu", op: "lte", val: edParam },
    ],
    { col: "mesai_gunu", ascending: true }
  );

  const shifts = new Map<string, ShiftResult>();
  const otherReadersByKey = new Map<string, string[]>();
  const turnikeCountByS = new Map<string, number>();

  for (const r of rows) {
    const mg = parseDateParam(r.mesai_gunu);
    if (!mg) continue;
    const key = shiftKey(r.sicil, formatGs(mg));
    const net = Number(r.net_min) || 0;

    shifts.set(key, {
      g: r.ilk_giris ? utcIsoToWallClock(r.ilk_giris) : mg,
      c: r.son_cikis ? utcIsoToWallClock(r.son_cikis) : mg,
      gece: r.gece,
      cnt: r.kayit_sayisi ?? 0,
      net,
      brut: Number(r.brut_min) || 0,
      fark: net - (r.gece ? N_NET : G_NET),
      mg,
      mola: Number(r.mola_min) || 0,
      pairs: (r.pairs ?? []).map(([a, b]) => [utcIsoToWallClock(a), utcIsoToWallClock(b)]),
      outsideIntervals: (r.outside ?? []).map(([a, b]) => [utcIsoToWallClock(a), utcIsoToWallClock(b)]),
      others: [], // ham "diğer" kayıtları materyalize edilmiyor; okuyucu adları ayrı
      otherMin: Number(r.other_min) || 0,
    });

    otherReadersByKey.set(key, r.other_readers ?? []);
    turnikeCountByS.set(r.sicil, (turnikeCountByS.get(r.sicil) ?? 0) + (r.turnike_kayit ?? 0));
  }

  return { shifts, otherReadersByKey, turnikeCountByS };
}

interface AlarmDbRow {
  tip: string;
  sicil: string;
  mesai_gunu: string;
  ts: string;
  okuyucu: string;
  detay: string;
}

export interface AlarmsResult {
  alarms: Alarm[];
  /** Dönemin tamamındaki tip bazlı sayılar (liste kısaltılsa da kartlar doğru kalır). */
  counts: Record<AlarmTipVal, number>;
  total: number;
  truncated: boolean;
}

/**
 * Alarmlar açıklama metinleri yüzünden hacimli; ekran zaten sınırlı satır gösteriyor.
 * En yeni `limit` alarm çekilir, sayaçlar ayrı (ucuz) sayım sorgularıyla alınır.
 */
export async function fetchAlarms(
  sdParam: string,
  edParam: string,
  limit = 1200
): Promise<AlarmsResult> {
  const sb = supabaseServer();
  const range: Filter[] = [
    { col: "mesai_gunu", op: "gte", val: sdParam },
    { col: "mesai_gunu", op: "lte", val: edParam },
  ];

  const tipler: AlarmTipVal[] = ["TURNIKESIZ_CIKIS", "KART_BASMA", "TURNIKE_ATLAMA"];

  const [{ rows, total }, ...countRes] = await Promise.all([
    selectPages<AlarmDbRow>(
      "pdks_alarms",
      "tip, sicil, mesai_gunu, ts, okuyucu, detay",
      range,
      { col: "ts", ascending: false },
      limit
    ),
    ...tipler.map((t) =>
      sb
        .from("pdks_alarms")
        .select("id", { count: "exact", head: true })
        .gte("mesai_gunu", sdParam)
        .lte("mesai_gunu", edParam)
        .eq("tip", t)
    ),
  ]);

  const counts = {} as Record<AlarmTipVal, number>;
  tipler.forEach((t, i) => {
    counts[t] = countRes[i].count ?? 0;
  });

  const alarms: Alarm[] = [];
  for (const r of rows) {
    const mg = parseDateParam(r.mesai_gunu);
    if (!mg) continue;
    alarms.push({
      tip: r.tip as AlarmTipVal,
      sicil: r.sicil,
      mg,
      dt: utcIsoToWallClock(r.ts),
      ok: r.okuyucu,
      detay: r.detay ?? "",
      idx: null,
      refDt: null,
    });
  }

  return { alarms, counts, total, truncated: total > rows.length };
}

export interface BuddyRow {
  sicil: string;
  mg: Date;
  dt: Date;
  ok: string;
}

export async function fetchBuddy(
  sdParam: string,
  edParam: string,
  limit = 3000
): Promise<{ rows: BuddyRow[]; total: number }> {
  const { rows, total } = await selectPages<{
    sicil: string;
    mesai_gunu: string;
    ts: string;
    okuyucu: string;
  }>(
    "pdks_buddy",
    "sicil, mesai_gunu, ts, okuyucu",
    [
      { col: "mesai_gunu", op: "gte", val: sdParam },
      { col: "mesai_gunu", op: "lte", val: edParam },
    ],
    { col: "ts", ascending: false },
    limit
  );

  const out: BuddyRow[] = [];
  for (const r of rows) {
    const mg = parseDateParam(r.mesai_gunu);
    if (!mg) continue;
    out.push({ sicil: r.sicil, mg, dt: utcIsoToWallClock(r.ts), ok: r.okuyucu });
  }
  return { rows: out, total };
}

/**
 * Kapı Ayarları: okuyucu adları + kayıt sayıları. Senkronizasyon sırasında
 * gün bazında materyalize edilir (pdks_reader_daily), böylece bu ekran ham
 * tabloyu taramak zorunda kalmaz (önceden ~7 sn sürüyordu).
 */
export async function fetchReaderUsage(sdParam: string, edParam: string): Promise<Map<string, number>> {
  const { rows } = await selectPages<{ okuyucu: string; kayit_sayisi: number }>(
    "pdks_reader_daily",
    "okuyucu, kayit_sayisi",
    [
      { col: "mesai_gunu", op: "gte", val: sdParam },
      { col: "mesai_gunu", op: "lte", val: edParam },
    ],
    { col: "okuyucu", ascending: true }
  );

  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.okuyucu, (counts.get(r.okuyucu) ?? 0) + (Number(r.kayit_sayisi) || 0));
  }
  return counts;
}

/** Tüm zamanlarda görülmüş okuyucu adları (Kapı Ayarları listesi tam olsun diye). */
export async function fetchAllReaderNames(): Promise<string[]> {
  const { rows } = await selectPages<{ okuyucu: string }>(
    "pdks_reader_daily",
    "okuyucu",
    [],
    { col: "okuyucu", ascending: true }
  );
  return [...new Set(rows.map((r) => r.okuyucu))].sort((a, b) => a.localeCompare(b, "tr"));
}
