import { describe, expect, it } from "vitest";
import { deriveTeams, isLeaderRole, isTeamRole, matchLeaderRole } from "./derive";

describe("rol sınıflandırma", () => {
  it("takım rollerini tanır", () => {
    expect(isTeamRole("Ali Omer Team")).toBe(true);
    expect(isTeamRole("Ramadan Team - Morocco")).toBe(true);
    expect(isTeamRole("VIP Team")).toBe(true);
    expect(isTeamRole("Team 2 Consultants")).toBe(true);
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

describe("lider ↔ takım eşleştirme", () => {
  const liderler = [
    "Team Leader - Joel",
    "Team Leader-Ahmed Anwar",
    "Team Leader - Abdelatif Ramadan",
    "Team Leader - Selma",
    "Team Leader - Ahmad Ghazal",
    "Team Leader-Arij Mahjoubi",
    "Sales Master - Amin Connor West",
    "Regional Manager Morocco - Yassin",
  ];

  it("adı üzerinden doğru lideri bulur", () => {
    expect(matchLeaderRole("Joel Team", liderler)).toBe("Team Leader - Joel");
    expect(matchLeaderRole("Ahmed Anwar Team", liderler)).toBe("Team Leader-Ahmed Anwar");
    expect(matchLeaderRole("Ghazal Team", liderler)).toBe("Team Leader - Ahmad Ghazal");
    expect(matchLeaderRole("Arij  Team", liderler)).toBe("Team Leader-Arij Mahjoubi");
    expect(matchLeaderRole("SM Amin Connor - Team", liderler)).toBe("Sales Master - Amin Connor West");
  });

  it("Morocco takımlarını birbirine karıştırmaz", () => {
    // "Morocco" ayırt etmeyen kelime; Ramadan yalnızca kendi liderine eşleşmeli.
    expect(matchLeaderRole("Ramadan Team - Morocco", liderler)).toBe("Team Leader - Abdelatif Ramadan");
    expect(matchLeaderRole("Selma Team - Morocco", liderler)).toBe("Team Leader - Selma");
  });

  it("lideri çıkarılamayan takım için null döner", () => {
    expect(matchLeaderRole("Team 1", liderler)).toBeNull();
    expect(matchLeaderRole("VIP Team", liderler)).toBeNull();
  });
});

describe("deriveTeams", () => {
  const rows = [
    { id: "l1", role: "Team Leader - Joel", status: "active" },
    { id: "u1", role: "Joel Team", status: "active" },
    { id: "u2", role: "Joel Team", status: "active" },
    { id: "u3", role: "Joel Team", status: "inactive" }, // ayrılmış
    { id: "u4", role: "Ghazal Team", status: "active" },
    { id: "x1", role: "Finance", status: "active" },
  ];

  it("takımları üye sayısına göre sıralar ve lideri bağlar", () => {
    const teams = deriveTeams(rows);
    expect(teams.map((t) => t.sourceRole)).toEqual(["Joel Team", "Ghazal Team"]);
    expect(teams[0].liderZohoId).toBe("l1");
    expect(teams[0].liderRole).toBe("Team Leader - Joel");
  });

  it("ayrılmış kişiyi üye saymaz", () => {
    const joel = deriveTeams(rows)[0];
    expect(joel.uyeZohoIds).toEqual(["u1", "u2"]);
  });

  it("lideri takımın üyesi olarak listelemez", () => {
    const joel = deriveTeams(rows)[0];
    expect(joel.uyeZohoIds).not.toContain("l1");
  });

  it("takım dışı birimlerden takım üretmez", () => {
    expect(deriveTeams(rows).some((t) => t.sourceRole === "Finance")).toBe(false);
  });
});
