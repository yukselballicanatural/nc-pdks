// time_tracker_events kaydı ↔ PDKS sicil eşleştirmesi.
//
// ÖLÇÜLEN GERÇEKLER (canlı veri, 2026-08-17) — varsayım değil:
//
//   * `user_id` Zoho kullanıcı kimliği DEĞİL. zoho_users.id değerlerinin tamamı
//     "645008" ön ekli; tracker'daki gerçek kayıt ise 20111581669 ve bu, Zoho'nun
//     `raw.zuid` alanına denk geliyor. Bu yüzden ÖNCE zuid deneniyor, sonra id.
//   * `zoho_users.raw.Employment_No` = PDKS sicili. (Yüksel Ballıca: Zoho
//     Employment_No 39190, PDKS sicil 39190.) 281 Zoho kullanıcısının 158'inde
//     dolu, bunların 147'si PDKS'te mevcut.
//   * `employee_code` sicil DEĞİL (aynı kişi için "219" yazıyor) — kullanılmıyor.
//
// KAPSAM KARŞILAŞTIRMASI: 184 satış personelinin 146'sı Employment_No ile,
// yalnızca 89'u isimle bulunabiliyor. Bu yüzden kimlik yolu isimden önce gelir;
// isim yalnızca geri düşüş. Ayrıca canlı veride adı "Unknown"/"Email Test" olup
// user_id'si doğru olan kayıtlar var — isme öncelik verilse bunlar kaybolurdu.
import { textNorm } from "../engine/textNorm";

/** Eşleşmenin hangi yolla bulunduğu — arayüzde güven düzeyini göstermek için. */
export type KimlikYolu = "zuid" | "zoho_id" | "eposta" | "isim";

export interface ZohoKimlik {
  id: string;
  zuid: string | null;
  /** raw.Employment_No — PDKS sicili. */
  employmentNo: string | null;
  eposta: string | null;
  /** original_agent_name varsa o, yoksa full_name. */
  ad: string;
}

export interface KimlikIndeksi {
  zuidIle: Map<string, ZohoKimlik>;
  idIle: Map<string, ZohoKimlik>;
  epostaIle: Map<string, ZohoKimlik>;
  /** Normalize edilmiş ad -> sicil (PDKS personelinden). */
  isimIle: Map<string, string>;
  /** Geçerli sicil kümesi — Employment_No'nun PDKS'te var olduğunu doğrulamak için. */
  gecerliSicil: Set<string>;
}

export interface PersonelOzet {
  sicil: string;
  ad: string;
  soyad: string;
}

export function buildKimlikIndeksi(
  zoho: ZohoKimlik[],
  personel: PersonelOzet[]
): KimlikIndeksi {
  const zuidIle = new Map<string, ZohoKimlik>();
  const idIle = new Map<string, ZohoKimlik>();
  const epostaIle = new Map<string, ZohoKimlik>();

  for (const z of zoho) {
    if (z.zuid) zuidIle.set(String(z.zuid).trim(), z);
    if (z.id) idIle.set(String(z.id).trim(), z);
    const e = (z.eposta ?? "").trim().toLowerCase();
    if (e) epostaIle.set(e, z);
  }

  const isimIle = new Map<string, string>();
  const gecerliSicil = new Set<string>();
  for (const p of personel) {
    gecerliSicil.add(p.sicil);
    const k = textNorm(`${p.ad} ${p.soyad}`);
    // İlk kayıt kazanır: aynı isimde iki kişi varsa hangisi olduğu belirsizdir,
    // ikinci kaydı yazmak sessizce yanlış kişiye veri bağlamak olurdu.
    if (k && !isimIle.has(k)) isimIle.set(k, p.sicil);
  }

  return { zuidIle, idIle, epostaIle, isimIle, gecerliSicil };
}

export interface TrackerKimlikGirdi {
  userId: string | null;
  userName: string | null;
  email: string | null;
}

export interface KimlikSonuc {
  sicil: string;
  yol: KimlikYolu;
}

/** Zoho kaydından sicile geçiş — Employment_No PDKS'te gerçekten varsa geçerli. */
function sicilden(z: ZohoKimlik | undefined, ix: KimlikIndeksi): string | null {
  const emp = (z?.employmentNo ?? "").trim();
  if (emp && ix.gecerliSicil.has(emp)) return emp;
  // Employment_No yoksa/PDKS'te bulunmuyorsa Zoho'daki isimle bir kez daha dene.
  if (z?.ad) {
    const s = ix.isimIle.get(textNorm(z.ad));
    if (s) return s;
  }
  return null;
}

/**
 * Bir tracker kaydını sicile bağlar. Sıra kasıtlı: en güvenilir kimlik en başta.
 * Bulunamazsa null döner — yanlış kişiye mola yazmak, hiç yazmamaktan kötü.
 */
export function kimlikCoz(
  e: TrackerKimlikGirdi,
  ix: KimlikIndeksi
): KimlikSonuc | null {
  const uid = (e.userId ?? "").trim();

  if (uid) {
    const zuidHit = sicilden(ix.zuidIle.get(uid), ix);
    if (zuidHit) return { sicil: zuidHit, yol: "zuid" };

    const idHit = sicilden(ix.idIle.get(uid), ix);
    if (idHit) return { sicil: idHit, yol: "zoho_id" };
  }

  const eposta = (e.email ?? "").trim().toLowerCase();
  if (eposta) {
    const hit = sicilden(ix.epostaIle.get(eposta), ix);
    if (hit) return { sicil: hit, yol: "eposta" };
  }

  const ad = textNorm(e.userName ?? "");
  if (ad) {
    const s = ix.isimIle.get(ad);
    if (s) return { sicil: s, yol: "isim" };
  }

  return null;
}
