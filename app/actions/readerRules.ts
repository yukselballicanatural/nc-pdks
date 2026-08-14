"use server";

import { revalidatePath } from "next/cache";
import { invalidateAll } from "@/lib/data/periodCache";
import { getSession } from "@/lib/auth/session";
import { resetReaderArea, setReaderArea } from "@/lib/db/queries/readerRules";
import type { ReaderArea } from "@/lib/engine/types";

export async function setReaderAreaAction(
  readerName: string,
  area: ReaderArea | "default"
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await getSession();
    if (!session) throw new Error("Oturum bulunamadı.");
    if (session.role !== "admin") throw new Error("Kapı ayarlarını sadece yönetici değiştirebilir.");

    if (area === "default") await resetReaderArea(readerName);
    else await setReaderArea(readerName, area);

    invalidateAll();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}
