"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { deleteCorrection, upsertCorrection } from "@/lib/db/queries/corrections";

/** TL modu düzenleme yapamaz (Python: Config.mode == "tl" ise salt-okunur). */
async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Oturum bulunamadı.");
  if (session.role !== "admin") throw new Error("Bu işlem için yönetici yetkisi gerekli.");
  return session;
}

export async function saveCorrectionAction(input: {
  sicil: string;
  tarih: string;
  adSoyad: string;
  neden: string;
  origMin: number;
  yeniSaat: number;
  yeniDakika: number;
  acik: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const yeniMin = Math.max(0, Math.round(input.yeniSaat * 60 + input.yeniDakika));
    await upsertCorrection({
      sicil: input.sicil,
      tarih: input.tarih,
      adSoyad: input.adSoyad,
      neden: input.neden,
      origMin: input.origMin,
      yeniMin,
      acik: input.acik,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

export async function deleteCorrectionAction(
  sicil: string,
  tarih: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await deleteCorrection(sicil, tarih);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}
