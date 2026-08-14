// Artımlı senkronizasyon: ham turnike_gecisler verisini bir kez hesaplayıp
// pdks_shifts / pdks_alarms / pdks_buddy / pdks_personnel_cache tablolarına yazar,
// sonrasında yalnızca yeni source_id'lerin etkilediği günleri yeniden hesaplar.
//
// Neden source_id: monoton artıyor ve event_time ile birebir korele (doğrulandı),
// veri toplu senkronizasyonla geliyor. Yeni kayıtların etkilediği gün aralığını
// bulmak için bu yeterli.
import "server-only";
import { supabaseServer } from "../db/supabaseServer";
import { calcShifts, shiftKey } from "../engine/calcShifts";
import { detectAlarms } from "../engine/detectAlarms";
import { detectBuddy } from "../engine/detectBuddy";
import { isGece as isGeceRule } from "../engine/isGece";
import { addDays, dateOnly, formatGs, mesaiGunu } from "../engine/mesaiGunu";
import { ReaderConfig } from "../engine/readerConfig";
import { utcIsoToWallClock, wallClockToUtcIso, parseDateParam, toDateParam } from "../engine/tz";
import type { PdksRawEvent } from "../engine/types";
import { loadReaderConfig } from "../db/queries/readerRules";
import { fetchRawRows, type RawRow } from "../db/queries/rawEvents";

/** Tek çağrıda işlenecek gün sayısı — serverless zaman limitine sığması için. */
const CHUNK_DAYS = 7;
const INSERT_BATCH = 500;

export interface SyncResult {
  mode: "full" | "incremental" | "idle";
  done: boolean;
  processedDays: number;
  processedRows: number;
  shiftsWritten: number;
  alarmsWritten: number;
  cursor: string | null;
  lastSourceId: number;
  message: string;
}

interface SyncState {
  last_source_id: number;
  config_version: string;
  rebuild_cursor: string | null;
}

async function loadState(): Promise<SyncState> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("pdks_sync_state")
    .select("last_source_id, config_version, rebuild_cursor")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`pdks_sync_state okunamadı: ${error.message}`);
  const row = data as unknown as SyncState | null;
  return row ?? { last_source_id: 0, config_version: "", rebuild_cursor: null };
}

async function saveState(patch: Record<string, unknown>): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("pdks_sync_state")
    .upsert({ id: 1, ...patch }, { onConflict: "id" });
  if (error) throw new Error(`pdks_sync_state yazılamadı: ${error.message}`);
}

async function loadGeceTl(): Promise<string[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.from("gece_tl").select("tl_name");
  if (error) throw new Error(`gece_tl okunamadı: ${error.message}`);
  return ((data ?? []) as unknown as { tl_name: string }[]).map((r) => r.tl_name).sort();
}

/** Kapı sınıflandırması + gece TL listesinin imzası; değişirse tam yeniden hesaplama gerekir. */
function configVersionOf(rc: ReaderConfig, geceTl: string[]): string {
  const j = rc.toJSON();
  return JSON.stringify({ w: j.work_readers, b: j.break_readers, i: j.ignore_readers, g: geceTl });
}

async function maxSourceId(): Promise<number> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("turnike_gecisler")
    .select("source_id")
    .order("source_id", { ascending: false })
    .limit(1);
  if (error) throw new Error(`source_id okunamadı: ${error.message}`);
  const rows = (data ?? []) as unknown as { source_id: number }[];
  return rows[0]?.source_id ?? 0;
}

async function eventTimeBounds(): Promise<{ min: Date; max: Date } | null> {
  const sb = supabaseServer();
  const [a, b] = await Promise.all([
    sb.from("turnike_gecisler").select("event_time").order("event_time", { ascending: true }).limit(1),
    sb.from("turnike_gecisler").select("event_time").order("event_time", { ascending: false }).limit(1),
  ]);
  if (a.error || b.error) throw new Error("event_time sınırları okunamadı");
  const lo = (a.data ?? []) as unknown as { event_time: string }[];
  const hi = (b.data ?? []) as unknown as { event_time: string }[];
  if (!lo[0] || !hi[0]) return null;
  return {
    min: dateOnly(utcIsoToWallClock(lo[0].event_time)),
    max: dateOnly(utcIsoToWallClock(hi[0].event_time)),
  };
}

/** Yeni (source_id > since) kayıtların kapsadığı vardiya günü aralığı. */
async function affectedRangeSince(since: number): Promise<{ min: Date; max: Date } | null> {
  const sb = supabaseServer();
  const [a, b] = await Promise.all([
    sb
      .from("turnike_gecisler")
      .select("event_time")
      .gt("source_id", since)
      .order("event_time", { ascending: true })
      .limit(1),
    sb
      .from("turnike_gecisler")
      .select("event_time")
      .gt("source_id", since)
      .order("event_time", { ascending: false })
      .limit(1),
  ]);
  if (a.error || b.error) throw new Error("yeni kayıt aralığı okunamadı");
  const lo = (a.data ?? []) as unknown as { event_time: string }[];
  const hi = (b.data ?? []) as unknown as { event_time: string }[];
  if (!lo[0] || !hi[0]) return null;
  // Gece vardiyası kayması: bir kayıt önceki günün vardiyasına ait olabilir.
  return {
    min: addDays(dateOnly(utcIsoToWallClock(lo[0].event_time)), -1),
    max: dateOnly(utcIsoToWallClock(hi[0].event_time)),
  };
}

function rowsToEvents(rows: RawRow[]): PdksRawEvent[] {
  return rows.map((r, idx) => ({
    sicil: r.sicil_no,
    ad: (r.ad ?? "").trim(),
    soyad: (r.soyad ?? "").trim(),
    dt: utcIsoToWallClock(r.event_time),
    ok: r.giris_kapisi ?? "",
    firma: r.firma ?? "",
    sube: r.alt_firma ?? "",
    dept: r.bolum ?? "",
    dir: "",
    idx,
  }));
}

async function insertInBatches(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const sb = supabaseServer();
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const { error } = await sb.from(table).insert(rows.slice(i, i + INSERT_BATCH));
    if (error) throw new Error(`${table} yazılamadı: ${error.message}`);
  }
}

async function upsertInBatches(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string
): Promise<void> {
  if (rows.length === 0) return;
  const sb = supabaseServer();
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const { error } = await sb.from(table).upsert(rows.slice(i, i + INSERT_BATCH), { onConflict });
    if (error) throw new Error(`${table} yazılamadı: ${error.message}`);
  }
}

/**
 * [startDay, endDayExclusive) vardiya günleri için sonuçları yeniden hesaplar.
 * Ham veri ±pay ile çekilir (gece vardiyası ve 60 sn tekilleştirme sınırları için),
 * ama yalnızca iç aralıktaki günler yazılır — böylece kenar günler bozulmaz.
 */
async function processWindow(
  startDay: Date,
  endDayExclusive: Date,
  readerConfig: ReaderConfig,
  geceTl: string[]
): Promise<{ rows: number; shifts: number; alarms: number }> {
  const rawRows = await fetchRawRows(addDays(startDay, -1), addDays(endDayExclusive, 2));
  const events = rowsToEvents(rawRows);

  // Kişi bilgisi (en son görülen kayıt kazanır — rows kronolojik sıralı).
  const person = new Map<
    string,
    { ad: string; soyad: string; tl: string; bolum: string; firma: string; unvan: string; last: string }
  >();
  for (const r of rawRows) {
    person.set(r.sicil_no, {
      ad: (r.ad ?? "").trim(),
      soyad: (r.soyad ?? "").trim(),
      tl: (r.pozisyon ?? "").trim() || "Bilinmiyor",
      bolum: (r.bolum ?? "").trim(),
      firma: (r.firma ?? "").trim(),
      unvan: (r.alt_firma ?? "").trim(),
      last: r.event_time,
    });
  }

  const geceCache = new Map<string, boolean>();
  const isGece = (sicil: string): boolean => {
    const hit = geceCache.get(sicil);
    if (hit !== undefined) return hit;
    const p = person.get(sicil);
    const val = p ? isGeceRule({ vardiya: "", takim_lideri: p.tl }, geceTl) : false;
    geceCache.set(sicil, val);
    return val;
  };

  const shifts = calcShifts(events, readerConfig, isGece);
  const alarms = detectAlarms(events, readerConfig, isGece, (sicil) => {
    const p = person.get(sicil);
    return p ? `${p.ad} ${p.soyad}`.trim() || sicil : sicil;
  });
  const buddyIdx = detectBuddy(events, readerConfig);

  const inWindow = (d: Date) => d >= startDay && d < endDayExclusive;

  // Çalışma alanı (turnike) kayıt sayısı: gün+kişi bazında.
  const turnikeCount = new Map<string, number>();
  for (const e of events) {
    if (readerConfig.getArea(e.ok) !== "work") continue;
    const mg = mesaiGunu(e.dt, isGece(e.sicil));
    if (!inWindow(mg)) continue;
    const k = shiftKey(e.sicil, formatGs(mg));
    turnikeCount.set(k, (turnikeCount.get(k) ?? 0) + 1);
  }

  const shiftRows: Record<string, unknown>[] = [];
  for (const [key, sh] of shifts) {
    if (!inWindow(sh.mg)) continue;
    const sicil = key.split("::")[0];
    shiftRows.push({
      sicil,
      mesai_gunu: toDateParam(sh.mg),
      gece: sh.gece,
      net_min: sh.net,
      brut_min: sh.brut,
      mola_min: sh.mola,
      other_min: sh.otherMin,
      turnike_kayit: turnikeCount.get(key) ?? 0,
      kayit_sayisi: sh.cnt,
      ilk_giris: wallClockToUtcIso(sh.g),
      son_cikis: wallClockToUtcIso(sh.c),
      pairs: sh.pairs.map(([a, b]) => [wallClockToUtcIso(a), wallClockToUtcIso(b)]),
      outside: sh.outsideIntervals.map(([a, b]) => [wallClockToUtcIso(a), wallClockToUtcIso(b)]),
      other_readers: [...new Set(sh.others.map((o) => o.ok))],
    });
  }

  const alarmRows = alarms
    .filter((a) => inWindow(a.mg))
    .map((a) => ({
      tip: a.tip,
      sicil: a.sicil,
      mesai_gunu: toDateParam(a.mg),
      ts: wallClockToUtcIso(a.dt),
      okuyucu: a.ok,
      detay: a.detay,
    }));

  const buddyRows = buddyIdx
    .map((i) => events[i])
    .filter((e): e is PdksRawEvent => Boolean(e))
    .map((e) => ({ e, mg: mesaiGunu(e.dt, isGece(e.sicil)) }))
    .filter(({ mg }) => inWindow(mg))
    .map(({ e, mg }) => ({
      sicil: e.sicil,
      mesai_gunu: toDateParam(mg),
      ts: wallClockToUtcIso(e.dt),
      okuyucu: e.ok,
    }));

  // Okuyucu bazlı günlük kayıt sayısı — Kapı Ayarları ekranı ham tabloyu
  // taramak zorunda kalmasın diye (önceden ~7 sn sürüyordu).
  const readerDaily = new Map<string, number>();
  for (const e of events) {
    const mg = mesaiGunu(e.dt, isGece(e.sicil));
    if (!inWindow(mg)) continue;
    const k = `${e.ok}::${toDateParam(mg)}`;
    readerDaily.set(k, (readerDaily.get(k) ?? 0) + 1);
  }
  const readerRows = [...readerDaily.entries()].map(([k, n]) => {
    const sep = k.lastIndexOf("::");
    return { okuyucu: k.slice(0, sep), mesai_gunu: k.slice(sep + 2), kayit_sayisi: n };
  });

  const personRows = [...person.entries()].map(([sicil, p]) => ({
    sicil,
    ad: p.ad,
    soyad: p.soyad,
    takim_lideri: p.tl,
    bolum: p.bolum,
    firma: p.firma,
    unvan: p.unvan,
    last_seen: p.last,
    updated_at: new Date().toISOString(),
  }));

  // Bu pencerenin eski sonuçlarını temizle (tekrar/kalıntı olmasın), sonra yaz.
  const sb = supabaseServer();
  const gunFrom = toDateParam(startDay);
  const gunToExcl = toDateParam(endDayExclusive);
  for (const t of ["pdks_alarms", "pdks_buddy", "pdks_reader_daily"]) {
    const { error } = await sb.from(t).delete().gte("mesai_gunu", gunFrom).lt("mesai_gunu", gunToExcl);
    if (error) throw new Error(`${t} temizlenemedi: ${error.message}`);
  }
  // Shifts: o pencerede artık sonucu olmayan gün/kişi kalmasın.
  {
    const { error } = await sb
      .from("pdks_shifts")
      .delete()
      .gte("mesai_gunu", gunFrom)
      .lt("mesai_gunu", gunToExcl);
    if (error) throw new Error(`pdks_shifts temizlenemedi: ${error.message}`);
  }

  await upsertInBatches("pdks_shifts", shiftRows, "sicil,mesai_gunu");
  await insertInBatches("pdks_alarms", alarmRows);
  await insertInBatches("pdks_buddy", buddyRows);
  await insertInBatches("pdks_reader_daily", readerRows);
  await upsertInBatches("pdks_personnel_cache", personRows, "sicil");

  return { rows: rawRows.length, shifts: shiftRows.length, alarms: alarmRows.length };
}

export async function runSync(opts: { force?: boolean } = {}): Promise<SyncResult> {
  const [state, readerConfig, geceTl] = await Promise.all([
    loadState(),
    loadReaderConfig(),
    loadGeceTl(),
  ]);
  const cfg = configVersionOf(readerConfig, geceTl);
  const bounds = await eventTimeBounds();

  if (!bounds) {
    return {
      mode: "idle",
      done: true,
      processedDays: 0,
      processedRows: 0,
      shiftsWritten: 0,
      alarmsWritten: 0,
      cursor: null,
      lastSourceId: 0,
      message: "Kaynak tabloda kayıt yok.",
    };
  }

  const needsFull =
    opts.force || state.config_version !== cfg || state.last_source_id === 0 || state.rebuild_cursor !== null;

  if (needsFull) {
    // Devam eden bir yeniden hesaplama varsa oradan sürdür, yoksa en baştan başla.
    const cursor =
      state.rebuild_cursor && !opts.force && state.config_version === cfg
        ? (parseDateParam(state.rebuild_cursor) ?? bounds.min)
        : bounds.min;

    const end = addDays(cursor, CHUNK_DAYS);
    const res = await processWindow(cursor, end, readerConfig, geceTl);
    const finished = end > bounds.max;

    if (finished) {
      const maxId = await maxSourceId();
      await saveState({
        last_source_id: maxId,
        config_version: cfg,
        rebuild_cursor: null,
        last_sync_at: new Date().toISOString(),
        last_full_rebuild_at: new Date().toISOString(),
        status: "idle",
        message: "Tam yeniden hesaplama tamamlandı.",
      });
      return {
        mode: "full",
        done: true,
        processedDays: CHUNK_DAYS,
        processedRows: res.rows,
        shiftsWritten: res.shifts,
        alarmsWritten: res.alarms,
        cursor: null,
        lastSourceId: maxId,
        message: "Tam yeniden hesaplama tamamlandı.",
      };
    }

    await saveState({
      config_version: cfg,
      rebuild_cursor: toDateParam(end),
      status: "rebuilding",
      message: `${toDateParam(cursor)} → ${toDateParam(end)} işlendi.`,
    });
    return {
      mode: "full",
      done: false,
      processedDays: CHUNK_DAYS,
      processedRows: res.rows,
      shiftsWritten: res.shifts,
      alarmsWritten: res.alarms,
      cursor: toDateParam(end),
      lastSourceId: state.last_source_id,
      message: `${toDateParam(cursor)} → ${toDateParam(end)} işlendi, devam ediyor.`,
    };
  }

  // Artımlı: sadece yeni source_id'lerin etkilediği günler.
  const maxId = await maxSourceId();
  if (maxId <= state.last_source_id) {
    await saveState({ last_sync_at: new Date().toISOString(), status: "idle", message: "Veri güncel." });
    return {
      mode: "incremental",
      done: true,
      processedDays: 0,
      processedRows: 0,
      shiftsWritten: 0,
      alarmsWritten: 0,
      cursor: null,
      lastSourceId: state.last_source_id,
      message: "Yeni kayıt yok, veri güncel.",
    };
  }

  const affected = await affectedRangeSince(state.last_source_id);
  if (!affected) {
    await saveState({ last_source_id: maxId, last_sync_at: new Date().toISOString() });
    return {
      mode: "incremental",
      done: true,
      processedDays: 0,
      processedRows: 0,
      shiftsWritten: 0,
      alarmsWritten: 0,
      cursor: null,
      lastSourceId: maxId,
      message: "Yeni kayıt bulunamadı.",
    };
  }

  const end = addDays(affected.max, 1);
  const res = await processWindow(affected.min, end, readerConfig, geceTl);
  const days = Math.round((end.getTime() - affected.min.getTime()) / 86400000);

  await saveState({
    last_source_id: maxId,
    config_version: cfg,
    rebuild_cursor: null,
    last_sync_at: new Date().toISOString(),
    status: "idle",
    message: `${days} gün güncellendi (${toDateParam(affected.min)} → ${toDateParam(affected.max)}).`,
  });

  return {
    mode: "incremental",
    done: true,
    processedDays: days,
    processedRows: res.rows,
    shiftsWritten: res.shifts,
    alarmsWritten: res.alarms,
    cursor: null,
    lastSourceId: maxId,
    message: `${days} gün güncellendi, ${res.shifts} vardiya kaydı yazıldı.`,
  };
}

/** Sayfalarda "veri güncel mi" göstergesi için hafif kontrol. */
export async function syncStatus(): Promise<{
  lastSourceId: number;
  currentMaxSourceId: number;
  stale: boolean;
  rebuilding: boolean;
  lastSyncAt: string | null;
  message: string;
}> {
  const sb = supabaseServer();
  const [stateRes, maxId] = await Promise.all([
    sb
      .from("pdks_sync_state")
      .select("last_source_id, rebuild_cursor, last_sync_at, message")
      .eq("id", 1)
      .maybeSingle(),
    maxSourceId(),
  ]);
  const s = (stateRes.data ?? null) as unknown as {
    last_source_id: number;
    rebuild_cursor: string | null;
    last_sync_at: string | null;
    message: string;
  } | null;
  const last = s?.last_source_id ?? 0;
  return {
    lastSourceId: last,
    currentMaxSourceId: maxId,
    stale: maxId > last,
    rebuilding: Boolean(s?.rebuild_cursor),
    lastSyncAt: s?.last_sync_at ?? null,
    message: s?.message ?? "",
  };
}
