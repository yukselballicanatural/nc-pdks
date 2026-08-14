// Kaynak: pdks_app_stabil_v8_4.py satır 110-141 (text_norm, reader_is_turnike,
// reader_direction, reader_gate). Birebir port — davranış değiştirilmemiştir.

const TR_MAP: Record<string, string> = {
  ı: "i",
  İ: "I",
  ğ: "g",
  Ğ: "G",
  ü: "u",
  Ü: "U",
  ş: "s",
  Ş: "S",
  ö: "o",
  Ö: "O",
  ç: "c",
  Ç: "C",
};

/** Türkçe karakter, noktalı İ, fazla boşluk vb. sorunları normalize eder. */
export function textNorm(s: unknown): string {
  if (s === null || s === undefined) return "";
  let str = String(s).trim();
  // NFKD normalize + combining mark'ları at (unicodedata.normalize("NFKD", s) + combining strip)
  str = str.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  str = str.replace(/[ıİğĞüÜşŞöÖçÇ]/g, (ch) => TR_MAP[ch] ?? ch);
  str = str.replace(/\s+/g, " ");
  return str.toUpperCase().trim();
}

export function sortSicilKey(s: unknown): [number, number | string] {
  const str = String(s);
  return /^\d+$/.test(str) ? [0, parseInt(str, 10)] : [1, textNorm(str)];
}

// Okuyucu adları küçük ve sabit bir kümedir (bu kurulumda 27 farklı ad), ama bu üç
// fonksiyon on binlerce olay için çağrılıyor ve her çağrı textNorm (NFKD normalize +
// regex) yapıyor. Ada göre memoize ediyoruz — aynı girdi aynı sonucu verdiği için
// davranış değişmez, sadece tekrarlı iş ortadan kalkar.
const turnikeCache = new Map<string, boolean>();
const dirCache = new Map<string, Direction>();
const gateCache = new Map<string, string>();

export type Direction = "in" | "out" | "";

export function readerIsTurnike(okuyucu: unknown): boolean {
  const key = String(okuyucu ?? "");
  const hit = turnikeCache.get(key);
  if (hit !== undefined) return hit;
  const val = textNorm(key).includes("TURNIKE");
  turnikeCache.set(key, val);
  return val;
}

export function readerDirection(okuyucu: unknown): Direction {
  const key = String(okuyucu ?? "");
  const hit = dirCache.get(key);
  if (hit !== undefined) return hit;
  const n = textNorm(key);
  let val: Direction = "";
  if (["GIRIS", "GIR", " IN "].some((x) => n.includes(x))) val = "in";
  else if (["CIKIS", "CIK", " OUT "].some((x) => n.includes(x))) val = "out";
  dirCache.set(key, val);
  return val;
}

export function readerGate(okuyucu: unknown): string {
  const key = String(okuyucu ?? "");
  const hit = gateCache.get(key);
  if (hit !== undefined) return hit;
  const m = textNorm(key).match(/\b([1234])\b/);
  const val = m ? m[1] : "";
  gateCache.set(key, val);
  return val;
}
