// Ham turnike_gecisler okuma. Artık SADECE iki yerde kullanılır:
//   1) senkronizasyon (lib/sync/runSync.ts) — sonuçları materyalize eder
//   2) tek kişi/gün detayı (alarm modalı) ve Geçiş Kayıtları sayfası
// Sayfaların geneli önceden hesaplanmış pdks_* tablolarından okur.
import "server-only";
import { supabaseServer } from "../supabaseServer";
import { wallClockToUtcIso } from "../../engine/tz";

const COLS =
  "source_id, sicil_no, ad, soyad, firma, alt_firma, pozisyon, bolum, event_time, giris_kapisi, kapi_no";

const PAGE = 1000; // PostgREST üst sınırı
const CONCURRENCY = 12;

export interface RawRow {
  source_id: number;
  sicil_no: string;
  ad: string | null;
  soyad: string | null;
  firma: string | null;
  alt_firma: string | null;
  pozisyon: string | null; // = takım lideri adı
  bolum: string | null;
  event_time: string; // gerçek UTC
  giris_kapisi: string;
  kapi_no: number | null;
}

/** Duvar saati [startWall, endWall) aralığındaki tüm ham satırlar (sayfalı, paralel). */
export async function fetchRawRows(startWall: Date, endWall: Date): Promise<RawRow[]> {
  const sb = supabaseServer();
  const gte = wallClockToUtcIso(startWall);
  const lt = wallClockToUtcIso(endWall);

  const { count, error: cErr } = await sb
    .from("turnike_gecisler")
    .select("source_id", { count: "exact", head: true })
    .gte("event_time", gte)
    .lt("event_time", lt);
  if (cErr) throw new Error(`turnike_gecisler sayılamadı: ${cErr.message}`);

  const total = count ?? 0;
  const pageCount = Math.ceil(total / PAGE);
  const rows: RawRow[] = [];

  for (let i = 0; i < pageCount; i += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, pageCount - i) }, (_, k) => i + k);
    const results = await Promise.all(
      batch.map((p) =>
        sb
          .from("turnike_gecisler")
          .select(COLS)
          .gte("event_time", gte)
          .lt("event_time", lt)
          .order("event_time", { ascending: true })
          .order("sicil_no", { ascending: true })
          .range(p * PAGE, p * PAGE + PAGE - 1)
      )
    );
    for (const r of results) {
      if (r.error) throw new Error(`turnike_gecisler okunamadı: ${r.error.message}`);
      rows.push(...((r.data ?? []) as unknown as RawRow[]));
    }
  }

  rows.sort((a, b) => a.event_time.localeCompare(b.event_time) || a.source_id - b.source_id);
  return rows;
}

/** Tek kişinin belirli aralıktaki kayıtları (alarm detay modalı için — küçük ve hızlı). */
export async function fetchRawRowsForPerson(
  sicil: string,
  startWall: Date,
  endWall: Date
): Promise<RawRow[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("turnike_gecisler")
    .select(COLS)
    .eq("sicil_no", sicil)
    .gte("event_time", wallClockToUtcIso(startWall))
    .lt("event_time", wallClockToUtcIso(endWall))
    .order("event_time", { ascending: true })
    .limit(1000);
  if (error) throw new Error(`turnike_gecisler okunamadı: ${error.message}`);
  return (data ?? []) as unknown as RawRow[];
}

/**
 * Geçiş Kayıtları sayfası: en yeni N kayıt (veritabanı tarafında sınırlanır,
 * böylece 60 binlik dönemlerde bile tek sorgu yeter).
 */
export async function fetchRecentRawRows(
  startWall: Date,
  endWall: Date,
  limit: number
): Promise<{ rows: RawRow[]; total: number }> {
  const sb = supabaseServer();
  const gte = wallClockToUtcIso(startWall);
  const lt = wallClockToUtcIso(endWall);

  const { count, error: cErr } = await sb
    .from("turnike_gecisler")
    .select("source_id", { count: "exact", head: true })
    .gte("event_time", gte)
    .lt("event_time", lt);
  if (cErr) throw new Error(`turnike_gecisler sayılamadı: ${cErr.message}`);

  const pages = Math.ceil(Math.min(limit, count ?? 0) / PAGE);
  const rows: RawRow[] = [];
  const results = await Promise.all(
    Array.from({ length: pages }, (_, p) =>
      sb
        .from("turnike_gecisler")
        .select(COLS)
        .gte("event_time", gte)
        .lt("event_time", lt)
        .order("event_time", { ascending: false })
        .range(p * PAGE, p * PAGE + PAGE - 1)
    )
  );
  for (const r of results) {
    if (r.error) throw new Error(`turnike_gecisler okunamadı: ${r.error.message}`);
    rows.push(...((r.data ?? []) as unknown as RawRow[]));
  }
  return { rows, total: count ?? 0 };
}
