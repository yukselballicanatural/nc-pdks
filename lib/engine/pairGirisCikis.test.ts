import { describe, expect, it } from "vitest";
import { pairGirisCikis } from "./pairGirisCikis";

// Duvar saati sözleşmesi: Date.UTC ile kuruluyor (bkz. lib/engine/tz.ts).
function d(hms: string): Date {
  const [h, m, s] = hms.split(":").map(Number);
  return new Date(Date.UTC(2026, 0, 1, h, m, s ?? 0));
}

describe("pairGirisCikis (ARCHITECTURE.md §3 kuralı)", () => {
  it("basit giriş-çıkış çiftini eşleştirir", () => {
    const pairs = pairGirisCikis([
      { dt: d("08:00"), in: true },
      { dt: d("17:00"), in: false },
    ]);
    expect(pairs).toEqual([[d("08:00"), d("17:00")]]);
  });

  it("açık giriş varken yeni giriş gelirse yok sayılır (ilk giriş esas alınır)", () => {
    const pairs = pairGirisCikis([
      { dt: d("08:00"), in: true },
      { dt: d("08:05"), in: true }, // yok sayılır
      { dt: d("17:00"), in: false },
    ]);
    expect(pairs).toEqual([[d("08:00"), d("17:00")]]);
  });

  it("bekleyen giriş yokken çıkış gelirse yok sayılır", () => {
    const pairs = pairGirisCikis([
      { dt: d("09:00"), in: false }, // eşleşmeyen çıkış, yok sayılır
      { dt: d("10:00"), in: true },
      { dt: d("18:00"), in: false },
    ]);
    expect(pairs).toEqual([[d("10:00"), d("18:00")]]);
  });

  it("çıkış girişten önce/eşit ise (delta<=0) çift eklenmez", () => {
    const pairs = pairGirisCikis([
      { dt: d("10:00"), in: true },
      { dt: d("10:00"), in: false },
    ]);
    expect(pairs).toEqual([]);
  });

  it("art arda birden fazla tam çift doğru eşleşir", () => {
    const pairs = pairGirisCikis([
      { dt: d("08:00"), in: true },
      { dt: d("12:00"), in: false },
      { dt: d("13:00"), in: true },
      { dt: d("17:00"), in: false },
    ]);
    expect(pairs).toEqual([
      [d("08:00"), d("12:00")],
      [d("13:00"), d("17:00")],
    ]);
  });
});
