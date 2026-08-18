// Tracker olay akışını aralıklara çevirme.
//
// Gelen veri olay akışı (checkin / break_start / break_stop / checkout); bize ise
// "şu saatler arasında klinikteydi" gibi ARALIKLAR gerekiyor, çünkü turnike
// verisindeki boşluklarla ancak aralık kesiştirerek karşılaştırabiliyoruz.
//
// SAAT SÖZLEŞMESİ: `occurred_at` gerçek UTC. Buradan üretilen tüm Date'ler
// projenin sözleşmesine uyar — UTC alanları İstanbul duvar saatini taşır
// (bkz. lib/engine/tz.ts). Aksi hâlde turnike aralıklarıyla kesişim 3 saat kayardı.
import { utcIsoToWallClock } from "../engine/tz";
import type { TrackerEventRow } from "../db/queries/timeTracker";

/**
 * Ara türü kodları ve Türkçe karşılıkları.
 *
 * "launch" tracker uygulamasının yazımı; kastedilen "lunch" (yemek). Kaynaktaki
 * kodu olduğu gibi anahtar olarak kullanıyoruz — veriyi düzeltmek bizim işimiz
 * değil — ama ekranda "Yemek" gösteriyoruz.
 */
export const ARA_ETIKETLERI: Record<string, string> = {
  break: "Mola",
  clinic: "Klinik",
  meeting: "Toplantı",
  launch: "Yemek",
};

export function araEtiketi(kod: string | null, ad: string | null): string {
  const k = (kod ?? "").trim().toLowerCase();
  if (k && ARA_ETIKETLERI[k]) return ARA_ETIKETLERI[k];
  // Bilinmeyen yeni bir tür eklenirse kaybetmeyelim: kaynaktaki adı göster.
  return (ad ?? "").trim() || (k ? k : "Ara");
}

export interface TrackerAralik {
  /** Ara türü kodu (break/clinic/meeting/launch) — mesai aralığında null. */
  kod: string | null;
  etiket: string;
  bas: Date;
  /** null = kapanmamış (break_stop/checkout gelmemiş). */
  bit: Date | null;
  /** Kaynaktaki elapsed_seconds'tan gelen süre (varsa) — dakika. */
  bildirilenDk: number | null;
}

export interface TrackerKisiGun {
  /** Kendi bildirdiği mola/klinik/toplantı/yemek aralıkları. */
  aralar: TrackerAralik[];
  /** checkin -> checkout aralıkları. */
  mesai: TrackerAralik[];
  /** Kapanmamış kayıt sayısı — arayüzde "eksik veri" uyarısı için. */
  kapanmamis: number;
}

function dakika(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

/**
 * Tek kişinin olaylarını aralıklara çevirir. Olaylar zaman sırasında olmalı.
 *
 * Kenar durumlar (canlı veride hepsi görüldü):
 *   - break_start'tan sonra break_stop gelmemiş  -> aralık açık bırakılır (bit=null)
 *   - checkin'den sonra checkout gelmemiş        -> mesai açık bırakılır
 *   - üst üste iki break_start                   -> ilki kapatılmadan ikincisi açılır;
 *     ilki açık kalır, çünkü ne zaman bittiğini uydurmak veri üretmek olur
 *   - eşleşmeyen break_stop                      -> yok sayılır (uyduracak başlangıç yok)
 */
export function olaylardanAraliklar(olaylar: TrackerEventRow[]): TrackerKisiGun {
  const aralar: TrackerAralik[] = [];
  const mesai: TrackerAralik[] = [];

  let acikAra: TrackerAralik | null = null;
  let acikMesai: TrackerAralik | null = null;

  for (const o of olaylar) {
    const t = utcIsoToWallClock(o.occurredAt);
    const tur = o.eventType.trim().toLowerCase();

    if (tur === "checkin") {
      // Önceki mesai kapanmadıysa açık bırakılır; iki ayrı gün olabilir.
      if (acikMesai) mesai.push(acikMesai);
      acikMesai = { kod: null, etiket: "Mesai", bas: t, bit: null, bildirilenDk: null };
      continue;
    }

    if (tur === "checkout") {
      if (acikMesai) {
        acikMesai.bit = t;
        mesai.push(acikMesai);
        acikMesai = null;
      }
      // Çıkış yaptıysa açık kalan ara da bitmiş sayılır.
      if (acikAra) {
        acikAra.bit = t;
        aralar.push(acikAra);
        acikAra = null;
      }
      continue;
    }

    if (tur === "break_start") {
      if (acikAra) aralar.push(acikAra); // kapanmamış olarak kalır
      acikAra = {
        kod: (o.breakId ?? "").trim().toLowerCase() || null,
        etiket: araEtiketi(o.breakId, o.breakName),
        bas: t,
        bit: null,
        bildirilenDk: null,
      };
      continue;
    }

    if (tur === "break_stop") {
      if (!acikAra) continue;
      acikAra.bit = t;
      // elapsed_seconds kaynağın kendi saydığı süre; varsa onu da taşıyoruz.
      if (o.elapsedSeconds != null && o.elapsedSeconds > 0) {
        acikAra.bildirilenDk = Math.round(o.elapsedSeconds / 60);
      }
      aralar.push(acikAra);
      acikAra = null;
    }
  }

  if (acikAra) aralar.push(acikAra);
  if (acikMesai) mesai.push(acikMesai);

  const kapanmamis =
    aralar.filter((a) => a.bit === null).length + mesai.filter((m) => m.bit === null).length;

  return { aralar, mesai, kapanmamis };
}

/** İki aralığın çakışan dakikası (kapanmamış aralıklar 0 sayılır). */
export function cakismaDk(
  aBas: Date,
  aBit: Date,
  bBas: Date,
  bBit: Date | null
): number {
  if (!bBit) return 0;
  const bas = Math.max(aBas.getTime(), bBas.getTime());
  const bit = Math.min(aBit.getTime(), bBit.getTime());
  return bit > bas ? Math.round((bit - bas) / 60000) : 0;
}

export interface AciklananAralik {
  etiket: string;
  dk: number;
}

/**
 * Turnike dışı bir aralığın içinde tracker ne diyor?
 * Aynı türden birden fazla parça varsa dakikaları toplanır; büyükten küçüğe sıralı.
 */
export function araligiAcikla(
  bas: Date,
  bit: Date,
  aralar: TrackerAralik[]
): AciklananAralik[] {
  const toplam = new Map<string, number>();
  for (const a of aralar) {
    const dk = cakismaDk(bas, bit, a.bas, a.bit);
    if (dk <= 0) continue;
    toplam.set(a.etiket, (toplam.get(a.etiket) ?? 0) + dk);
  }
  return [...toplam.entries()]
    .map(([etiket, dk]) => ({ etiket, dk }))
    .sort((x, y) => y.dk - x.dk);
}

export { dakika as trackerDakika };
