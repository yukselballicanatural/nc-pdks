// Önceden hesaplanmış pdks_* tablolarından okuma. Sayfaların ana veri kaynağı.
// Ham veriye (60k+ satır) hiç dokunmaz — dönem başına yalnızca birkaç bin küçük satır.
import "server-only";
import { supabaseServer } from "../supabaseServer";
import { formatGs } from "../../engine/mesaiGunu";
import { shiftKey } from "../../engine/calcShifts";
import { parseDateParam, toDateParam, utcIsoToWallClock } from "../../engine/tz";
import type { Alarm, AlarmTipVal, ShiftResult } from "../../engine/types";
import { G_NET, N_NET } from "../../engine/constants";

const PAGE = 1000;

async function selectAllPages<T>(
  table: string,
  cols: string,
  apply: (q: ReturnType<ReturnType<typeof supabaseServer>["from"]>) => unknown
): Promise<T[]> {
  const sb = supabaseServer();
  const out: T[] = [];
  for (let p = 0; ; p++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = sb.from(table).select(cols);
    q = apply(q) ?? q;
    const { data, error } = await q.range(p * PAGE, p * PAGE + PAGE - 1);
    if (error) throw new Error(`${table} okunamadı: ${error.message}`);
    const batch = (data ?? []) as T[];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
}

export interface PersonRow {
  sicil: string;
  ad: string;
  soyad: string;
  takim_lideri: string;
  bolum: string;
  firma: string;
  unvan: string;
  last_seen: string | null;
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

export async function fetchPersonnel(): Promise<Map<string, PersonInfo>> {
  const rows = await selectAllPages<PersonRow>(
    "pdks_personnel_cache",
    "sicil, ad, soyad, takim_lideri, bolum, firma, unvan, last_seen",
    (q) => (q as { order: (c: string, o: object) => unknown }).order("sicil", { ascending: true })
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
  /** engine (summary/getNet/getEffectiveMola) ile uyumlu harita. */
  shifts: Map<string, ShiftResult>;
  /** MolaTable için: turnike dışı okutulan okuyucu adları. */
  otherReadersByKey: Map<string, string[]>;
  /** Özet/Dashboard için: dönemde turnike (çalışma alanı) kayıt sayısı. */
  turnikeCountByS: Map<string, number>;
}

export async function fetchShifts(sdParam: string, edParam: string): Promise<ShiftsResult> {
  const rows = await selectAllPages<ShiftDbRow>(
    "pdks_shifts",
    "sicil, mesai_gunu, gece, net_min, brut_min, mola_min, other_min, turnike_kayit, kayit_sayisi, ilk_giris, son_cikis, pairs, outside, other_readers",
    (q) =>
      (
        q as {
          gte: (c: string, v: string) => {
            lte: (c: string, v: string) => { order: (c: string, o: object) => unknown };
          };
        }
      )
        .gte("mesai_gunu", sdParam)
        .lte("mesai_gunu", edParam)
        .order("mesai_gunu", { ascending: true })
  );

  const shifts = new Map<string, ShiftResult>();
  const otherReadersByKey = new Map<string, string[]>();
  const turnikeCountByS = new Map<string, number>();

  for (const r of rows) {
    const mg = parseDateParam(r.mesai_gunu);
    if (!mg) continue;
    const gs = formatGs(mg);
    const key = shiftKey(r.sicil, gs);
    const net = Number(r.net_min) || 0;
    const std = r.gece ? N_NET : G_NET;

    shifts.set(key, {
      g: r.ilk_giris ? utcIsoToWallClock(r.ilk_giris) : mg,
      c: r.son_cikis ? utcIsoToWallClock(r.son_cikis) : mg,
      gece: r.gece,
      cnt: r.kayit_sayisi ?? 0,
      net,
      brut: Number(r.brut_min) || 0,
      fark: net - std,
      mg,
      mola: Number(r.mola_min) || 0,
      pairs: (r.pairs ?? []).map(([a, b]) => [utcIsoToWallClock(a), utcIsoToWallClock(b)]),
      outsideIntervals: (r.outside ?? []).map(([a, b]) => [utcIsoToWallClock(a), utcIsoToWallClock(b)]),
      others: [], // ham "diğer" kayıtları materyalize edilmiyor; okuyucu adları ayrı tutuluyor
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

export async function fetchAlarms(sdParam: string, edParam: string): Promise<Alarm[]> {
  const rows = await selectAllPages<AlarmDbRow>(
    "pdks_alarms",
    "tip, sicil, mesai_gunu, ts, okuyucu, detay",
    (q) =>
      (
        q as {
          gte: (c: string, v: string) => {
            lte: (c: string, v: string) => { order: (c: string, o: object) => unknown };
          };
        }
      )
        .gte("mesai_gunu", sdParam)
        .lte("mesai_gunu", edParam)
        .order("ts", { ascending: false })
  );

  const out: Alarm[] = [];
  for (const r of rows) {
    const mg = parseDateParam(r.mesai_gunu);
    if (!mg) continue;
    out.push({
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
  return out;
}

export interface BuddyRow {
  sicil: string;
  mg: Date;
  dt: Date;
  ok: string;
}

export async function fetchBuddy(sdParam: string, edParam: string): Promise<BuddyRow[]> {
  const rows = await selectAllPages<{ sicil: string; mesai_gunu: string; ts: string; okuyucu: string }>(
    "pdks_buddy",
    "sicil, mesai_gunu, ts, okuyucu",
    (q) =>
      (
        q as {
          gte: (c: string, v: string) => {
            lte: (c: string, v: string) => { order: (c: string, o: object) => unknown };
          };
        }
      )
        .gte("mesai_gunu", sdParam)
        .lte("mesai_gunu", edParam)
        .order("ts", { ascending: false })
  );

  const out: BuddyRow[] = [];
  for (const r of rows) {
    const mg = parseDateParam(r.mesai_gunu);
    if (!mg) continue;
    out.push({ sicil: r.sicil, mg, dt: utcIsoToWallClock(r.ts), ok: r.okuyucu });
  }
  return out;
}

/** Kapı Ayarları sayfası: okuyucu adları + kayıt sayıları (materyalize edilmiş özet yok, ham tablodan tek seferlik). */
export async function fetchReaderUsage(sdParam: string, edParam: string): Promise<Map<string, number>> {
  const sd = parseDateParam(sdParam);
  const ed = parseDateParam(edParam);
  const counts = new Map<string, number>();
  if (!sd || !ed) return counts;

  // pdks_shifts.other_readers + turnike sayıları okuyucu bazlı sayı vermiyor;
  // bu ekran nadiren açıldığı için ham tablodan yalnızca okuyucu kolonunu tarıyoruz.
  const sb = supabaseServer();
  const gte = `${toDateParam(sd)}T00:00:00.000Z`;
  for (let p = 0; p < 60; p++) {
    const { data, error } = await sb
      .from("turnike_gecisler")
      .select("giris_kapisi")
      .gte("event_time", gte)
      .order("event_time", { ascending: false })
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (error) throw new Error(`okuyucular okunamadı: ${error.message}`);
    const batch = (data ?? []) as unknown as { giris_kapisi: string }[];
    for (const r of batch) {
      if (!r.giris_kapisi) continue;
      counts.set(r.giris_kapisi, (counts.get(r.giris_kapisi) ?? 0) + 1);
    }
    if (batch.length < PAGE) break;
  }
  return counts;
}
