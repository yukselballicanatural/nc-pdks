// Zaman Takip sayfası için ham veri: time_tracker_events'teki oturumları
// (mesai / mola / klinik / toplantı / yemek) kişi bazında listeler.
//
// loadTrackerData'dan (lib/data/loadTracker.ts) FARKI: o dosya yalnızca Mola
// Detayı'nın turnike dışı süreleri açıklamak için ihtiyaç duyduğu şeyi tutar
// (eşleşen sicillerin mola/klinik/toplantı/yemek aralıkları, mesai hariç).
// Bu sayfa "kim ne yapmış" sorusuna cevap veriyor — mesai (checkin/checkout)
// dahil TÜM oturum türleri ve eşleşmeyen kayıtlar da (kim olduğu bilinmese
// bile) ayrı bir satır olarak görünür, çünkü "hiç kimseye bağlanamayan bir
// kayıt var" bilgisi de admin için önemli.
import "server-only";
import { fetchTrackerEvents, type TrackerEventRow } from "../db/queries/timeTracker";
import { fetchPersonnel } from "../db/queries/materialized";
import { supabaseServer } from "../db/supabaseServer";
import { wallClockToUtcIso } from "../engine/tz";
import { addDays, formatGs, formatHm } from "../engine/mesaiGunu";
import {
  buildKimlikIndeksi,
  kimlikCoz,
  type KimlikYolu,
  type ZohoKimlik,
} from "../tracker/kimlik";
import { olaylardanAraliklar, type TrackerAralik } from "../tracker/araliklar";
import type { DateRange } from "./loadPdks";

export interface TrackerLogRow {
  key: string;
  sicil: string | null;
  adSoyad: string;
  unvan: string | null;
  /** null = hiçbir sicile bağlanamadı. */
  eslesme: KimlikYolu | null;
  /** "Mesai" | "Mola" | "Klinik" | "Toplantı" | "Yemek" | kaynaktaki başka bir ad. */
  tur: string;
  tarih: string;
  baslangic: string;
  /** null = henüz kapatılmamış (bitiş bildirimi gelmemiş). */
  bitis: string | null;
  /** null = açık oturum, süresi bilinmiyor. */
  sureDk: number | null;
  acik: boolean;
}

export interface TrackerLogData {
  kullanilabilir: boolean;
  hata: string | null;
  olaySayisi: number;
  rows: TrackerLogRow[];
  eslesmeyenOlay: number;
}

interface ZohoDbRow {
  id: string;
  full_name: string | null;
  original_agent_name: string | null;
  email: string | null;
  raw: { zuid?: unknown; Employment_No?: unknown } | null;
}

async function fetchZohoKimlikler(): Promise<ZohoKimlik[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("zoho_users")
    .select("id, full_name, original_agent_name, email, raw");
  if (error) throw new Error(`zoho_users okunamadı: ${error.message}`);
  return ((data ?? []) as unknown as ZohoDbRow[]).map((u) => ({
    id: u.id,
    zuid: u.raw?.zuid != null ? String(u.raw.zuid).trim() : null,
    employmentNo: u.raw?.Employment_No != null ? String(u.raw.Employment_No).trim() : null,
    eposta: u.email,
    ad: (u.original_agent_name || u.full_name || "").trim(),
  }));
}

/** Bir grup içindeki her olay aynı kişiye ait sayılır; ilk olayın kimliği yeterli. */
function grupAnahtari(e: TrackerEventRow): string {
  return e.userId?.trim() || (e.userName ? `ad:${e.userName.trim()}` : "bilinmeyen");
}

function tarihSaat(d: Date): { tarih: string; saat: string } {
  return { tarih: formatGs(d), saat: formatHm(d) };
}

function aralikSatirlari(
  kimlik: { sicil: string | null; adSoyad: string; unvan: string | null; eslesme: KimlikYolu | null },
  grupKey: string,
  aralar: TrackerAralik[],
  mesai: TrackerAralik[]
): TrackerLogRow[] {
  const rows: TrackerLogRow[] = [];
  let i = 0;
  for (const a of [...mesai, ...aralar]) {
    const { tarih, saat: baslangic } = tarihSaat(a.bas);
    const bitis = a.bit ? tarihSaat(a.bit).saat : null;
    const sureDk = a.bit ? Math.round((a.bit.getTime() - a.bas.getTime()) / 60000) : null;
    rows.push({
      key: `${grupKey}-${i++}-${a.bas.getTime()}`,
      sicil: kimlik.sicil,
      adSoyad: kimlik.adSoyad,
      unvan: kimlik.unvan,
      eslesme: kimlik.eslesme,
      tur: a.etiket,
      tarih,
      baslangic,
      bitis,
      sureDk,
      acik: a.bit === null,
    });
  }
  return rows;
}

export async function loadTrackerLog(range: DateRange): Promise<TrackerLogData> {
  const utcBas = wallClockToUtcIso(range.sd);
  const utcBit = wallClockToUtcIso(addDays(range.ed, 1));

  let olaylar: TrackerEventRow[];
  try {
    olaylar = await fetchTrackerEvents(utcBas, utcBit);
  } catch (e) {
    return {
      kullanilabilir: false,
      hata: e instanceof Error ? e.message : "tracker okunamadı",
      olaySayisi: 0,
      rows: [],
      eslesmeyenOlay: 0,
    };
  }

  if (olaylar.length === 0) {
    return { kullanilabilir: false, hata: null, olaySayisi: 0, rows: [], eslesmeyenOlay: 0 };
  }

  const [personByS, zoho] = await Promise.all([fetchPersonnel(), fetchZohoKimlikler()]);
  const ix = buildKimlikIndeksi(
    zoho,
    [...personByS.values()].map((p) => ({ sicil: p.sicil, ad: p.ad, soyad: p.soyad }))
  );

  const gruplar = new Map<string, TrackerEventRow[]>();
  for (const o of olaylar) {
    const k = grupAnahtari(o);
    const liste = gruplar.get(k);
    if (liste) liste.push(o);
    else gruplar.set(k, [o]);
  }

  const rows: TrackerLogRow[] = [];
  let eslesmeyenOlay = 0;

  for (const [grupKey, liste] of gruplar) {
    liste.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const ilk = liste[0];
    const hit = kimlikCoz({ userId: ilk.userId, userName: ilk.userName, email: ilk.email }, ix);

    const kimlik = hit
      ? {
          sicil: hit.sicil,
          adSoyad: (() => {
            const p = personByS.get(hit.sicil);
            return p ? `${p.ad} ${p.soyad}`.trim() || hit.sicil : hit.sicil;
          })(),
          unvan: personByS.get(hit.sicil)?.unvan ?? null,
          eslesme: hit.yol,
        }
      : {
          sicil: null,
          adSoyad: (ilk.userName ?? "").trim() || "(bilinmeyen)",
          unvan: null,
          eslesme: null,
        };

    if (!hit) eslesmeyenOlay += liste.length;

    const { aralar, mesai } = olaylardanAraliklar(liste);
    rows.push(...aralikSatirlari(kimlik, grupKey, aralar, mesai));
  }

  rows.sort((a, b) => {
    const t = `${b.tarih.split(".").reverse().join("-")}T${b.baslangic}`.localeCompare(
      `${a.tarih.split(".").reverse().join("-")}T${a.baslangic}`
    );
    return t;
  });

  return {
    kullanilabilir: true,
    hata: null,
    olaySayisi: olaylar.length,
    rows,
    eslesmeyenOlay,
  };
}
