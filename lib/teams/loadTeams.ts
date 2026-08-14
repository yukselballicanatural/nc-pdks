// Takım görünümünün tek giriş noktası.
//
// KİŞİ MERKEZİ: PDKS sicili esas alınır. Her satış personeli için sırayla
//   1. team_member_overrides  -> admin elle taşımışsa o (en yüksek öncelik)
//   2. Kolay İK "Departman"    -> İK'nın resmî kaydı
//   3. Zoho `role`             -> Kolay'da olmayanlar için (Fas ekipleri vb.)
// bakılır. Üyelik hiçbir yere yazılmaz, her okumada canlı çözülür — böylece
// biri Kolay veya Zoho'da takım değiştirdiğinde burası kendiliğinden güncellenir.
//
// Neden sicil anahtar: kişi iki sistemde iki farklı kimlikle duruyor. Sicil,
// PDKS'in gerçek çalışma verisinin de anahtarı olduğu için tek ortak kimlik.
import "server-only";
import { cache } from "react";
import { fetchOverrides, fetchTeams, type TeamRow } from "../db/queries/teams";
import { fetchKolayPersonsCache, type KolayPersonRow } from "../db/queries/kolayPersons";
import { fetchZohoUsers } from "../db/queries/zohoUsers";
import { fetchPersonnel, type PersonInfo } from "../db/queries/materialized";
import { buildZohoMatchIndex, matchZohoUser } from "../matching/textMatch";
import { buildKolayIndex, matchKolayPerson, type KolayMatchKind } from "../kolay/match";
import type { KolayPerson } from "../kolay/client";

/** Üyenin hangi kaynaktan yerleştirildiği — arayüzde şeffaflık için. */
export type UyelikKaynagi = "elle" | "kolay" | "zoho" | "yok";

export interface TeamMember {
  /** PDKS sicili — bu görünümün anahtarı. */
  sicil: string;
  adSoyad: string;
  /** Şirket içinde kullanılan takma ad (Zoho full_name). */
  takmaAd: string | null;
  unvan: string;
  kaynak: UyelikKaynagi;
  /** Kolay'daki karşılığı bulundu mu, hangi güvenle? */
  kolayEslesme: KolayMatchKind | null;
  zohoVar: boolean;
  /** Kolay/Zoho'nun söylediği takım — elle atanmışsa farkı görebilmek için. */
  otomatikTakim: string | null;
}

export interface TeamView {
  id: string;
  ad: string;
  kolayDepartman: string | null;
  sourceRole: string | null;
  aktif: boolean;
  /** İK kaynağından mı türedi, admin mi açtı? */
  otomatik: boolean;
  /** Hangi kaynaklar bu takımı besliyor. */
  kaynaklar: ("kolay" | "zoho")[];
  liderAd: string | null;
  liderSicil: string | null;
  uyeler: TeamMember[];
}

export interface TeamsData {
  teams: TeamView[];
  /** Hiçbir takıma yerleşemeyen satış personeli. */
  takimsiz: TeamMember[];
  /** Takım tanımı hiç yok — SQL çalıştırıldı ama eşitleme yapılmadı. */
  bosMu: boolean;
  /** Kolay önbelleği boş mu — "Kolay ile Eşitle" gerekiyor. */
  kolayBosMu: boolean;
  kolaySyncedAt: string | null;
  toplamUye: number;
  kolaysiz: number;
  zohosuz: number;
}

export const loadTeamsData = cache(async function loadTeamsData(): Promise<TeamsData> {
  const [teams, overrides, zoho, kolayCache, personByS] = await Promise.all([
    fetchTeams(),
    fetchOverrides(),
    fetchZohoUsers(),
    fetchKolayPersonsCache(),
    fetchPersonnel(),
  ]);

  /* ── kişi eşleştirme indeksleri ── */

  const zohoIndex = buildZohoMatchIndex(zoho.raw);
  const zohoById = new Map(zoho.rows.map((u) => [u.id, u]));

  // Kolay önbelleği KolayPerson biçimine indirgenip mevcut isim eşleştiricisine
  // veriliyor (Kolay'da sicil alanı yok, eşleştirme isimle yapılmak zorunda).
  const kolayAsPeople: KolayPerson[] = kolayCache.map((p) => ({
    id: p.kolayId,
    firstName: p.ad,
    lastName: p.soyad,
  }));
  const kolayIndex = buildKolayIndex(kolayAsPeople);
  const kolayById = new Map<string, KolayPersonRow>(kolayCache.map((p) => [p.kolayId, p]));

  /* ── takım arama tabloları ── */

  const teamByKolayDep = new Map<string, TeamRow>();
  const teamByZohoRole = new Map<string, TeamRow>();
  for (const t of teams) {
    if (t.kolayDepartman) teamByKolayDep.set(t.kolayDepartman, t);
    if (t.sourceRole) teamByZohoRole.set(t.sourceRole, t);
  }
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const overrideBySicil = new Map(overrides.map((o) => [o.sicil, o]));

  /* ── her satış personelini yerleştir ── */

  const membersByTeam = new Map<string, TeamMember[]>();
  const takimsiz: TeamMember[] = [];
  let kolaysiz = 0;
  let zohosuz = 0;
  // Lider sicili: takım id -> sicil (üye listesinden çıkarılır).
  const liderSicilByTeam = new Map<string, string>();
  const liderAdByTeam = new Map<string, string>();

  for (const p of personByS.values()) {
    const adSoyad = `${p.ad} ${p.soyad}`.trim() || p.sicil;

    const kolayHit = matchKolayPerson(p.ad, p.soyad, kolayIndex);
    const kolayRow = kolayHit ? kolayById.get(kolayHit.person.id) : undefined;
    const zohoHit = matchZohoUser(p.sicil, p.ad, p.soyad, zohoIndex);
    const zohoRow = zohoHit ? zohoById.get(zohoHit.zohoId) : undefined;

    if (!kolayRow) kolaysiz++;
    if (!zohoRow) zohosuz++;

    // Otomatik yerleşim: Kolay önce, sonra Zoho.
    const kolayTeam = kolayRow?.departman ? teamByKolayDep.get(kolayRow.departman) : undefined;
    const zohoTeam = zohoRow?.role ? teamByZohoRole.get(zohoRow.role) : undefined;
    const otomatik = kolayTeam ?? zohoTeam;

    const ov = overrideBySicil.get(p.sicil);
    const hedef = ov ? (ov.teamId ? teamById.get(ov.teamId) : undefined) : otomatik;

    const member: TeamMember = {
      sicil: p.sicil,
      adSoyad,
      takmaAd: zohoRow?.fullName || null,
      unvan: p.unvan || kolayRow?.unvan || "",
      kaynak: ov ? "elle" : kolayTeam ? "kolay" : zohoTeam ? "zoho" : "yok",
      kolayEslesme: kolayHit?.kind ?? null,
      zohoVar: Boolean(zohoRow),
      otomatikTakim: otomatik?.ad ?? null,
    };

    // Bu kişi takımın lideri mi? (Kolay yönetici id'si veya Zoho lider kaydı)
    if (hedef) {
      if (
        (hedef.liderKolayId && kolayRow?.kolayId === hedef.liderKolayId) ||
        (hedef.liderZohoId && zohoRow?.id === hedef.liderZohoId)
      ) {
        liderSicilByTeam.set(hedef.id, p.sicil);
        liderAdByTeam.set(hedef.id, adSoyad);
        continue; // lider üye listesinde tekrar görünmesin
      }
    }

    if (!hedef) {
      takimsiz.push(member);
      continue;
    }
    const list = membersByTeam.get(hedef.id) ?? [];
    list.push(member);
    membersByTeam.set(hedef.id, list);
  }

  /* ── lider adı: PDKS'te olmayan liderler için kaynaktan ── */

  function liderAdiOf(t: TeamRow): string | null {
    const hit = liderAdByTeam.get(t.id);
    if (hit) return hit;
    if (t.liderKolayId) {
      const k = kolayById.get(t.liderKolayId);
      if (k?.tamAd) return k.tamAd;
    }
    if (t.liderZohoId) {
      const z = zohoById.get(t.liderZohoId);
      if (z) return z.fullName || z.originalAgentName || null;
    }
    return null;
  }

  const byName = (a: TeamMember, b: TeamMember) => a.adSoyad.localeCompare(b.adSoyad, "tr");

  const views: TeamView[] = teams.map((t) => {
    const kaynaklar: ("kolay" | "zoho")[] = [];
    if (t.kolayDepartman) kaynaklar.push("kolay");
    if (t.sourceRole) kaynaklar.push("zoho");
    return {
      id: t.id,
      ad: t.ad,
      kolayDepartman: t.kolayDepartman,
      sourceRole: t.sourceRole,
      aktif: t.aktif,
      otomatik: kaynaklar.length > 0,
      kaynaklar,
      liderAd: liderAdiOf(t),
      liderSicil: liderSicilByTeam.get(t.id) ?? null,
      uyeler: (membersByTeam.get(t.id) ?? []).sort(byName),
    };
  });

  const toplamUye = views.reduce((n, t) => n + t.uyeler.length, 0);

  return {
    teams: views,
    takimsiz: takimsiz.sort(byName),
    bosMu: teams.length === 0,
    kolayBosMu: kolayCache.length === 0,
    kolaySyncedAt: kolayCache[0]?.syncedAt ?? null,
    toplamUye,
    kolaysiz,
    zohosuz,
  };
});
