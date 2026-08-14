// Takım yapısının zoho_users.role alanından türetilmesi.
//
// Zoho'da takım bilgisi ayrı bir alan değil, `role` metninin içinde duruyor:
//   üyeler  -> "Ali Omer Team", "Ramadan Team - Morocco", "VIP Team"
//   liderler-> "Team Leader - Ali Omer", "Team Leader- Abdulkader Touma"
// Yani lider kendi takımının rolünde DEĞİL, ayrı bir rolde. Bu yüzden lideri
// takımına bağlamak için isim üzerinden eşleştirme gerekiyor.
//
// Buradaki fonksiyonlar saf — veritabanına dokunmaz, test edilebilir.

/** Ad karşılaştırması için sadeleştirme (Türkçe + Arapça harf çeşitleri dahil). */
export function normRole(s: string): string {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/İ/g, "i")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "s")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "g")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "u")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "o")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "c")
    .replace(/ç/g, "c")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lider/yönetici rolü mü? Bu roldeki kişiler takımın ÜYESİ olarak değil, LİDERİ
 * olarak görünür. "VIP - Team leader" gibi biçimler de yakalanmalı.
 */
export function isLeaderRole(role: string): boolean {
  return /team\s*leader|leader\s*-|sales\s*master|regional\s*manager|region\s+istanbul|supervisor|translators\s*manager/i.test(
    role
  );
}

/** Takım rolü mü? "team" içeren ama lider rolü olmayanlar. */
export function isTeamRole(role: string): boolean {
  return /team/i.test(role) && !isLeaderRole(role);
}

/**
 * Lider adı ile takım adı arasındaki ortak kelimeler. "Team", "Morocco" gibi
 * ayırt etmeyen kelimeler atılır — yoksa bütün Morocco takımları birbirine
 * eşleşir.
 */
const STOP = new Set([
  "team", "leader", "sales", "master", "regional", "manager", "region",
  "istanbul", "morocco", "supervisor", "translators", "vip", "consultants",
  "sm", "west", "the", "and",
]);

function tokens(s: string): string[] {
  return normRole(s)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * Bir takım rolüne en uygun lider rolünü bulur (ortak kelime sayısı en yüksek).
 * Hiç ortak kelime yoksa null — "Team 1", "VIP Team" gibi takımların lideri
 * Zoho'dan çıkarılamaz, admin elle atar.
 */
export function matchLeaderRole(teamRole: string, leaderRoles: string[]): string | null {
  const tt = tokens(teamRole);
  if (tt.length === 0) return null;

  let best: string | null = null;
  let bestScore = 0;
  for (const lr of leaderRoles) {
    const lt = tokens(lr);
    const score = lt.filter((t) => tt.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = lr;
    }
  }
  return bestScore > 0 ? best : null;
}

export interface ZohoRoleRow {
  id: string;
  role: string | null;
  status: string | null;
}

export interface DerivedTeam {
  sourceRole: string;
  ad: string;
  liderRole: string | null;
  liderZohoId: string | null;
  uyeZohoIds: string[];
}

/**
 * Zoho kayıtlarından takım listesini türetir. Yalnızca aktif kişiler üye sayılır;
 * ayrılmış kişiler takımda görünmemeli.
 */
export function deriveTeams(rows: ZohoRoleRow[]): DerivedTeam[] {
  const aktif = rows.filter((r) => (r.status ?? "") === "active" && r.role);
  const roles = [...new Set(aktif.map((r) => r.role as string))];
  const teamRoles = roles.filter(isTeamRole);
  const leaderRoles = roles.filter(isLeaderRole);

  return teamRoles
    .map((tr) => {
      const liderRole = matchLeaderRole(tr, leaderRoles);
      const lider = liderRole ? aktif.find((r) => r.role === liderRole) : undefined;
      return {
        sourceRole: tr,
        ad: tr.replace(/\s+/g, " ").trim(),
        liderRole,
        liderZohoId: lider?.id ?? null,
        uyeZohoIds: aktif.filter((r) => r.role === tr).map((r) => r.id),
      };
    })
    .sort((a, b) => b.uyeZohoIds.length - a.uyeZohoIds.length || a.ad.localeCompare(b.ad, "tr"));
}
