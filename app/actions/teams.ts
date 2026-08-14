"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { invalidateAll } from "@/lib/data/periodCache";
import { syncKolayPersons } from "@/lib/kolay/sync";
import { resolveIdentity } from "@/lib/teams/identity";
import {
  clearMemberOverride,
  createTeam,
  deleteTeam,
  renameTeam,
  setMemberOverride,
  setTeamLeader,
  syncTeams,
} from "@/lib/db/queries/teams";

type Result = { ok: true; mesaj?: string } | { ok: false; hata: string };

/** Takım düzenlemesi yalnızca yöneticiye açık (kullanıcı kararı). */
async function requireAdmin(): Promise<string | null> {
  const s = await getSession();
  if (s?.role !== "admin") return null;
  return s.username;
}

function refresh() {
  invalidateAll();
  revalidatePath("/", "layout");
}

/** İK kaynaklarındaki (Kolay + Zoho) takım yapısını teams tablosuna yansıtır. */
export async function syncTeamsAction(): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    const r = await syncTeams();
    refresh();
    const notlar = [
      `${r.eklendi} takım eklendi`,
      `${r.guncellendi} takım güncellendi`,
      ...(r.pasif > 0 ? [`${r.pasif} takım pasife alındı`] : []),
      ...(r.kolayKisi === 0
        ? ["Kolay önbelleği boş — önce \"Kolay İK ile Eşitle\" çalıştırın"]
        : []),
    ];
    return { ok: true, mesaj: notlar.join(", ") + "." };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

/** Kolay İK'daki personel + birim bilgisini önbelleğe çeker, sonra takımları eşitler. */
export async function syncKolayAction(): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    const k = await syncKolayPersons();
    const t = await syncTeams();
    refresh();
    return {
      ok: true,
      mesaj:
        `Kolay İK: ${k.toplam} çalışan alındı (${k.satis} satış, ${k.departmanSayisi} departman). ` +
        `Takımlar: ${t.eklendi} eklendi, ${t.guncellendi} güncellendi.`,
    };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

/** Kişiyi başka takıma taşır. teamId null ise hiçbir takımda olmaz. */
export async function moveMemberAction(sicil: string, teamId: string | null): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    await setMemberOverride(sicil, teamId, null, admin);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

/** Elle atamayı kaldırır — kişi İK kaynağındaki takımına geri döner. */
export async function resetMemberAction(sicil: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    await clearMemberOverride(sicil);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

export async function createTeamAction(ad: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  const temiz = ad.trim();
  if (temiz.length < 2) return { ok: false, hata: "Takım adı en az 2 karakter olmalı." };
  try {
    await createTeam(temiz, 999);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

export async function renameTeamAction(id: string, ad: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  const temiz = ad.trim();
  if (temiz.length < 2) return { ok: false, hata: "Takım adı en az 2 karakter olmalı." };
  try {
    await renameTeam(id, temiz);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

/** Lider, PDKS sicili ile atanır; kaynak kimlikleri burada çözülür. */
export async function setLeaderAction(id: string, sicil: string | null): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    const lider = sicil
      ? await resolveIdentity(sicil)
      : { zohoId: null, kolayId: null };
    if (sicil && !lider.zohoId && !lider.kolayId) {
      return {
        ok: false,
        hata: "Bu kişinin Kolay/Zoho karşılığı bulunamadı, lider olarak atanamıyor.",
      };
    }
    await setTeamLeader(id, lider);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

/** Yalnızca elle açılmış takımlar silinir; Zoho türevleri silinmez. */
export async function deleteTeamAction(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    await deleteTeam(id);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}
