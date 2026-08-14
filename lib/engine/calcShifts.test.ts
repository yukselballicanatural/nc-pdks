import { describe, expect, it } from "vitest";
import { calcShifts, shiftKey } from "./calcShifts";
import { ReaderConfig } from "./readerConfig";
import type { PdksRawEvent } from "./types";

// Duvar saati sözleşmesi: tüm Date'ler Date.UTC ile kurulur (bkz. lib/engine/tz.ts).
function dt(y: number, mo: number, d: number, h: number, mi = 0, s = 0): Date {
  return new Date(Date.UTC(y, mo, d, h, mi, s));
}

function rec(sicil: string, when: Date, ok: string, idx: number): PdksRawEvent {
  return { sicil, ad: "", soyad: "", dt: when, ok, firma: "", sube: "", dept: "", dir: "", idx };
}

describe("calcShifts (ARCHITECTURE.md §2/§3 kuralları)", () => {
  it("gündüz vardiyasında basit giriş/çıkış net süreyi hesaplar", () => {
    const raw = [
      rec("1", dt(2026, 0, 5, 8, 0), "TURNIKE 1 GIRIS", 0),
      rec("1", dt(2026, 0, 5, 17, 30), "TURNIKE 1 CIKIS", 1),
    ];
    const shifts = calcShifts(raw, new ReaderConfig(), () => false);
    expect(shifts.get(shiftKey("1", "05.01.2026"))?.net).toBe(9 * 60 + 30);
  });

  it("gece vardiyasında saat 12:00'den önceki kayıtlar bir önceki günün vardiyasına sayılır", () => {
    const raw = [
      rec("2", dt(2026, 0, 5, 22, 0), "TURNIKE 1 GIRIS", 0), // 5 Ocak gecesi giriş
      rec("2", dt(2026, 0, 6, 6, 0), "TURNIKE 1 CIKIS", 1), // 6 Ocak 06:00 (<12) -> 5 Ocak vardiyası
    ];
    const shifts = calcShifts(raw, new ReaderConfig(), () => true);
    expect(shifts.get(shiftKey("2", "05.01.2026"))?.net).toBe(8 * 60);
    expect(shifts.get(shiftKey("2", "06.01.2026"))).toBeUndefined();
  });

  it("gece vardiyasında 12:00'den SONRAKİ kayıt kendi gününe sayılır", () => {
    const raw = [
      rec("2b", dt(2026, 0, 6, 13, 0), "TURNIKE 1 GIRIS", 0),
      rec("2b", dt(2026, 0, 6, 20, 0), "TURNIKE 1 CIKIS", 1),
    ];
    const shifts = calcShifts(raw, new ReaderConfig(), () => true);
    expect(shifts.get(shiftKey("2b", "06.01.2026"))?.net).toBe(7 * 60);
  });

  it("aynı yön/aynı turnike 60 sn içindeki tekrar kayıt tekilleştirilir", () => {
    const raw = [
      rec("3", dt(2026, 0, 5, 8, 0, 0), "TURNIKE 1 GIRIS", 0),
      rec("3", dt(2026, 0, 5, 8, 0, 30), "TURNIKE 1 GIRIS", 1), // 30sn sonra tekrar -> yok sayılır
      rec("3", dt(2026, 0, 5, 17, 0, 0), "TURNIKE 1 CIKIS", 2),
    ];
    const shifts = calcShifts(raw, new ReaderConfig(), () => false);
    const sh = shifts.get(shiftKey("3", "05.01.2026"));
    expect(sh?.net).toBe(9 * 60);
    expect(sh?.cnt).toBe(3); // ham kayıt sayısı değişmez
  });

  it("ignore okuyucular hesaplamaya hiç katılmaz", () => {
    const raw = [
      rec("4", dt(2026, 0, 5, 8, 0), "TURNIKE 1 GIRIS", 0),
      rec("4", dt(2026, 0, 5, 12, 0), "KANTIN GIRIS", 1),
      rec("4", dt(2026, 0, 5, 17, 0), "TURNIKE 1 CIKIS", 2),
    ];
    const rc = new ReaderConfig();
    rc.setArea("KANTIN GIRIS", "ignore");
    const shifts = calcShifts(raw, rc, () => false);
    expect(shifts.get(shiftKey("4", "05.01.2026"))?.cnt).toBe(2);
  });

  it("mola = brüt - net (turnike dışına çıkılan süre)", () => {
    const raw = [
      rec("5", dt(2026, 0, 5, 9, 0), "TURNIKE 1 GIRIS", 0),
      rec("5", dt(2026, 0, 5, 12, 0), "TURNIKE 1 CIKIS", 1),
      rec("5", dt(2026, 0, 5, 13, 0), "TURNIKE 1 GIRIS", 2),
      rec("5", dt(2026, 0, 5, 18, 0), "TURNIKE 1 CIKIS", 3),
    ];
    const sh = calcShifts(raw, new ReaderConfig(), () => false).get(shiftKey("5", "05.01.2026"));
    expect(sh?.net).toBe(8 * 60); // 3sa + 5sa
    expect(sh?.brut).toBe(9 * 60); // 09:00 -> 18:00
    expect(sh?.mola).toBe(60); // 12:00 -> 13:00
  });
});
