// Tracker verisinin PDKS ile birleştirilmesi.
//
// Turnike verisi kişinin binadan çıktığını gösteriyor, nedenini göstermiyor.
// Bu modül time_tracker_events'i sicile bağlayıp kişi başına aralık listesi
// üretiyor; Mola Detayı ekranı turnike dışı aralıklarla kesiştirerek "bu 40
// dakika klinikteydi" diyebiliyor.
//
// GÜN SINIRI PROBLEMİNDEN KAÇINMA: tracker'ın kendi `day_key` alanına ya da mesai
// günü kuralına hiç dokunulmuyor. Aralıklar kişi bazında düz bir liste olarak
// tutuluyor ve eşleştirme SAAT ÇAKIŞMASIYLA yapılıyor. Böylece gece vardiyasında
// günün 12:00'de dönmesi gibi kurallar burada tekrar edilmek zorunda kalmıyor —
// tek doğruluk kaynağı vardiya aralıklarının kendisi.
import "server-only";
import { fetchTrackerEvents, type TrackerEventRow } from "../db/queries/timeTracker";
import { fetchPersonnel } from "../db/queries/materialized";
import { supabaseServer } from "../db/supabaseServer";
import { wallClockToUtcIso } from "../engine/tz";
import { addDays } from "../engine/mesaiGunu";
import {
  buildKimlikIndeksi,
  kimlikCoz,
  type KimlikYolu,
  type ZohoKimlik,
} from "../tracker/kimlik";
import { olaylardanAraliklar, type TrackerAralik } from "../tracker/araliklar";
import type { DateRange } from "./loadPdks";

export interface TrackerData {
  /** Tablo var ve dönemde kayıt bulundu mu? */
  kullanilabilir: boolean;
  hata: string | null;
  /** Dönemde okunan ham olay sayısı. */
  olaySayisi: number;
  /** sicil -> aralıklar. */
  bySicil: Map<string, TrackerAralik[]>;
  /** Kaç olay hangi yolla eşleşti — arayüzde güven göstermek için. */
  yolSayilari: Record<KimlikYolu, number>;
  /** Sicile bağlanamayan olay sayısı. */
  eslesmeyenOlay: number;
  /** Sicile bağlanamayan kişi adları (tekilleştirilmiş). */
  eslesmeyenAdlar: string[];
  /** Kapanmamış (break_stop/checkout gelmemiş) kayıt sayısı. */
  kapanmamis: number;
}

const BOS: TrackerData = {
  kullanilabilir: false,
  hata: null,
  olaySayisi: 0,
  bySicil: new Map(),
  yolSayilari: { zuid: 0, zoho_id: 0, eposta: 0, isim: 0 },
  eslesmeyenOlay: 0,
  eslesmeyenAdlar: [],
  kapanmamis: 0,
};

interface ZohoDbRow {
  id: string;
  full_name: string | null;
  original_agent_name: string | null;
  email: string | null;
  raw: { zuid?: unknown; Employment_No?: unknown } | null;
}

/** Eşleştirme için gereken en küçük Zoho alan kümesi. */
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
    // original_agent_name gerçek isim; full_name şirket içi takma ad olabiliyor.
    ad: (u.original_agent_name || u.full_name || "").trim(),
  }));
}

export async function loadTrackerData(range: DateRange): Promise<TrackerData> {
  // Gece vardiyası payı için aralığı genişletiyoruz (paddedRange ile aynı mantık).
  const utcBas = wallClockToUtcIso(addDays(range.sd, -1));
  const utcBit = wallClockToUtcIso(addDays(range.ed, 2));

  let olaylar: TrackerEventRow[];
  try {
    olaylar = await fetchTrackerEvents(utcBas, utcBit);
  } catch (e) {
    return { ...BOS, hata: e instanceof Error ? e.message : "tracker okunamadı" };
  }

  if (olaylar.length === 0) return { ...BOS, kullanilabilir: false };

  const [personByS, zoho] = await Promise.all([fetchPersonnel(), fetchZohoKimlikler()]);
  const ix = buildKimlikIndeksi(
    zoho,
    [...personByS.values()].map((p) => ({ sicil: p.sicil, ad: p.ad, soyad: p.soyad }))
  );

  // Önce olayları sicile göre grupla; aralık üretimi kişi bazında sıralı olmalı.
  const olaylarBySicil = new Map<string, TrackerEventRow[]>();
  const yolSayilari: Record<KimlikYolu, number> = { zuid: 0, zoho_id: 0, eposta: 0, isim: 0 };
  let eslesmeyenOlay = 0;
  const eslesmeyenAdlar = new Set<string>();

  for (const o of olaylar) {
    const hit = kimlikCoz({ userId: o.userId, userName: o.userName, email: o.email }, ix);
    if (!hit) {
      eslesmeyenOlay++;
      const ad = (o.userName ?? "").trim();
      if (ad) eslesmeyenAdlar.add(ad);
      continue;
    }
    yolSayilari[hit.yol]++;
    const liste = olaylarBySicil.get(hit.sicil);
    if (liste) liste.push(o);
    else olaylarBySicil.set(hit.sicil, [o]);
  }

  const bySicil = new Map<string, TrackerAralik[]>();
  let kapanmamis = 0;
  for (const [sicil, liste] of olaylarBySicil) {
    const gun = olaylardanAraliklar(liste);
    kapanmamis += gun.kapanmamis;
    if (gun.aralar.length > 0) bySicil.set(sicil, gun.aralar);
  }

  return {
    kullanilabilir: true,
    hata: null,
    olaySayisi: olaylar.length,
    bySicil,
    yolSayilari,
    eslesmeyenOlay,
    eslesmeyenAdlar: [...eslesmeyenAdlar].sort((a, b) => a.localeCompare(b, "tr")),
    kapanmamis,
  };
}
