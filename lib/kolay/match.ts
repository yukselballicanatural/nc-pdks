// Kolay İK kişisi ↔ PDKS sicil eşleştirmesi.
//
// Kolay'ın person/list yanıtı yalnızca id + ad + soyad veriyor (sicil/TCKN alanı
// bu uç noktada yok), bu yüzden eşleştirme isim üzerinden yapılmak zorunda.
// PDKS ad/soyad'ı da turnike cihazından geldiği için aynı normalizasyonu
// (lib/engine/textNorm) kullanıyoruz: Türkçe harfler, fazla boşluk, büyük/küçük.
//
// Ad-soyad sırası iki sistemde ters girilmiş olabildiği için sıralı anahtarın
// yanında SIRASIZ (kelimeleri alfabetik dizilmiş) bir anahtar da tutuyoruz.
import { textNorm } from "../engine/textNorm";
import type { KolayPerson } from "./client";

function sortedKey(s: string): string {
  return textNorm(s).split(" ").filter(Boolean).sort().join(" ");
}

export interface KolayMatchIndex {
  byName: Map<string, KolayPerson>;
  bySortedName: Map<string, KolayPerson[]>;
  /** Kısmi (alt-küme) eşleştirme için kelime kümeleri. */
  tokenSets: { person: KolayPerson; tokens: Set<string> }[];
}

function tokenSet(s: string): Set<string> {
  return new Set(
    textNorm(s)
      .split(" ")
      .filter((t) => t.length > 1)
  );
}

export function buildKolayIndex(people: KolayPerson[]): KolayMatchIndex {
  const byName = new Map<string, KolayPerson>();
  const bySortedName = new Map<string, KolayPerson[]>();
  for (const p of people) {
    const full = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    const k = textNorm(full);
    if (k && !byName.has(k)) byName.set(k, p);
    const sk = sortedKey(full);
    if (sk) {
      const list = bySortedName.get(sk) ?? [];
      list.push(p);
      bySortedName.set(sk, list);
    }
  }
  const tokenSets = people.map((p) => ({
    person: p,
    tokens: tokenSet(`${p.firstName ?? ""} ${p.lastName ?? ""}`),
  }));
  return { byName, bySortedName, tokenSets };
}

export type KolayMatchKind = "isim" | "isim_sirasiz" | "isim_kismi";

/**
 * PDKS ad/soyad'a karşılık gelen Kolay kişisini bulur.
 * Sırasız eşleşme birden fazla adaya denk geliyorsa eşleşme SAYILMAZ — yanlış
 * kişiye izin atamak, eşleşmemekten daha kötü.
 */
export function matchKolayPerson(
  ad: string,
  soyad: string,
  index: KolayMatchIndex
): { person: KolayPerson; kind: KolayMatchKind } | undefined {
  const full = `${ad} ${soyad}`.trim();

  const exact = index.byName.get(textNorm(full));
  if (exact) return { person: exact, kind: "isim" };

  const cands = index.bySortedName.get(sortedKey(full));
  if (cands && cands.length === 1) return { person: cands[0], kind: "isim_sirasiz" };

  // Kısmi eşleşme: Kolay'da ikinci/üçüncü ad da yazılmış olabiliyor
  // ("MARIAM ELAZABY" ↔ "MARIAM ASHRAF MAAMOUN AHMED ELAZABY"). Bir tarafın
  // kelimelerinin tamamı diğerinde geçiyorsa ve TEK aday varsa kabul edilir.
  //
  // Bu eşleşme türü DAHA ZAYIF: "AHMED ANWAR" ile "AHMED ANWAR MOHAME
  // ABDELKARIM" farklı kişiler olabilir. Bu yüzden ayrı bir tür olarak
  // döndürülüyor; arayüz bunları "kontrol edilmeli" diye işaretler ve
  // otomatik olarak izin ataması yapılmaz.
  const pt = tokenSet(full);
  if (pt.size >= 2) {
    const hits = index.tokenSets.filter(({ tokens }) => {
      if (tokens.size < 2) return false;
      const ileri = [...pt].every((t) => tokens.has(t));
      const geri = [...tokens].every((t) => pt.has(t));
      return ileri || geri;
    });
    if (hits.length === 1) return { person: hits[0].person, kind: "isim_kismi" };
  }

  return undefined;
}
