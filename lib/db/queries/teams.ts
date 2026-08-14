import "server-only";
import { supabaseServer } from "../supabaseServer";
import { deriveTeams, type ZohoRoleRow } from "../../teams/derive";

export interface TeamRow {
  id: string;
  ad: string;
  sourceRole: string | null;
  liderZohoId: string | null;
  liderRole: string | null;
  aktif: boolean;
  sira: number;
}

interface TeamDbRow {
  id: string;
  ad: string;
  source_role: string | null;
  lider_zoho_id: string | null;
  lider_role: string | null;
  aktif: boolean;
  sira: number;
}

export interface OverrideRow {
  zohoUserId: string;
  teamId: string | null;
  not: string | null;
}

/**
 * Tablo henüz oluşturulmadı mı? (migration 0005 çalıştırılmamış)
 * Bu durumda hata fırlatmak yerine boş liste dönüp arayüzde yönlendirme
 * göstermek istiyoruz — kullanıcı SQL'i çalıştırmadan sayfayı açabilir.
 */
export function isMissingTable(msg: string): boolean {
  return /Could not find the table|schema cache|does not exist/i.test(msg);
}

function toTeamRow(r: TeamDbRow): TeamRow {
  return {
    id: r.id,
    ad: r.ad,
    sourceRole: r.source_role,
    liderZohoId: r.lider_zoho_id,
    liderRole: r.lider_role,
    aktif: r.aktif,
    sira: r.sira,
  };
}

export async function fetchTeams(): Promise<TeamRow[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("teams")
    .select("id, ad, source_role, lider_zoho_id, lider_role, aktif, sira")
    .order("sira", { ascending: true })
    .order("ad", { ascending: true });
  if (error) {
    if (isMissingTable(error.message)) return [];
    throw new Error(`teams okunamadı: ${error.message}`);
  }
  return ((data ?? []) as unknown as TeamDbRow[]).map(toTeamRow);
}

export async function fetchOverrides(): Promise<OverrideRow[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("team_member_overrides")
    .select("zoho_user_id, team_id, not_text");
  if (error) {
    if (isMissingTable(error.message)) return [];
    throw new Error(`team_member_overrides okunamadı: ${error.message}`);
  }
  return ((data ?? []) as unknown as { zoho_user_id: string; team_id: string | null; not_text: string | null }[]).map(
    (r) => ({ zohoUserId: r.zoho_user_id, teamId: r.team_id, not: r.not_text })
  );
}

/**
 * Zoho'daki takım rollerini `teams` tablosuna yansıtır.
 *
 * Bu, kullanıcının istediği "Supabase güncellendikçe burası da güncellensin"
 * davranışının takım TANIMI tarafı: Zoho'da yeni bir takım rolü açılırsa burada
 * yeni satır oluşur, lider değişirse lider alanı güncellenir. Üyelik zaten her
 * okumada canlı türetiliyor (bkz. buildTeamsView), tabloya yazılmıyor.
 *
 * Admin'in elle açtığı takımlara (source_role = null) dokunmaz; Zoho'dan gelen
 * bir takım rolü kaybolursa satırı silmez, aktif = false yapar — geçmiş
 * override'lar ve isim geçmişi kaybolmasın.
 */
export async function syncTeamsFromZoho(): Promise<{ eklendi: number; guncellendi: number; pasif: number }> {
  const sb = supabaseServer();

  const { data: zohoData, error: zErr } = await sb.from("zoho_users").select("id, role, status");
  if (zErr) throw new Error(`zoho_users okunamadı: ${zErr.message}`);
  const derived = deriveTeams((zohoData ?? []) as unknown as ZohoRoleRow[]);

  const existing = await fetchTeams();
  const byRole = new Map(existing.filter((t) => t.sourceRole).map((t) => [t.sourceRole as string, t]));

  let eklendi = 0;
  let guncellendi = 0;
  const upserts: Record<string, unknown>[] = [];

  for (const [i, d] of derived.entries()) {
    const cur = byRole.get(d.sourceRole);
    if (!cur) {
      eklendi++;
      upserts.push({
        ad: d.ad,
        source_role: d.sourceRole,
        lider_zoho_id: d.liderZohoId,
        lider_role: d.liderRole,
        aktif: true,
        sira: i,
        updated_at: new Date().toISOString(),
      });
      continue;
    }
    // Takım adını admin değiştirmiş olabilir — ada dokunmuyoruz, sadece lideri
    // ve aktifliği Zoho'ya göre tazeliyoruz.
    const degisti =
      cur.liderZohoId !== d.liderZohoId || cur.liderRole !== d.liderRole || !cur.aktif;
    if (degisti) {
      guncellendi++;
      upserts.push({
        id: cur.id,
        ad: cur.ad,
        source_role: d.sourceRole,
        lider_zoho_id: d.liderZohoId,
        lider_role: d.liderRole,
        aktif: true,
        sira: cur.sira,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (upserts.length > 0) {
    const { error } = await sb.from("teams").upsert(upserts, { onConflict: "source_role" });
    if (error) throw new Error(`teams yazılamadı: ${error.message}`);
  }

  // Zoho'dan kaybolan türetilmiş takımları pasife çek.
  const derivedRoles = new Set(derived.map((d) => d.sourceRole));
  const kayip = existing.filter((t) => t.sourceRole && t.aktif && !derivedRoles.has(t.sourceRole));
  if (kayip.length > 0) {
    const { error } = await sb
      .from("teams")
      .update({ aktif: false, updated_at: new Date().toISOString() })
      .in("id", kayip.map((t) => t.id));
    if (error) throw new Error(`teams pasife alınamadı: ${error.message}`);
  }

  return { eklendi, guncellendi, pasif: kayip.length };
}

export async function setMemberOverride(
  zohoUserId: string,
  teamId: string | null,
  not: string | null,
  by: string
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("team_member_overrides")
    .upsert(
      { zoho_user_id: zohoUserId, team_id: teamId, not_text: not, created_by: by, created_at: new Date().toISOString() },
      { onConflict: "zoho_user_id" }
    );
  if (error) throw new Error(`takım ataması kaydedilemedi: ${error.message}`);
}

/** Override'ı siler — kişi Zoho'dan türetilen takımına geri döner. */
export async function clearMemberOverride(zohoUserId: string): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from("team_member_overrides").delete().eq("zoho_user_id", zohoUserId);
  if (error) throw new Error(`takım ataması sıfırlanamadı: ${error.message}`);
}

export async function createTeam(ad: string, sira: number): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from("teams").insert({ ad, sira, aktif: true });
  if (error) throw new Error(`takım oluşturulamadı: ${error.message}`);
}

export async function renameTeam(id: string, ad: string): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("teams")
    .update({ ad, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`takım adı değiştirilemedi: ${error.message}`);
}

export async function setTeamLeader(id: string, liderZohoId: string | null): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("teams")
    .update({ lider_zoho_id: liderZohoId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`takım lideri atanamadı: ${error.message}`);
}

/** Yalnızca admin'in elle açtığı takımlar silinebilir (Zoho türevleri pasife alınır). */
export async function deleteTeam(id: string): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from("teams").delete().eq("id", id).is("source_role", null);
  if (error) throw new Error(`takım silinemedi: ${error.message}`);
}
