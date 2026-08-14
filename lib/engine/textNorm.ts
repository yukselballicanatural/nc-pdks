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

export function readerIsTurnike(okuyucu: unknown): boolean {
  return textNorm(okuyucu).includes("TURNIKE");
}

export type Direction = "in" | "out" | "";

export function readerDirection(okuyucu: unknown): Direction {
  const n = textNorm(okuyucu);
  if (["GIRIS", "GIR", " IN "].some((x) => n.includes(x))) return "in";
  if (["CIKIS", "CIK", " OUT "].some((x) => n.includes(x))) return "out";
  return "";
}

export function readerGate(okuyucu: unknown): string {
  const n = textNorm(okuyucu);
  const m = n.match(/\b([1234])\b/);
  return m ? m[1] : "";
}
