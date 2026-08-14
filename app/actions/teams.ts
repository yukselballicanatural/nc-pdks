"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { invalidateAll } from "@/lib/data/periodCache";
import {
  clearMemberOverride,
  createTeam,
  deleteTeam,
  renameTeam,
  setMemberOverride,
  setTeamLeader,
  syncTeamsFromZoho,
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

/** Zoho'daki takım rollerini teams tablosuna yansıtır. */
export async function syncTeamsAction(): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    const r = await syncTeamsFromZoho();
    refresh();
    return {
      ok: true,
      mesaj: `${r.eklendi} takım eklendi, ${r.guncellendi} takım güncellendi${
        r.pasif > 0 ? `, ${r.pasif} takım pasife alındı` : ""
      }.`,
    };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

/** Kişiyi başka takıma taşır. teamId null ise hiçbir takımda olmaz. */
export async function moveMemberAction(zohoUserId: string, teamId: string | null): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    await setMemberOverride(zohoUserId, teamId, null, admin);
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : "Bilinmeyen hata" };
  }
}

/** Elle atamayı kaldırır — kişi Zoho'daki rolünün takımına geri döner. */
export async function resetMemberAction(zohoUserId: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    await clearMemberOverride(zohoUserId);
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

export async function setLeaderAction(id: string, liderZohoId: string | null): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, hata: "Bu işlem için yönetici yetkisi gerekli." };
  try {
    await setTeamLeader(id, liderZohoId);
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
