import "server-only";
import { supabaseServer } from "../supabaseServer";
import { deriveTeams, type KolayRoleRow, type ZohoRoleRow } from "../../teams/derive";
import { SALES_POZISYON } from "../../engine/scope";
import { fetchKolayPersonsCache } from "./kolayPersons";

export interface TeamRow {
  id: string;
  ad: string;
  kolayDepartman: string | null;
  sourceRole: string | null;
  liderZohoId: string | null;
  liderRole: string | null;
  liderKolayId: string | null;
  aktif: boolean;
  sira: number;
}

interface TeamDbRow {
  id: string;
  ad: string;
  kolay_departman: string | null;
  source_role: string | null;
  lider_zoho_id: string | null;
  lider_role: string | null;
  lider_kolay_id: string | null;
  aktif: boolean;
  sira: number;
}

/** Anahtar PDKS sicili — iki kaynakta da aynı kişiye işaret eden tek kimlik. */
export interface OverrideRow {
  sicil: string;
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
    kolayDepartman: r.kolay_departman,
    sourceRole: r.source_role,
    liderZohoId: r.lider_zoho_id,
    liderRole: r.lider_role,
    liderKolayId: r.lider_kolay_id,
    aktif: r.aktif,
    sira: r.sira,
  };
}

export async function fetchTeams(): Promise<TeamRow[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("teams")
    .select("id, ad, kolay_departman, source_role, lider_zoho_id, lider_role, lider_kolay_id, aktif, sira")
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
    .select("sicil, team_id, not_text");
  if (error) {
    if (isMissingTable(error.message)) return [];
    throw new Error(`team_member_overrides okunamadı: ${error.message}`);
  }
  return (
    (data ?? []) as unknown as { sicil: string; team_id: string | null; not_text: string | null }[]
  ).map((r) => ({ sicil: r.sicil, teamId: r.team_id, not: r.not_text }));
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
export interface SyncTeamsResult {
  eklendi: number;
  guncellendi: number;
  pasif: number;
  kolayKisi: number;
}

/**
 * İK kaynaklarındaki takım yapısını `teams` tablosuna yansıtır.
 *
 * Bu, kullanıcının istediği "kaynak güncellendikçe burası da güncellensin"
 * davranışının takım TANIMI tarafı: yeni bir departman/rol açılırsa burada yeni
 * satır oluşur, lider değişirse lider alanları güncellenir. ÜYELİK zaten her
 * okumada canlı çözülüyor (bkz. lib/teams/loadTeams.ts), tabloya yazılmıyor.
 *
 * Admin'in elle açtığı takımlara (iki kaynak anahtarı da null) dokunmaz.
 * Kaynaktan kaybolan bir takımı SİLMEZ, aktif = false yapar — override'lar ve
 * verdiğiniz isim kaybolmasın.
 *
 * Not: Kolay verisi kolay_persons önbelleğinden okunur; önbellek boşsa (Kolay
 * eşitlemesi hiç yapılmamışsa) takımlar yalnızca Zoho'dan türetilir.
 */
export async function syncTeams(): Promise<SyncTeamsResult> {
  const sb = supabaseServer();

  const [{ data: zohoData, error: zErr }, kolayCache] = await Promise.all([
    sb.from("zoho_users").select("id, role, status"),
    fetchKolayPersonsCache(),
  ]);
  if (zErr) throw new Error(`zoho_users okunamadı: ${zErr.message}`);

  const kolayRows: KolayRoleRow[] = kolayCache.map((p) => ({
    kolayId: p.kolayId,
    tamAd: p.tamAd,
    bolum: p.bolum,
    departman: p.departman,
    managerKolayId: p.managerKolayId,
    durum: p.durum,
  }));

  const derived = deriveTeams(
    (zohoData ?? []) as unknown as ZohoRoleRow[],
    kolayRows,
    SALES_POZISYON
  );

  const existing = await fetchTeams();
  const byKolay = new Map(
    existing.filter((t) => t.kolayDepartman).map((t) => [t.kolayDepartman as string, t])
  );
  const byRole = new Map(existing.filter((t) => t.sourceRole).map((t) => [t.sourceRole as string, t]));

  let eklendi = 0;
  let guncellendi = 0;
  const now = new Date().toISOString();
  const gorulen = new Set<string>();

  for (const [i, d] of derived.entries()) {
    const cur =
      (d.kolayDepartman ? byKolay.get(d.kolayDepartman) : undefined) ??
      (d.sourceRole ? byRole.get(d.sourceRole) : undefined);

    if (!cur) {
      const { error } = await sb.from("teams").insert({
        ad: d.ad,
        kolay_departman: d.kolayDepartman,
        source_role: d.sourceRole,
        lider_zoho_id: d.liderZohoId,
        lider_role: d.liderRole,
        lider_kolay_id: d.liderKolayId,
        aktif: true,
        sira: i,
        updated_at: now,
      });
      // Ad çakışması (admin aynı adı elle vermiş olabilir) yüzünden tek satır
      // eklenemezse tüm eşitlemeyi düşürmüyoruz.
      if (error && !/duplicate key|unique/i.test(error.message)) {
        throw new Error(`takım eklenemedi (${d.ad}): ${error.message}`);
      }
      if (!error) eklendi++;
      continue;
    }

    gorulen.add(cur.id);

    // Takım adına DOKUNMUYORUZ — admin değiştirmiş olabilir. Yalnızca kaynak
    // anahtarları, lider bilgisi ve aktiflik tazelenir.
    const degisti =
      cur.kolayDepartman !== d.kolayDepartman ||
      cur.sourceRole !== d.sourceRole ||
      cur.liderZohoId !== d.liderZohoId ||
      cur.liderRole !== d.liderRole ||
      cur.liderKolayId !== d.liderKolayId ||
      !cur.aktif;

    if (!degisti) continue;

    const { error } = await sb
      .from("teams")
      .update({
        kolay_departman: d.kolayDepartman,
        source_role: d.sourceRole,
        lider_zoho_id: d.liderZohoId,
        lider_role: d.liderRole,
        lider_kolay_id: d.liderKolayId,
        aktif: true,
        updated_at: now,
      })
      .eq("id", cur.id);
    if (error) throw new Error(`takım güncellenemedi (${cur.ad}): ${error.message}`);
    guncellendi++;
  }

  // Kaynaktan kaybolan türetilmiş takımları pasife çek.
  const kayip = existing.filter(
    (t) => (t.kolayDepartman || t.sourceRole) && t.aktif && !gorulen.has(t.id)
  );
  if (kayip.length > 0) {
    const { error } = await sb
      .from("teams")
      .update({ aktif: false, updated_at: now })
      .in(
        "id",
        kayip.map((t) => t.id)
      );
    if (error) throw new Error(`teams pasife alınamadı: ${error.message}`);
  }

  return { eklendi, guncellendi, pasif: kayip.length, kolayKisi: kolayCache.length };
}

export async function setMemberOverride(
  sicil: string,
  teamId: string | null,
  not: string | null,
  by: string
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from("team_member_overrides").upsert(
    {
      sicil,
      team_id: teamId,
      not_text: not,
      created_by: by,
      created_at: new Date().toISOString(),
    },
    { onConflict: "sicil" }
  );
  if (error) throw new Error(`takım ataması kaydedilemedi: ${error.message}`);
}

/** Override'ı siler — kişi İK kaynağından türetilen takımına geri döner. */
export async function clearMemberOverride(sicil: string): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb.from("team_member_overrides").delete().eq("sicil", sicil);
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

/** Lider ataması: kişi Zoho ve/veya Kolay kimliğiyle gelebilir. */
export async function setTeamLeader(
  id: string,
  lider: { zohoId: string | null; kolayId: string | null }
): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("teams")
    .update({
      lider_zoho_id: lider.zohoId,
      lider_kolay_id: lider.kolayId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`takım lideri atanamadı: ${error.message}`);
}

/** Yalnızca admin'in elle açtığı takımlar silinebilir (İK türevleri pasife alınır). */
export async function deleteTeam(id: string): Promise<void> {
  const sb = supabaseServer();
  const { error } = await sb
    .from("teams")
    .delete()
    .eq("id", id)
    .is("source_role", null)
    .is("kolay_departman", null);
  if (error) throw new Error(`takım silinemedi: ${error.message}`);
}
