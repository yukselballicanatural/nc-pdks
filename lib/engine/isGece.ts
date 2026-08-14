// Kaynak: pdks_app_stabil_v8_4.py satır 395-401 (Database.is_gece). Birebir port.
import { textNorm } from "./textNorm";
import type { Personnel } from "./types";

/**
 * Bir kullanıcının gece vardiyasında olup olmadığını belirler:
 * 1. `vardiya` alanı "gece"/"gunduz" ise doğrudan onu kullan.
 * 2. Yoksa, kullanıcının Takım Lideri adı `geceTl` listesindeki bir isimle
 *    TAM eşleşiyorsa (normalize edilmiş metin, ==) gece sayılır.
 *    (Substring/"içeriyor mu" kontrolü DEĞİL — 2026-07-16'da tam eşleşmeye
 *    düzeltildi, bkz. ARCHITECTURE.md.)
 */
export function isGece(user: Pick<Personnel, "vardiya" | "takim_lideri"> | null | undefined, geceTl: string[]): boolean {
  if (!user) return false;
  if (user.vardiya === "gece") return true;
  if (user.vardiya === "gunduz") return false;
  const tl = textNorm(user.takim_lideri ?? "");
  return geceTl.some((gl) => textNorm(gl) === tl);
}
