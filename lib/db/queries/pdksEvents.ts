// turnike_gecisler (canlı Supabase tablosu) -> PdksRawEvent[].
// Excel yükleme akışına gerek yok — bkz. supabase/migrations/0001_init.sql notu.
import "server-only";
import { supabaseServer } from "../supabaseServer";
import type { PdksRawEvent } from "../../engine/types";
import { utcIsoToWallClock, wallClockToUtcIso } from "../../engine/tz";

const COLS =
  "sicil_no, ad, soyad, firma, alt_firma, pozisyon, bolum, event_time, giris_kapisi, kapi_no";

const PAGE = 1000; // PostgREST üst sınırı
const CONCURRENCY = 12; // paralel sayfa isteği (seri çekim 60k kayıtta ~15sn sürüyor)

interface TurnikeGecisRow {
  sicil_no: string;
  ad: string | null;
  soyad: string | null;
  firma: string | null;
  alt_firma: string | null;
  pozisyon: string | null; // = takım lideri adı (kullanıcı teyidi)
  bolum: string | null;
  event_time: string; // gerçek UTC
  giris_kapisi: string; // = okuyucu adı
  kapi_no: number | null;
}

export interface PersonInfo {
  sicil: string;
  ad: string;
  soyad: string;
  takimLideri: string; // en son görülen `pozisyon` değeri
  bolum: string;
  firma: string;
  unvan: string; // alt_firma
}

export interface PdksEventsResult {
  events: PdksRawEvent[];
  personByS: Map<string, PersonInfo>;
}

// Süreç-içi (in-memory) önbellek. Next'in veri önbelleği (unstable_cache / use cache)
// girdi başına ~2 MB sınırlı; 2 haftalık veri ~60k satır / ~15 MB olduğu için oraya
// hiç yazılamıyor ve her istek yeniden çekiyordu (~2.3 sn). Kaynak tablo toplu
// senkronizasyonla (aktarim_zamani) güncellendiği için saniyelik tazelik gerekmiyor.
// Sunucu örneği sıcak kaldığı sürece sayfa geçişleri anında olur.
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 4;
const rowCache = new Map<string, { at: number; rows: TurnikeGecisRow[] }>();

async function fetchEventRowsCached(gte: string, lt: string): Promise<TurnikeGecisRow[]> {
  const key = `${gte}..${lt}`;
  const hit = rowCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rows;

  const rows = await fetchEventRows(gte, lt);

  rowCache.set(key, { at: Date.now(), rows });
  // En eski girdileri at (bellek şişmesin).
  while (rowCache.size > CACHE_MAX_ENTRIES) {
    const oldest = [...rowCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (!oldest) break;
    rowCache.delete(oldest[0]);
  }
  return rows;
}

async function fetchEventRows(gte: string, lt: string): Promise<TurnikeGecisRow[]> {
  const sb = supabaseServer();
  const base = () =>
    sb.from("turnike_gecisler").select(COLS).gte("event_time", gte).lt("event_time", lt);

  const { count, error: cErr } = await sb
    .from("turnike_gecisler")
    .select("sicil_no", { count: "exact", head: true })
    .gte("event_time", gte)
    .lt("event_time", lt);
  if (cErr) throw new Error(`turnike_gecisler sayılamadı: ${cErr.message}`);

  const total = count ?? 0;
  const pageCount = Math.ceil(total / PAGE);
  const rows: TurnikeGecisRow[] = [];

  for (let i = 0; i < pageCount; i += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, pageCount - i) }, (_, k) => i + k);
    const results = await Promise.all(
      batch.map((p) =>
        base()
          .order("event_time", { ascending: true })
          .order("sicil_no", { ascending: true })
          .range(p * PAGE, p * PAGE + PAGE - 1)
      )
    );
    for (const r of results) {
      if (r.error) throw new Error(`turnike_gecisler okunamadı: ${r.error.message}`);
      rows.push(...((r.data ?? []) as unknown as TurnikeGecisRow[]));
    }
  }

  rows.sort((a, b) => a.event_time.localeCompare(b.event_time));
  return rows;
}

/**
 * Duvar saati cinsinden [startWall, endWall) aralığındaki geçişleri okur.
 * Sorgu sınırları gerçek UTC'ye çevrilir (bkz. lib/engine/tz.ts).
 */
export async function fetchPdksEvents(startWall: Date, endWall: Date): Promise<PdksEventsResult> {
  const rows = await fetchEventRowsCached(
    wallClockToUtcIso(startWall),
    wallClockToUtcIso(endWall)
  );

  const events: PdksRawEvent[] = [];
  const personByS = new Map<string, PersonInfo>();

  rows.forEach((r, idx) => {
    events.push({
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
    });

    // rows kronolojik sıralı olduğu için son yazan en güncel bilgidir.
    personByS.set(r.sicil_no, {
      sicil: r.sicil_no,
      ad: (r.ad ?? "").trim(),
      soyad: (r.soyad ?? "").trim(),
      takimLideri: (r.pozisyon ?? "").trim() || "Bilinmiyor",
      bolum: (r.bolum ?? "").trim(),
      firma: (r.firma ?? "").trim(),
      unvan: (r.alt_firma ?? "").trim(),
    });
  });

  return { events, personByS };
}

/** Kapı Ayarları ekranı için: veride görülen tüm okuyucu adları. */
export async function fetchDistinctReaders(): Promise<string[]> {
  const sb = supabaseServer();
  const set = new Set<string>();
  for (let p = 0; p < 20; p++) {
    const { data, error } = await sb
      .from("turnike_gecisler")
      .select("giris_kapisi")
      .order("event_time", { ascending: false })
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (error) throw new Error(`okuyucular okunamadı: ${error.message}`);
    const batch = (data ?? []) as unknown as { giris_kapisi: string }[];
    batch.forEach((r) => r.giris_kapisi && set.add(r.giris_kapisi));
    if (batch.length < PAGE) break;
  }
  return [...set].sort((a, b) => a.localeCompare(b, "tr"));
}
