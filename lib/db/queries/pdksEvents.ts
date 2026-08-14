// turnike_gecisler (canlı Supabase tablosu, harici/senkronize) -> PdksRawEvent[].
// Excel yükleme akışına gerek yok — bkz. supabase/migrations/0001_init.sql notu.
import "server-only";
import { supabaseServer } from "../supabaseServer";
import type { PdksRawEvent } from "../../engine/types";

interface TurnikeGecisRow {
  source_id: number;
  sicil_no: string;
  ad: string;
  soyad: string;
  firma: string | null;
  alt_firma: string | null;
  pozisyon: string | null; // = takım lideri adı (kullanıcı teyidi)
  bolum: string | null;
  event_time: string; // ISO
  giris_kapisi: string; // = okuyucu adı
  kapi_no: number | null;
  elendi: boolean; // bilgi amaçlı; work/break ayrımını biz kendimiz de hesaplıyoruz
}

export interface PersonInfo {
  sicil: string;
  ad: string;
  soyad: string;
  takimLideri: string; // en son (event_time'a göre) görülen pozisyon değeri
  bolum: string;
  firma: string;
}

export interface PdksEventsResult {
  events: PdksRawEvent[];
  /** sicil -> en son bilinen kişi bilgisi (TL dahil) — is_gece ve UI listeleme için. */
  personByS: Map<string, PersonInfo>;
}

/**
 * Belirli tarih aralığındaki turnike geçişlerini okur. `startIso`/`endIso` dahil
 * (inclusive) sınırlardır, event_time bu aralıkta olan satırlar getirilir.
 */
export async function fetchPdksEvents(startIso: string, endIso: string): Promise<PdksEventsResult> {
  const sb = supabaseServer();
  const pageSize = 1000;
  let from = 0;
  const rows: TurnikeGecisRow[] = [];

  // Supabase/PostgREST varsayılan sayfa limiti var — tüm satırları sayfalı çekiyoruz.
  while (true) {
    const { data, error } = await sb
      .from("turnike_gecisler")
      .select("source_id, sicil_no, ad, soyad, firma, alt_firma, pozisyon, bolum, event_time, giris_kapisi, kapi_no, elendi")
      .gte("event_time", startIso)
      .lte("event_time", endIso)
      .order("event_time", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`turnike_gecisler okunamadı: ${error.message}`);
    const batch = (data ?? []) as unknown as TurnikeGecisRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }

  const events: PdksRawEvent[] = [];
  const personByS = new Map<string, PersonInfo>();
  const lastSeenTs = new Map<string, number>();

  rows.forEach((r, idx) => {
    const dt = new Date(r.event_time);
    events.push({
      sicil: r.sicil_no,
      ad: (r.ad ?? "").trim(),
      soyad: (r.soyad ?? "").trim(),
      dt,
      ok: r.giris_kapisi ?? "",
      firma: r.firma ?? "",
      sube: r.alt_firma ?? "",
      dept: r.bolum ?? "",
      dir: "",
      idx,
    });

    const ts = dt.getTime();
    const prevTs = lastSeenTs.get(r.sicil_no) ?? -Infinity;
    if (ts >= prevTs) {
      lastSeenTs.set(r.sicil_no, ts);
      personByS.set(r.sicil_no, {
        sicil: r.sicil_no,
        ad: (r.ad ?? "").trim(),
        soyad: (r.soyad ?? "").trim(),
        takimLideri: (r.pozisyon ?? "").trim() || "Bilinmiyor",
        bolum: r.bolum ?? "",
        firma: r.firma ?? "",
      });
    }
  });

  return { events, personByS };
}
