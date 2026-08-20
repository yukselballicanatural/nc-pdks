import { describe, expect, it } from "vitest";
import { gunOrani, tamGunResmiTatil, yarimGunResmiTatil, zorunluCumartesi } from "./mesaiGunu";

const d = (y: number, m: number, gun: number) => new Date(Date.UTC(y, m - 1, gun));

describe("tamGunResmiTatil / yarimGunResmiTatil (2026)", () => {
  it("millî bayramlar tam gün tatildir", () => {
    expect(tamGunResmiTatil(d(2026, 1, 1))).toBe(true); // Yılbaşı
    expect(tamGunResmiTatil(d(2026, 4, 23))).toBe(true);
    expect(tamGunResmiTatil(d(2026, 7, 15))).toBe(true);
    expect(tamGunResmiTatil(d(2026, 10, 29))).toBe(true);
  });

  it("Ramazan Bayramı (20-22 Mart) tam gün tatildir", () => {
    expect(tamGunResmiTatil(d(2026, 3, 20))).toBe(true);
    expect(tamGunResmiTatil(d(2026, 3, 21))).toBe(true);
    expect(tamGunResmiTatil(d(2026, 3, 22))).toBe(true);
  });

  it("Kurban Bayramı (27-30 Mayıs) tam gün tatildir", () => {
    expect(tamGunResmiTatil(d(2026, 5, 27))).toBe(true);
    expect(tamGunResmiTatil(d(2026, 5, 30))).toBe(true);
  });

  it("bayram arefesi tam gün DEĞİL, yarım gün tatildir", () => {
    expect(tamGunResmiTatil(d(2026, 3, 19))).toBe(false);
    expect(yarimGunResmiTatil(d(2026, 3, 19))).toBe(true);
    expect(tamGunResmiTatil(d(2026, 5, 26))).toBe(false);
    expect(yarimGunResmiTatil(d(2026, 5, 26))).toBe(true);
  });

  it("sıradan bir gün ne tam ne yarım tatildir", () => {
    expect(tamGunResmiTatil(d(2026, 8, 20))).toBe(false);
    expect(yarimGunResmiTatil(d(2026, 8, 20))).toBe(false);
  });
});

describe("gunOrani", () => {
  it("hafta içi normal gün = 1", () => {
    expect(gunOrani(d(2026, 8, 20), false)).toBe(1); // Perşembe
  });

  it("Pazar = 0, kişi TL'ye bağlı olsa da", () => {
    expect(gunOrani(d(2026, 8, 23), true)).toBe(0); // Pazar
  });

  it("zorunlu olmayan Cumartesi = 0 (uygun kişi için de)", () => {
    const serbest = d(2026, 8, 8);
    expect(zorunluCumartesi(serbest)).toBe(false);
    expect(gunOrani(serbest, true)).toBe(0);
  });

  it("zorunlu Cumartesi + uygun kişi = 1", () => {
    const zorunlu = d(2026, 8, 15);
    expect(zorunluCumartesi(zorunlu)).toBe(true);
    expect(gunOrani(zorunlu, true)).toBe(1);
  });

  it("zorunlu Cumartesi + UYGUN OLMAYAN kişi = 0", () => {
    const zorunlu = d(2026, 8, 15);
    expect(gunOrani(zorunlu, false)).toBe(0);
  });

  it("tam gün resmi tatil = 0 (hafta içi olsa da)", () => {
    expect(gunOrani(d(2026, 10, 29), true)).toBe(0); // Perşembe ama Cumhuriyet Bayramı
  });

  it("bayram arefesi = 0.5 (hafta içi olsa da)", () => {
    expect(gunOrani(d(2026, 3, 19), true)).toBe(0.5); // Perşembe ama arefe
  });

  it("resmi tatil bir Cumartesi'ye denk gelse zorunlu Cumartesi'yi de ezer", () => {
    // 30.05.2026 Cumartesi hem Kurban Bayramı'nın son günü hem de referansa
    // göre zorunlu paritede olabilir — hangisi olursa olsun tatil kazanır.
    expect(tamGunResmiTatil(d(2026, 5, 30))).toBe(true);
    expect(gunOrani(d(2026, 5, 30), true)).toBe(0);
  });
});
