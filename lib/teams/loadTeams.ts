// Takım görünümünün tek giriş noktası.
//
// Üç kaynağı birleştirir:
//   1. teams tablosu          -> takım tanımı (ad, lider, aktiflik)
//   2. zoho_users.role        -> ÜYELİK, her okumada canlı türetilir
//   3. team_member_overrides  -> admin'in elle yaptığı taşımalar (türetilene üstün)
//
// Üyelik tabloya yazılmadığı için Zoho'da bir kişi takım değiştirdiğinde burası
// kendiliğinden güncellenir; admin düzenlemeleri de override olarak korunur.
//
// Ayrıca her Zoho kişisi PDKS sicil numarasıyla eşleştirilir (Employment_No,
// yoksa normalize isim — bkz. lib/matching/textMatch.ts) ki takım ekranında
// PDKS'teki çalışma verisi gösterilebilsin.
import "server-only";
import { cache } from "react";
import { fetchOverrides, fetchTeams, type TeamRow } from "../db/queries/teams";
import { fetchZohoUsers, type ZohoUserView } from "../db/queries/zohoUsers";
import { fetchPersonnel, type PersonInfo } from "../db/queries/materialized";
import { buildZohoMatchIndex, matchZohoUser } from "../matching/textMatch";
import { isLeaderRole } from "./derive";

export interface TeamMember {
  zohoId: string;
  /** Şirket içinde kullanılan takma ad (Zoho full_name). */
  takmaAd: string;
  /** Gerçek ad — PDKS ile eşleşen alan. */
  gercekAd: string;
  role: string;
  region: string;
  /** PDKS sicil numarası; eşleşmediyse null. */
  sicil: string | null;
  eslesme: "employment_no" | "name" | null;
  /** PDKS'te satış kapsamında mı? (kapsam dışı kişiler PDKS hesabına girmiyor) */
  pdksVar: boolean;
  /** Elle atandıysa true — Zoho'daki rolünden bağımsız. */
  elleAtandi: boolean;
  /** Elle atanmışsa Zoho'nun söylediği takım (bilgi amaçlı). */
  zohoTakim: string | null;
}

export interface TeamView {
  id: string;
  ad: string;
  sourceRole: string | null;
  aktif: boolean;
  /** Zoho türevi mi, admin'in açtığı mı? */
  otomatik: boolean;
  lider: TeamMember | null;
  liderRole: string | null;
  uyeler: TeamMember[];
}

export interface TeamsData {
  teams: TeamView[];
  /** Hiçbir takıma girmeyen aktif Zoho kişileri (Finance, IT, üst yönetim vb.). */
  takimsiz: TeamMember[];
  /** Takım tanımı hiç yok — migration çalıştırıldı ama eşitleme yapılmadı. */
  bosMu: boolean;
  toplamUye: number;
  /** PDKS'te karşılığı bulunamayan üye sayısı. */
  eslesmeyen: number;
}

function buildMember(
  u: ZohoUserView,
  sicilByZoho: Map<string, { sicil: string; eslesme: "employment_no" | "name" }>,
  personByS: Map<string, PersonInfo>,
  override: { teamId: string | null } | undefined,
  zohoTakimAdi: string | null
): TeamMember {
  const m = sicilByZoho.get(u.id);
  return {
    zohoId: u.id,
    takmaAd: u.fullName,
    gercekAd: u.originalAgentName,
    role: u.role,
    region: u.region,
    sicil: m?.sicil ?? null,
    eslesme: m?.eslesme ?? null,
    pdksVar: m ? personByS.has(m.sicil) : false,
    elleAtandi: override !== undefined,
    zohoTakim: zohoTakimAdi,
  };
}

export const loadTeamsData = cache(async function loadTeamsData(): Promise<TeamsData> {
  const [teams, overrides, zoho, personByS] = await Promise.all([
    fetchTeams(),
    fetchOverrides(),
    fetchZohoUsers(),
    fetchPersonnel(),
  ]);

  // Zoho kişisi -> PDKS sicil. Eşleşme yönü PDKS'ten Zoho'ya kurulu olduğu için
  // (matchZohoUser sicil alır) tersine çevirmek üzere PDKS listesini geziyoruz.
  const index = buildZohoMatchIndex(zoho.raw);
  const sicilByZoho = new Map<string, { sicil: string; eslesme: "employment_no" | "name" }>();
  for (const p of personByS.values()) {
    const hit = matchZohoUser(p.sicil, p.ad, p.soyad, index);
    if (hit && !sicilByZoho.has(hit.zohoId)) {
      sicilByZoho.set(hit.zohoId, { sicil: p.sicil, eslesme: hit.matchedBy });
    }
  }

  const overrideByZoho = new Map(overrides.map((o) => [o.zohoUserId, o]));
  const teamBySourceRole = new Map<string, TeamRow>();
  for (const t of teams) if (t.sourceRole) teamBySourceRole.set(t.sourceRole, t);

  const aktifZoho = zoho.rows.filter((u) => u.status === "active");

  /** Kişinin Zoho'dan türeyen takımı (override uygulanmadan önce). */
  const derivedTeamOf = (u: ZohoUserView): TeamRow | undefined =>
    u.role ? teamBySourceRole.get(u.role) : undefined;

  // Nihai yerleşim: override varsa o, yoksa türetilmiş takım.
  const membersByTeam = new Map<string, TeamMember[]>();
  const takimsiz: TeamMember[] = [];
  const liderZohoIds = new Set(teams.map((t) => t.liderZohoId).filter(Boolean) as string[]);

  for (const u of aktifZoho) {
    const derived = derivedTeamOf(u);
    const ov = overrideByZoho.get(u.id);
    const member = buildMember(u, sicilByZoho, personByS, ov, derived?.ad ?? null);

    // Lider, üye listesinde tekrar görünmesin.
    if (liderZohoIds.has(u.id) && !ov) continue;

    const hedefId = ov ? ov.teamId : (derived?.id ?? null);
    if (!hedefId) {
      // Takıma girmeyenler: takım dışı birimler + override ile çıkarılanlar.
      // Lider rolündeki yöneticileri "takımsız" diye listelemek yanıltıcı olur.
      if (!isLeaderRole(u.role)) takimsiz.push(member);
      continue;
    }
    const list = membersByTeam.get(hedefId) ?? [];
    list.push(member);
    membersByTeam.set(hedefId, list);
  }

  const byName = (a: TeamMember, b: TeamMember) =>
    (a.takmaAd || a.gercekAd).localeCompare(b.takmaAd || b.gercekAd, "tr");

  const zohoById = new Map(zoho.rows.map((u) => [u.id, u]));

  const views: TeamView[] = teams.map((t) => {
    const liderUser = t.liderZohoId ? zohoById.get(t.liderZohoId) : undefined;
    return {
      id: t.id,
      ad: t.ad,
      sourceRole: t.sourceRole,
      aktif: t.aktif,
      otomatik: t.sourceRole !== null,
      liderRole: t.liderRole,
      lider: liderUser
        ? buildMember(liderUser, sicilByZoho, personByS, undefined, null)
        : null,
      uyeler: (membersByTeam.get(t.id) ?? []).sort(byName),
    };
  });

  const toplamUye = views.reduce((n, t) => n + t.uyeler.length, 0);
  const eslesmeyen = views.reduce((n, t) => n + t.uyeler.filter((u) => !u.sicil).length, 0);

  return {
    teams: views,
    takimsiz: takimsiz.sort(byName),
    bosMu: teams.length === 0,
    toplamUye,
    eslesmeyen,
  };
});
