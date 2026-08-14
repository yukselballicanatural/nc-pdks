// Bir PDKS sicilinin İK sistemlerindeki karşılıkları.
//
// Kişi üç sistemde üç ayrı kimlikle duruyor: PDKS'te sicil, Zoho'da id,
// Kolay'da id. Lider atarken arayüz sicil gönderiyor (tek anlamlı kimlik),
// veritabanı ise kaynak kimliklerini saklıyor — dönüşüm burada yapılır.
import "server-only";
import { fetchZohoUsers } from "../db/queries/zohoUsers";
import { fetchKolayPersonsCache } from "../db/queries/kolayPersons";
import { fetchPersonnel } from "../db/queries/materialized";
import { buildZohoMatchIndex, matchZohoUser } from "../matching/textMatch";
import { buildKolayIndex, matchKolayPerson } from "../kolay/match";

export async function resolveIdentity(
  sicil: string
): Promise<{ zohoId: string | null; kolayId: string | null }> {
  const [zoho, kolay, personByS] = await Promise.all([
    fetchZohoUsers(),
    fetchKolayPersonsCache(),
    fetchPersonnel(),
  ]);

  const p = personByS.get(sicil);
  if (!p) return { zohoId: null, kolayId: null };

  const zohoHit = matchZohoUser(sicil, p.ad, p.soyad, buildZohoMatchIndex(zoho.raw));
  const kolayHit = matchKolayPerson(
    p.ad,
    p.soyad,
    buildKolayIndex(kolay.map((k) => ({ id: k.kolayId, firstName: k.ad, lastName: k.soyad })))
  );

  return { zohoId: zohoHit?.zohoId ?? null, kolayId: kolayHit?.person.id ?? null };
}
