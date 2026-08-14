// CorDB portu (pdks_app_stabil_v8_4.py satır ~531).
// Anahtar (sicil, tarih); aynı anahtarla tekrar eklenirse ÜZERİNE YAZAR
// (Python'daki "eski kaydı sil, yenisini ekle" davranışının Postgres upsert karşılığı).
import "server-only";
import { supabaseServer } from "../supabaseServer";
import type { Correction, CorrectionLookup } from "../../engine/summary";

export interface CorrectionRow {
  sicil: string;
  tarih: string; // dd.MM.yyyy
  ad_soyad: string;
  neden: string;
  orig_min: number;
  yeni_min: number;
  acik: string;
  ts: string;
}

/** Tüm düzeltmeleri okur ve engine'in beklediği lookup arayüzünü döner. */
export async function loadCorrections(): Promise<{
  rows: CorrectionRow[];
  lookup: CorrectionLookup;
}> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("corrections")
    .select("sicil, tarih, ad_soyad, neden, orig_min, yeni_min, acik, ts")
    .order("ts", { ascending: false });
  if (error) throw new Error(`corrections okunamadı: ${error.message}`);
  const rows = (data ?? []) as unknown as CorrectionRow[];

  const map = new Map<string, Correction>();
  for (const r of rows) {
    map.set(`${r.sicil}::${r.tarih}`, {
      sicil: r.sicil,
      tarih: r.tarih,
      yeni: Number(r.yeni_min) || 0,
      neden: r.neden,
      orig: Number(r.orig_min) || 0,
      acik: r.acik,
    });
  }

  return {
    rows,
    lookup: {
      get(sicil: string, gs: string) {
        return map.get(`${sicil}::${gs}`);
      },
    },
  };
}

export async function upsertCorrection(input: {
  sicil: string;
  tarih: string;
  adSoyad: string;
  neden: string;
  origMin: number;
  yeniMin: number;
  acik: string;
}): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from("corrections").upsert(
    {
      sicil: input.sicil,
      tarih: input.tarih,
      ad_soyad: input.adSoyad,
      neden: input.neden,
      orig_min: input.origMin,
      yeni_min: input.yeniMin,
      acik: input.acik,
      ts: new Date().toISOString(),
    },
    { onConflict: "sicil,tarih" }
  );
  if (error) throw new Error(`Düzeltme kaydedilemedi: ${error.message}`);
}

export async function deleteCorrection(sicil: string, tarih: string): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from("corrections").delete().eq("sicil", sicil).eq("tarih", tarih);
  if (error) throw new Error(`Düzeltme silinemedi: ${error.message}`);
}

/** Boş lookup — düzeltmesiz hesaplama gerektiğinde. */
export const emptyCorrectionLookup: CorrectionLookup = { get: () => undefined };
