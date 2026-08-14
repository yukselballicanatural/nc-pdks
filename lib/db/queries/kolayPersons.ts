import "server-only";
import { supabaseServer } from "../supabaseServer";
import { isMissingTable } from "./teams";
import type { KolayPersonDetail } from "../../kolay/client";

export interface KolayPersonRow {
  kolayId: string;
  ad: string;
  soyad: string;
  tamAd: string;
  bolum: string | null;
  departman: string | null;
  unvan: string | null;
  managerKolayId: string | null;
  durum: string;
  syncedAt: string | null;
}

interface DbRow {
  kolay_id: string;
  ad: string | null;
  soyad: string | null;
  tam_ad: string | null;
  bolum: string | null;
  departman: string | null;
  unvan: string | null;
  manager_kolay_id: string | null;
  durum: string | null;
  synced_at: string | null;
}

export async function fetchKolayPersonsCache(): Promise<KolayPersonRow[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("kolay_persons")
    .select("kolay_id, ad, soyad, tam_ad, bolum, departman, unvan, manager_kolay_id, durum, synced_at");
  if (error) {
    if (isMissingTable(error.message)) return [];
    throw new Error(`kolay_persons okunamadı: ${error.message}`);
  }
  return ((data ?? []) as unknown as DbRow[]).map((r) => ({
    kolayId: r.kolay_id,
    ad: r.ad ?? "",
    soyad: r.soyad ?? "",
    tamAd: r.tam_ad ?? `${r.ad ?? ""} ${r.soyad ?? ""}`.trim(),
    bolum: r.bolum,
    departman: r.departman,
    unvan: r.unvan,
    managerKolayId: r.manager_kolay_id,
    durum: r.durum ?? "active",
    syncedAt: r.synced_at,
  }));
}

const BATCH = 200;

/**
 * Kolay'dan gelen kayıtları önbelleğe yazar. Kolay'da artık görünmeyen kişiler
 * silinir — ayrılan biri takım listesinde kalmamalı.
 */
export async function replaceKolayPersonsCache(rows: KolayPersonDetail[]): Promise<number> {
  const sb = supabaseServer();
  const now = new Date().toISOString();

  const payload = rows.map((p) => ({
    kolay_id: p.id,
    ad: p.ad,
    soyad: p.soyad,
    tam_ad: p.tamAd,
    is_eposta: p.isEposta,
    bolum: p.bolum,
    departman: p.departman,
    unvan: p.unvan,
    firma: p.firma,
    sube: p.sube,
    manager_kolay_id: p.managerKolayId,
    ise_giris: p.iseGiris,
    durum: p.durum,
    synced_at: now,
  }));

  for (let i = 0; i < payload.length; i += BATCH) {
    const { error } = await sb
      .from("kolay_persons")
      .upsert(payload.slice(i, i + BATCH), { onConflict: "kolay_id" });
    if (error) throw new Error(`kolay_persons yazılamadı: ${error.message}`);
  }

  // Bu turda görülmeyenleri temizle.
  const { error: delErr } = await sb.from("kolay_persons").delete().lt("synced_at", now);
  if (delErr) throw new Error(`kolay_persons temizlenemedi: ${delErr.message}`);

  return payload.length;
}
