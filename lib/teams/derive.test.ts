import { describe, expect, it } from "vitest";
import {
  bestMatch,
  deriveTeams,
  isLeaderRole,
  isTeamRole,
  matchLeaderRole,
  nameOverlap,
  type KolayRoleRow,
  type ZohoRoleRow,
} from "./derive";

describe("rol sınıflandırma", () => {
  it("takım rollerini tanır", () => {
    for (const r of ["Ali Omer Team", "Ramadan Team - Morocco", "VIP Team", "Team 2 Consultants"]) {
      expect(isTeamRole(r), r).toBe(true);
    }
  });

  it("lider rollerini takım rolü saymaz", () => {
    for (const r of [
      "Team Leader - Joel",
      "Team Leader-Ahmed Anwar",
      "Team Leader- Abdulkader Touma",
      "VIP - Team leader",
      "Sales Master - Amin Connor West",
    ]) {
      expect(isLeaderRole(r), r).toBe(true);
      expect(isTeamRole(r), r).toBe(false);
    }
  });

  it("takım dışı birimleri hiçbirine sokmaz", () => {
    for (const r of ["Finance", "Data Entry", "Executive Board - CEO", "Digital Marketing"]) {
      expect(isTeamRole(r), r).toBe(false);
      expect(isLeaderRole(r), r).toBe(false);
    }
  });
});

describe("ad örtüşmesi", () => {
  it("ayırt etmeyen kelimeleri saymaz", () => {
    // İkisi de "Team" ve "Morocco" içeriyor ama farklı takımlar.
    expect(nameOverlap("Selma Team - Morocco", "Sara Team - Morocco")).toBe(0);
    // Kolay departmanlarının ortak öneki de ayırt etmemeli.
    expect(nameOverlap("ÇAĞRI MERKEZİ - ALİ ÖMER", "ÇAĞRI MERKEZİ - ELİF KOÇ")).toBe(0);
  });

  it("gerçek ortak adı yakalar", () => {
    expect(nameOverlap("ÇAĞRI MERKEZİ-AHMED GHAZAL", "Ghazal Team")).toBeGreaterThan(0);
  });

  it("aday yoksa null döner", () => {
    expect(bestMatch("Team 1", ["Joel Team", "Ghazal Team"])).toBeNull();
  });
});

describe("Zoho lider ↔ takım eşleştirme", () => {
  const liderler = [
    "Team Leader - Joel",
    "Team Leader-Ahmed Anwar",
    "Team Leader - Abdelatif Ramadan",
    "Team Leader - Selma",
    "Team Leader - Ahmad Ghazal",
    "Sales Master - Amin Connor West",
  ];

  it("adı üzerinden doğru lideri bulur", () => {
    expect(matchLeaderRole("Joel Team", liderler)).toBe("Team Leader - Joel");
    expect(matchLeaderRole("Ahmed Anwar Team", liderler)).toBe("Team Leader-Ahmed Anwar");
    expect(matchLeaderRole("Ghazal Team", liderler)).toBe("Team Leader - Ahmad Ghazal");
    expect(matchLeaderRole("SM Amin Connor - Team", liderler)).toBe("Sales Master - Amin Connor West");
  });

  it("Morocco takımlarını birbirine karıştırmaz", () => {
    expect(matchLeaderRole("Ramadan Team - Morocco", liderler)).toBe("Team Leader - Abdelatif Ramadan");
    expect(matchLeaderRole("Selma Team - Morocco", liderler)).toBe("Team Leader - Selma");
  });

  it("lideri çıkarılamayan takım için null döner", () => {
    expect(matchLeaderRole("Team 1", liderler)).toBeNull();
  });
});

describe("deriveTeams — iki kaynaklı", () => {
  const zoho: ZohoRoleRow[] = [
    { id: "zl-ghazal", role: "Team Leader - Ahmad Ghazal", status: "active" },
    { id: "z1", role: "Ghazal Team", status: "active" },
    { id: "z2", role: "Ghazal Team", status: "active" },
    { id: "z3", role: "Ghazal Team", status: "inactive" }, // ayrılmış
    // Kolay'da karşılığı olmayan Fas takımı
    { id: "zl-selma", role: "Team Leader - Selma", status: "active" },
    { id: "z4", role: "Selma Team - Morocco", status: "active" },
    { id: "zx", role: "Finance", status: "active" },
  ];

  const kolay: KolayRoleRow[] = [
    {
      kolayId: "k-ghazal",
      tamAd: "AHMAD GHAZAL",
      bolum: "SATIŞ DİREKTÖRLÜĞÜ",
      departman: "ÇAĞRI MERKEZİ-AHMED GHAZAL",
      managerKolayId: null,
      durum: "active",
    },
    {
      kolayId: "k1",
      tamAd: "BİRİ",
      bolum: "SATIŞ DİREKTÖRLÜĞÜ",
      departman: "ÇAĞRI MERKEZİ-AHMED GHAZAL",
      managerKolayId: "k-ghazal",
      durum: "active",
    },
    {
      kolayId: "k2",
      tamAd: "BAŞKASI",
      bolum: "SATIŞ DİREKTÖRLÜĞÜ",
      departman: "ÇAĞRI MERKEZİ-AHMED GHAZAL",
      managerKolayId: "k-ghazal",
      durum: "active",
    },
    // Kapsam dışı bölüm — takım üretmemeli
    {
      kolayId: "k9",
      tamAd: "PAZARLAMACI",
      bolum: "PAZARLAMA",
      departman: "PAZARLAMA EKİBİ",
      managerKolayId: null,
      durum: "active",
    },
  ];

  const teams = deriveTeams(zoho, kolay, "SATIŞ DİREKTÖRLÜĞÜ");

  it("Kolay departmanını Zoho takımıyla tek takımda birleştirir", () => {
    const g = teams.find((t) => t.kolayDepartman === "ÇAĞRI MERKEZİ-AHMED GHAZAL");
    expect(g).toBeDefined();
    expect(g?.sourceRole).toBe("Ghazal Team");
    expect(g?.liderRole).toBe("Team Leader - Ahmad Ghazal");
    expect(g?.liderZohoId).toBe("zl-ghazal");
    expect(g?.liderKolayId).toBe("k-ghazal");
  });

  it("Kolay'da olmayan Zoho takımını ayrı takım olarak korur", () => {
    const s = teams.find((t) => t.sourceRole === "Selma Team - Morocco");
    expect(s).toBeDefined();
    expect(s?.kolayDepartman).toBeNull();
    expect(s?.liderZohoId).toBe("zl-selma");
  });

  it("kapsam dışı Bölüm'den takım üretmez", () => {
    expect(teams.some((t) => t.kolayDepartman === "PAZARLAMA EKİBİ")).toBe(false);
  });

  it("takım dışı birimlerden takım üretmez", () => {
    expect(teams.some((t) => t.sourceRole === "Finance")).toBe(false);
  });

  it("aynı Zoho takımını iki Kolay departmanına bağlamaz", () => {
    const kullanilan = teams.map((t) => t.sourceRole).filter(Boolean);
    expect(new Set(kullanilan).size).toBe(kullanilan.length);
  });

  it("büyük takımı öne alır", () => {
    expect(teams[0].kolayDepartman).toBe("ÇAĞRI MERKEZİ-AHMED GHAZAL");
  });
});
