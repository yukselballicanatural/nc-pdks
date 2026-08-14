// Takım yapısının İK kaynaklarından türetilmesi.
//
// İKİ KAYNAK, İKİSİ DE EKSİK:
//
//  Kolay İK — kişinin "Departman" birimi takımı veriyor ("ÇAĞRI MERKEZİ - ALİ
//    ÖMER") ve `managerId` gerçek yönetici bağını kuruyor. İK'nın resmî kaydı
//    olduğu için daha güvenilir, ama pratikte yalnızca İstanbul kadrosunu
//    kapsıyor.
//
//  Zoho — takım bilgisi `role` metninde: üyeler "Ali Omer Team", liderler ise
//    "Team Leader - Ali Omer" gibi AYRI bir rolde (yani lider kendi takımının
//    rolünde değil). Fas takımlarını da içeriyor.
//
// Ölçüm (2026-08-14): PDKS'teki 184 satış personelinden Kolay 136'sını, Zoho
// 135'ini, ikisi birlikte 159'unu kapsıyor. Bu yüzden takımlar iki kaynağın
// BİRLEŞİMİ olarak kuruluyor; aynı takımı gösteren kayıtlar lider adı üzerinden
// eşleştirilip tek takıma bağlanıyor.
//
// Buradaki fonksiyonlar saf — veritabanına dokunmaz, test edilebilir.

/** Ad karşılaştırması için sadeleştirme. */
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
 * Lider/yönetici rolü mü? Bu roldeki kişiler takımın ÜYESİ değil LİDERİ olarak
 * görünür. "VIP - Team leader" gibi ters biçimler de yakalanmalı.
 */
export function isLeaderRole(role: string): boolean {
  return /team\s*leader|leader\s*-|sales\s*master|regional\s*manager|region\s+istanbul|supervisor|translators\s*manager/i.test(
    role
  );
}

/** Zoho takım rolü mü? "team" içeren ama lider rolü olmayanlar. */
export function isTeamRole(role: string): boolean {
  return /team/i.test(role) && !isLeaderRole(role);
}

/**
 * Ayırt etmeyen kelimeler. Bunlar atılmazsa "ÇAĞRI MERKEZİ - X" ile
 * "ÇAĞRI MERKEZİ - Y" birbirine, bütün Morocco takımları da birbirine eşleşir.
 */
const STOP = new Set([
  "team", "leader", "sales", "master", "regional", "manager", "region",
  "istanbul", "morocco", "supervisor", "translators", "vip", "consultants",
  "sm", "west", "the", "and",
  // Kolay departman adlarındaki ortak önek/ekler
  "cagri", "merkezi", "takim", "lideri", "satis", "kalite", "care", "after",
  "yonetim", "raporlama", "gelistirme",
]);

function tokens(s: string): string[] {
  return normRole(s)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/** İki takım adının ortak ayırt edici kelime sayısı. */
export function nameOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  return ta.filter((t) => tb.includes(t)).length;
}

/**
 * Bir takım adına en uygun adayı bulur (ortak kelime sayısı en yüksek olan).
 * Hiç ortak kelime yoksa null.
 */
export function bestMatch(hedef: string, adaylar: string[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const a of adaylar) {
    const s = nameOverlap(hedef, a);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return bestScore > 0 ? best : null;
}

/** Geriye dönük ad — Zoho lider rolünü takım rolüne bağlar. */
export function matchLeaderRole(teamRole: string, leaderRoles: string[]): string | null {
  return bestMatch(teamRole, leaderRoles);
}

export interface ZohoRoleRow {
  id: string;
  role: string | null;
  status: string | null;
}

export interface KolayRoleRow {
  kolayId: string;
  tamAd: string;
  bolum: string | null;
  departman: string | null;
  managerKolayId: string | null;
  durum: string;
}

export interface DerivedTeam {
  /** Görünen ad — Kolay departmanı varsa o, yoksa Zoho rolü. */
  ad: string;
  kolayDepartman: string | null;
  sourceRole: string | null;
  liderRole: string | null;
  liderZohoId: string | null;
  liderKolayId: string | null;
  /** Yalnızca büyüklük sıralaması için — üyelik canlı çözülür. */
  tahminiUye: number;
}

/**
 * Kolay departmanları + Zoho takım rolleri → tek takım listesi.
 *
 * @param kolayBolum yalnızca bu Bölüm'deki Kolay kayıtları dikkate alınır
 *   (PDKS kapsamı satış olduğu için "SATIŞ DİREKTÖRLÜĞÜ"); null ise hepsi.
 */
export function deriveTeams(
  zoho: ZohoRoleRow[],
  kolay: KolayRoleRow[],
  kolayBolum: string | null
): DerivedTeam[] {
  /* ── Zoho tarafı ── */
  const zAktif = zoho.filter((r) => (r.status ?? "") === "active" && r.role);
  const zRoles = [...new Set(zAktif.map((r) => r.role as string))];
  const zTeamRoles = zRoles.filter(isTeamRole);
  const zLeaderRoles = zRoles.filter(isLeaderRole);
  const zCount = new Map<string, number>();
  for (const r of zAktif) {
    if (r.role && isTeamRole(r.role)) zCount.set(r.role, (zCount.get(r.role) ?? 0) + 1);
  }

  /* ── Kolay tarafı ── */
  const kAktif = kolay.filter(
    (p) => p.durum === "active" && p.departman && (kolayBolum === null || p.bolum === kolayBolum)
  );
  const kByDep = new Map<string, KolayRoleRow[]>();
  for (const p of kAktif) {
    const list = kByDep.get(p.departman as string) ?? [];
    list.push(p);
    kByDep.set(p.departman as string, list);
  }
  const kolayAdById = new Map(kolay.map((p) => [p.kolayId, p.tamAd]));

  /** Departmanın en sık görülen yöneticisi. */
  function baskinYonetici(uyeler: KolayRoleRow[]): string | null {
    const say = new Map<string, number>();
    for (const u of uyeler) {
      if (u.managerKolayId) say.set(u.managerKolayId, (say.get(u.managerKolayId) ?? 0) + 1);
    }
    let best: string | null = null;
    let bs = 0;
    for (const [id, n] of say) {
      if (n > bs) {
        bs = n;
        best = id;
      }
    }
    return best;
  }

  const teams: DerivedTeam[] = [];
  const kullanilanZoho = new Set<string>();

  // Kolay departmanları ana omurga (İK'nın resmî kaydı).
  for (const [dep, uyeler] of kByDep) {
    const liderKolayId = baskinYonetici(uyeler);
    // Eşleştirmede departman adının yanına yönetici adını da katıyoruz:
    // "ÇAĞRI MERKEZİ-AHMED GHAZAL" ↔ "Ghazal Team" bağlantısı böyle kuruluyor.
    const ipucu = `${dep} ${liderKolayId ? (kolayAdById.get(liderKolayId) ?? "") : ""}`;
    const zEs = bestMatch(
      ipucu,
      zTeamRoles.filter((z) => !kullanilanZoho.has(z))
    );
    if (zEs) kullanilanZoho.add(zEs);

    const liderRole = zEs ? matchLeaderRole(zEs, zLeaderRoles) : null;
    const liderZoho = liderRole ? zAktif.find((r) => r.role === liderRole) : undefined;

    teams.push({
      ad: dep,
      kolayDepartman: dep,
      sourceRole: zEs,
      liderRole,
      liderZohoId: liderZoho?.id ?? null,
      liderKolayId,
      tahminiUye: uyeler.length + (zEs ? (zCount.get(zEs) ?? 0) : 0),
    });
  }

  // Kolay'da karşılığı olmayan Zoho takımları (Fas ekipleri vb.).
  for (const z of zTeamRoles) {
    if (kullanilanZoho.has(z)) continue;
    const liderRole = matchLeaderRole(z, zLeaderRoles);
    const liderZoho = liderRole ? zAktif.find((r) => r.role === liderRole) : undefined;
    teams.push({
      ad: z.replace(/\s+/g, " ").trim(),
      kolayDepartman: null,
      sourceRole: z,
      liderRole,
      liderZohoId: liderZoho?.id ?? null,
      liderKolayId: null,
      tahminiUye: zCount.get(z) ?? 0,
    });
  }

  return teams.sort((a, b) => b.tahminiUye - a.tahminiUye || a.ad.localeCompare(b.ad, "tr"));
}
