// Kolay İK personel önbelleğinin tazelenmesi.
//
// Neden önbellek: bulk-view 50'lik gruplar hâlinde çalışıyor, 370 çalışan için
// 8 ardışık istek gerekiyor (~5-10 sn). Bunu her sayfa açılışında yapmak
// kabul edilemez; turnike verisindeki materyalize yaklaşımın aynısını uyguluyoruz.
import "server-only";
import { fetchAllKolayDetails } from "./client";
import { replaceKolayPersonsCache } from "../db/queries/kolayPersons";
import { SALES_POZISYON } from "../engine/scope";

export interface KolaySyncResult {
  toplam: number;
  satis: number;
  departmanSayisi: number;
}

export async function syncKolayPersons(): Promise<KolaySyncResult> {
  const details = await fetchAllKolayDetails();
  await replaceKolayPersonsCache(details);

  const satis = details.filter((p) => p.bolum === SALES_POZISYON);
  const deps = new Set(satis.map((p) => p.departman).filter(Boolean));

  return { toplam: details.length, satis: satis.length, departmanSayisi: deps.size };
}
